-- ============================================================
-- Complete RLS Fix: auth_uid mismatch + role assignment + policy cleanup
-- ============================================================

-- -----------------------------------------------------------
-- CRITICAL FIX: is_admin() and has_role() compare wrong column
-- -----------------------------------------------------------
-- BUG: These functions did "WHERE ur.user_id = auth.uid()"
-- But user_roles.user_id = app_users.id (auto-generated UUID),
-- while auth.uid() = auth.users.id — DIFFERENT values!
-- FIX: Join through app_users to match on auth_uid column
-- -----------------------------------------------------------

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
      JOIN app_users au ON au.id = ur.user_id
      JOIN roles r ON r.id = ur.role_id
     WHERE au.auth_uid = auth.uid()
       AND r.code IN ('ADMIN','SUPERADMIN')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION has_role(role_code TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
      JOIN app_users au ON au.id = ur.user_id
      JOIN roles r ON r.id = ur.role_id
     WHERE au.auth_uid = auth.uid()
       AND r.code = role_code
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- -----------------------------------------------------------
-- 2. Drop old vendor policies that use recursive EXISTS
-- -----------------------------------------------------------
DROP POLICY IF EXISTS "vendors: ap_role can update" ON vendors;
DROP POLICY IF EXISTS "vendors: admin can delete" ON vendors;

CREATE POLICY "vendors: admin can delete" ON vendors
  FOR DELETE TO authenticated
  USING (is_admin());

-- -----------------------------------------------------------
-- 3. Auto-assign default AP_USER role to new app_users
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS TRIGGER AS $$
DECLARE
  v_role_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = NEW.id
  ) THEN
    SELECT id INTO v_role_id FROM public.roles WHERE code = 'AP_USER' LIMIT 1;
    IF v_role_id IS NULL THEN
      SELECT id INTO v_role_id FROM public.roles
      WHERE code NOT IN ('SUPERADMIN', 'ADMIN') ORDER BY code LIMIT 1;
    END IF;
    IF v_role_id IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role_id, assigned_by)
      VALUES (NEW.id, v_role_id, NULL);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run once for existing users without roles
DO $$
DECLARE
  r RECORD;
  v_role_id uuid;
BEGIN
  SELECT id INTO v_role_id FROM public.roles WHERE code = 'AP_USER' LIMIT 1;
  IF v_role_id IS NOT NULL THEN
    FOR r IN (
      SELECT au.id FROM public.app_users au
      LEFT JOIN public.user_roles ur ON ur.user_id = au.id
      WHERE ur.id IS NULL AND au.is_active = true
    ) LOOP
      INSERT INTO public.user_roles (user_id, role_id, assigned_by)
      VALUES (r.id, v_role_id, NULL)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END $$;

DROP TRIGGER IF EXISTS on_app_user_created ON app_users;
CREATE TRIGGER on_app_user_created
  AFTER INSERT ON public.app_users
  FOR EACH ROW EXECUTE FUNCTION public.assign_default_role();

-- -----------------------------------------------------------
-- 4. Helper to manually assign role to a user
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION assign_role_to_user(
  p_user_email text,
  p_role_code text
) RETURNS void AS $$
DECLARE
  v_user_id uuid;
  v_role_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM public.app_users WHERE email = p_user_email;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', p_user_email;
  END IF;
  SELECT id INTO v_role_id FROM public.roles WHERE code = p_role_code;
  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'Role % not found', p_role_code;
  END IF;
  INSERT INTO public.user_roles (user_id, role_id, assigned_by)
  VALUES (v_user_id, v_role_id, NULL)
  ON CONFLICT(user_id, role_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
