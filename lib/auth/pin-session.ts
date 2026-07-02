import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { StaffUser } from "@/lib/types";

const COOKIE_NAME = "uc_staff_access";
const MAX_AGE_SECONDS = 60 * 60 * 12;

function getSecret() {
  const secret = process.env.KIOSK_COOKIE_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("KIOSK_COOKIE_SECRET is required in production.");
  }
  return secret || "uc-check-dev-staff-secret";
}

function getUnlockPin() {
  const pin = process.env.KIOSK_UNLOCK_PIN;
  if (process.env.NODE_ENV === "production" && (!pin || !/^\d{6,}$/.test(pin))) {
    throw new Error("KIOSK_UNLOCK_PIN must be set to at least 6 digits in production.");
  }
  return pin || "123456";
}

function sign(payload: string) {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function createCookieValue() {
  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = `staff:${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

export async function isStaffPinCookieValid(value: string | undefined) {
  if (!value) return false;
  const [scope, expiresAt, signature] = value.split(/[.:]/);
  if (scope !== "staff" || !expiresAt || !signature) return false;
  const payload = `${scope}:${expiresAt}`;
  const expected = sign(payload);
  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected)) && Number(expiresAt) > Date.now();
}

async function getPrimaryOrganizationId() {
  const supabase = createSupabaseAdminClient();
  const { data: existing, error: selectError } = await supabase
    .from("organizations")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (selectError) {
    if (process.env.NODE_ENV !== "production" && selectError.message.toLowerCase().includes("fetch failed")) {
      return "demo-organization";
    }
    throw new Error(selectError.message);
  }
  if (existing?.id) return existing.id as string;

  const { data: created, error: insertError } = await supabase
    .from("organizations")
    .insert({ name: "Urban Conditioning", slug: "urban-conditioning" })
    .select("id")
    .single();

  if (insertError || !created?.id) throw new Error(insertError?.message || "센터 정보를 만들 수 없습니다.");
  return created.id as string;
}

export async function getPinStaffUser(): Promise<StaffUser> {
  const organizationId = await getPrimaryOrganizationId();
  return {
    id: "00000000-0000-0000-0000-000000000001",
    organization_id: organizationId,
    auth_user_id: "00000000-0000-0000-0000-000000000001",
    name: "센터 관리자",
    email: "center-admin@urban-conditioning.local",
    role: "owner",
    is_active: true
  };
}

export async function signInWithPin(formData: FormData) {
  const pin = String(formData.get("pin") || "").trim();
  if (pin !== getUnlockPin()) redirect("/login?error=1");

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, createCookieValue(), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_SECONDS,
    path: "/"
  });

  redirect("/dashboard");
}

export async function clearStaffPinSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function hasStaffPinSession() {
  const cookieStore = await cookies();
  return isStaffPinCookieValid(cookieStore.get(COOKIE_NAME)?.value);
}
