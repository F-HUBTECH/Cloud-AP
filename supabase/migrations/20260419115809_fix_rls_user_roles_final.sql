-- Nuclear option: drop ALL policies on user_roles and recreate with simple non-recursive ones
-- Then do the same for any table that might have recursive policies

-- First, drop ALL existing policies on user_roles
DO $$ DECLARE pol RECORD; BEGIN
  FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_roles') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON user_roles', pol.policyname);
  END LOOP;
END $$;

-- Recreate user_roles policies (simple, no recursion)
CREATE POLICY "user_roles: authenticated can read" ON user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_roles: admin can insert" ON user_roles FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "user_roles: admin can delete" ON user_roles FOR DELETE TO authenticated USING (is_admin());
CREATE POLICY "user_roles: admin can update" ON user_roles FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Also fix app_users to ensure no recursion
DO $$ DECLARE pol RECORD; BEGIN
  FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'app_users') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON app_users', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "app_users: read own profile or admin" ON app_users FOR SELECT TO authenticated USING (auth_uid = auth.uid() OR is_admin());
CREATE POLICY "app_users: admin can insert" ON app_users FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "app_users: update own profile or admin" ON app_users FOR UPDATE TO authenticated USING (auth_uid = auth.uid() OR is_admin()) WITH CHECK (auth_uid = auth.uid() OR is_admin());

-- Also nuke problematic policies on roles
DO $$ DECLARE pol RECORD; BEGIN
  FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'roles') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON roles', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "roles: authenticated can read" ON roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "roles: admin can manage" ON roles FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Grant necessary permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;