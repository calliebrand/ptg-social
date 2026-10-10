"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";

export async function authenticate(
  _prev: string | null,
  formData: FormData,
) {
  try {
    await signIn("credentials", formData);
  } catch (error) {
    if (error instanceof AuthError) return "That email and password did not match.";
    throw error;
  }
  return null;
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
