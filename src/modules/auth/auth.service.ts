import { createServerClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/client";
import type { User, AuthSession, SignInCredentials, Profile, Role } from "./auth.types";

export async function getUser(): Promise<User | null> {
  const supabase = await createServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) return null;

  const { data: profile } = await supabase
    .from("app_users")
    .select("*")
    .eq("auth_uid", authUser.id)
    .single();

  if (!profile) return null;

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.display_name,
    avatarUrl: null,
    isActive: profile.is_active,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) return null;

  const { data: profile } = await supabase
    .from("app_users")
    .select("*, user_roles(role:roles(*))")
    .eq("auth_uid", authUser.id)
    .single();

  if (!profile) return null;

  const roles: Role[] = profile.user_roles?.map((ur: { role: Role }) => ur.role).filter(Boolean) ?? [];

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.display_name,
    avatarUrl: null,
    isActive: profile.is_active,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
    roles,
  };
}

export async function signIn(credentials: SignInCredentials): Promise<AuthSession> {
  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  if (error) throw error;
  if (!data.user || !data.session) throw new Error("Sign in failed");

  return {
    user: {
      id: data.user.id,
      email: data.user.email ?? "",
      fullName: data.user.user_metadata?.full_name ?? "",
      avatarUrl: data.user.user_metadata?.avatar_url ?? null,
      isActive: true,
      createdAt: data.user.created_at,
      updatedAt: data.user.updated_at ?? data.user.created_at,
    },
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at ?? 0,
  };
}

export async function signOut(): Promise<void> {
  const supabase = await createServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession(): Promise<AuthSession | null> {
  const supabase = await createServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) return null;

  return {
    user: {
      id: session.user.id,
      email: session.user.email ?? "",
      fullName: session.user.user_metadata?.full_name ?? "",
      avatarUrl: session.user.user_metadata?.avatar_url ?? null,
      isActive: true,
      createdAt: session.user.created_at,
      updatedAt: session.user.updated_at ?? session.user.created_at,
    },
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ?? 0,
  };
}

export function signInClient(credentials: SignInCredentials) {
  const supabase = createClient();
  return supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });
}

export function signOutClient() {
  const supabase = createClient();
  return supabase.auth.signOut();
}

export function getSessionClient() {
  const supabase = createClient();
  return supabase.auth.getSession();
}