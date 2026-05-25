"use server";

import { redirect } from "next/navigation";
import { signIn, signOut as signOutService } from "./auth.service";
import type { SignInCredentials } from "./auth.types";

export async function signInAction(credentials: SignInCredentials) {
  try {
    const session = await signIn(credentials);
    return { success: true, data: session };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sign in failed";
    return { success: false, error: message };
  }
}

export async function signOutAction() {
  await signOutService();
  redirect("/auth/signin");
}