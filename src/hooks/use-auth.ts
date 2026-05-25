"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@/modules/auth/auth.types";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const supabase = createClient();
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (authUser) {
          const { data: profile } = await supabase
            .from("app_users")
            .select("*")
            .eq("auth_uid", authUser.id)
            .single();

          if (profile) {
            setUser({
              id: profile.id,
              email: profile.email ?? authUser.email ?? "",
              fullName: profile.display_name ?? "",
              avatarUrl: authUser.user_metadata?.avatar_url ?? null,
              isActive: profile.is_active ?? true,
              createdAt: profile.created_at,
              updatedAt: profile.updated_at,
            });
          }
        }
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}

export function useSignOut() {
  return useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }, []);
}