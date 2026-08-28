"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ModuleCode, RightCode } from "@/lib/constants";

interface PermissionState {
  roles: string[];
  isLoading: boolean;
}

export function usePermission(): PermissionState {
  const [roles, setRoles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadRoles() {
      try {
        const supabase = createClient();
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (authUser) {
          const { data } = await supabase
            .from("app_users")
            .select("id")
            .eq("auth_uid", authUser.id)
            .single();

          if (data) {
            const { data: userRoles } = await supabase
              .from("user_roles")
              .select("role_id, roles(code)")
              .eq("user_id", data.id);

            if (userRoles) {
              const roleCodes = userRoles
                .map((ur: Record<string, unknown>) => {
                  const role = ur.roles as
                    | Record<string, unknown>
                    | Record<string, unknown>[]
                    | null;

                  if (Array.isArray(role)) {
                    return role[0]?.code as string | undefined;
                  }

                  return role?.code as string | undefined;
                })
                .filter((code): code is string => Boolean(code));
              setRoles(roleCodes);
            }
          }
        }
      } catch {
        setRoles([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadRoles();
  }, []);

  return { roles, isLoading };
}

export function useHasRole(): {
  hasRole: (roleName: string) => boolean;
  hasAnyRole: (roleNames: string[]) => boolean;
  isLoading: boolean;
} {
  const { roles, isLoading } = usePermission();

  const hasRole = useCallback(
    (roleName: string) => roles.includes(roleName),
    [roles]
  );

  const hasAnyRole = useCallback(
    (roleNames: string[]) => roleNames.some((r) => roles.includes(r)),
    [roles]
  );

  return { hasRole, hasAnyRole, isLoading };
}

export function useHasRight(): {
  hasRight: (rightCode: RightCode) => Promise<boolean>;
  canCreate: (moduleCode: ModuleCode) => Promise<boolean>;
  canRead: (moduleCode: ModuleCode) => Promise<boolean>;
  canUpdate: (moduleCode: ModuleCode) => Promise<boolean>;
  canDelete: (moduleCode: ModuleCode) => Promise<boolean>;
  canApprove: (moduleCode: ModuleCode) => Promise<boolean>;
  isChecking: boolean;
} {
  const [isChecking, setIsChecking] = useState(false);

  const hasRight = useCallback(async (rightCode: RightCode): Promise<boolean> => {
    setIsChecking(true);
    try {
      const supabase = createClient();
      const { data } = await supabase.rpc("has_right", {
        right_code: rightCode,
      });
      return data === true;
    } catch {
      return false;
    } finally {
      setIsChecking(false);
    }
  }, []);

  const canCreate = useCallback(
    async (moduleCode: ModuleCode): Promise<boolean> => {
      const supabase = createClient();
      const { data } = await supabase.rpc("can_create", {
        module_code: moduleCode,
      });
      return data === true;
    },
    []
  );

  const canRead = useCallback(
    async (moduleCode: ModuleCode): Promise<boolean> => {
      const supabase = createClient();
      const { data } = await supabase.rpc("can_read", {
        module_code: moduleCode,
      });
      return data === true;
    },
    []
  );

  const canUpdate = useCallback(
    async (moduleCode: ModuleCode): Promise<boolean> => {
      const supabase = createClient();
      const { data } = await supabase.rpc("can_update", {
        module_code: moduleCode,
      });
      return data === true;
    },
    []
  );

  const canDelete = useCallback(
    async (moduleCode: ModuleCode): Promise<boolean> => {
      const supabase = createClient();
      const { data } = await supabase.rpc("can_delete", {
        module_code: moduleCode,
      });
      return data === true;
    },
    []
  );

  const canApprove = useCallback(
    async (moduleCode: ModuleCode): Promise<boolean> => {
      const supabase = createClient();
      const { data } = await supabase.rpc("can_approve", {
        module_code: moduleCode,
      });
      return data === true;
    },
    []
  );

  return { hasRight, canCreate, canRead, canUpdate, canDelete, canApprove, isChecking };
}