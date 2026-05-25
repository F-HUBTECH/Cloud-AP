"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";

interface UserFormData {
  login_name: string;
  display_name: string;
  department: string;
  is_active: boolean;
  expire_date: string;
}

export async function createUser(formData: UserFormData) {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("app_users")
    .insert({
      login_name: formData.login_name,
      display_name: formData.display_name || null,
      department: formData.department || null,
      is_active: formData.is_active,
      expire_date: formData.expire_date || null,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/settings/users");
  return { success: true, data };
}

export async function updateUser(id: string, formData: UserFormData) {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("app_users")
    .update({
      login_name: formData.login_name,
      display_name: formData.display_name || null,
      department: formData.department || null,
      is_active: formData.is_active,
      expire_date: formData.expire_date || null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/settings/users");
  return { success: true, data };
}

export async function deleteUser(id: string) {
  const supabase = await createServerClient();

  const { error } = await supabase.from("app_users").delete().eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/settings/users");
  return { success: true };
}