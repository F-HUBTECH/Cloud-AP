-- ============================================================
-- Auth trigger: auto-create app_users when auth.users row is created
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.app_users (auth_uid, login_name, display_name, email, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'login_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Assign SUPERADMIN role to app_users who have the SUPERADMIN flag
-- ============================================================

CREATE OR REPLACE FUNCTION public.assign_superadmin_role()
RETURNS TRIGGER AS $$
DECLARE
  v_role_id uuid;
BEGIN
  -- Only assign if user email matches superadmin pattern or is manually set
  IF NEW.is_active = true THEN
    SELECT id INTO v_role_id FROM public.roles WHERE code = 'SUPERADMIN' LIMIT 1;
    IF v_role_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = NEW.id AND role_id = v_role_id
    ) THEN
      -- Don't auto-assign SUPERADMIN; just leave for manual assignment
      NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- We won't auto-trigger role assignment; that's done manually via admin UI

-- ============================================================
-- Create initial admin user
-- We'll create an auth user and app_users entry via SQL
-- Password: Admin@123456 (bcrypt hash)
-- ============================================================

-- Note: In production, use Supabase Auth API to create users.
-- This SQL creates a reference for the setup script.
-- The actual user creation should be done via:
--   supabase.auth.signUp({ email: 'admin@ksap.local', password: 'Admin@123456' })
-- Then the trigger above will auto-create the app_users entry.
-- After that, assign the SUPERADMIN role manually:
--   INSERT INTO user_roles (user_id, role_id) 
--   SELECT u.id, r.id FROM app_users u, roles r 
--   WHERE u.email = 'admin@ksap.local' AND r.code = 'SUPERADMIN';