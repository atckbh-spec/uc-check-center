"use server";

import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminPinSession } from "@/lib/auth/admin-pin";

const COOKIE_NAME = "uc_kiosk_access";
const MAX_AGE_SECONDS = 60 * 60 * 12;

function getSecret() {
  const secret = process.env.KIOSK_COOKIE_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("KIOSK_COOKIE_SECRET is required in production.");
  }
  return secret || "uc-check-dev-kiosk-secret";
}

function getKioskUnlockPin() {
  const pin = process.env.KIOSK_UNLOCK_PIN;
  if (process.env.NODE_ENV === "production") {
    if (!pin || !/^\d{6,}$/.test(pin)) {
      throw new Error("KIOSK_UNLOCK_PIN must be set to at least 6 digits in production.");
    }
    return pin;
  }
  return pin || "1234";
}

function sign(payload: string) {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function createCookieValue() {
  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = `kiosk:${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

function isKioskCookieValid(value: string | undefined) {
  if (!value) return false;
  const [scope, expiresAt, signature] = value.split(/[.:]/);
  if (scope !== "kiosk" || !expiresAt || !signature) return false;
  const payload = `${scope}:${expiresAt}`;
  const expected = sign(payload);
  if (signature.length !== expected.length) return false;
  const validSignature = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  return validSignature && Number(expiresAt) > Date.now();
}

export async function requireKioskAccess() {
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;
  if (!isKioskCookieValid(value)) redirect("/kiosk/unlock");
}

export async function unlockKiosk(formData: FormData) {
  const pin = String(formData.get("pin") || "").trim();
  if (pin !== getKioskUnlockPin()) redirect("/kiosk/unlock?error=1");

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, createCookieValue(), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_SECONDS,
    path: "/kiosk"
  });
  redirect("/kiosk");
}

export async function enterAdminDashboard(formData: FormData) {
  const pin = String(formData.get("pin") || "").trim();
  const result = await createAdminPinSession(pin);
  if (!result.ok) redirect("/kiosk/admin?error=1");
  redirect("/dashboard");
}

export async function lockKiosk() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  redirect("/kiosk/unlock");
}
