"use server";

import { redirect } from "next/navigation";
import { createAdminPinSession } from "@/lib/auth/admin-pin";
import { clearStaffPinSession } from "@/lib/auth/pin-session";

export async function signInStaff(formData: FormData) {
  const pin = String(formData.get("pin") || "").trim();
  const result = await createAdminPinSession(pin);

  if (!result.ok) {
    redirect(`/login?error=${result.reason}`);
  }

  redirect("/dashboard");
}

export async function signOutStaff() {
  await clearStaffPinSession();
  redirect("/login");
}
