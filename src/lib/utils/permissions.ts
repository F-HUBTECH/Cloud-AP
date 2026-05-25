import { createServerClient } from "@/lib/supabase/server";
import type { ModuleCode, RightCode } from "@/lib/constants";

export async function hasRole(roleName: string): Promise<boolean> {
  const supabase = await createServerClient();
  const { data } = await supabase.rpc("has_role", { role_name: roleName });
  return data === true;
}

export async function hasAnyRole(roleNames: string[]): Promise<boolean> {
  const supabase = await createServerClient();
  const { data } = await supabase.rpc("has_any_role", { role_names: roleNames });
  return data === true;
}

export async function hasRight(rightCode: RightCode): Promise<boolean> {
  const supabase = await createServerClient();
  const { data } = await supabase.rpc("has_right", { right_code: rightCode });
  return data === true;
}

export async function canCreate(moduleCode: ModuleCode): Promise<boolean> {
  const supabase = await createServerClient();
  const { data } = await supabase.rpc("can_create", { module_code: moduleCode });
  return data === true;
}

export async function canRead(moduleCode: ModuleCode): Promise<boolean> {
  const supabase = await createServerClient();
  const { data } = await supabase.rpc("can_read", { module_code: moduleCode });
  return data === true;
}

export async function canUpdate(moduleCode: ModuleCode): Promise<boolean> {
  const supabase = await createServerClient();
  const { data } = await supabase.rpc("can_update", { module_code: moduleCode });
  return data === true;
}

export async function canDelete(moduleCode: ModuleCode): Promise<boolean> {
  const supabase = await createServerClient();
  const { data } = await supabase.rpc("can_delete", { module_code: moduleCode });
  return data === true;
}

export async function canApprove(moduleCode: ModuleCode): Promise<boolean> {
  const supabase = await createServerClient();
  const { data } = await supabase.rpc("can_approve", { module_code: moduleCode });
  return data === true;
}