"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { clearStaffPinSession, signInWithPin } from "@/lib/auth/pin-session";

export async function signInStaff(formData: FormData) {
  await signInWithPin(formData);
}


export async function signOutStaff() {
  await clearStaffPinSession();
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
