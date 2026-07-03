import "server-only";

import crypto from "crypto";
import { cookies } from "next/headers";

const STAFF_PIN_COOKIE_NAME = "uc_staff_pin_session";
const MAX_AGE_SECONDS = 60 * 60 * 12;

function getSecret() {
  const secret = process.env.KIOSK_COOKIE_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("KIOSK_COOKIE_SECRET is required in production.");
  }
  return secret || "uc-check-dev-staff-secret";
}

export function getAdminPin() {
  const pin = process.env.KIOSK_UNLOCK_PIN;
  if (process.env.NODE_ENV === "production") {
    if (!pin || !/^\d{6,}$/.test(pin)) {
      throw new Error("KIOSK_UNLOCK_PIN must be set to at least 6 digits in production.");
    }
    return pin;
  }
  return pin || "1234";
}

export function isAdminPin(pin: string) {
  return pin.trim() === getAdminPin();
}

function sign(payload: string) {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function createCookieValue(staffId: string) {
  const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = `staff:${staffId}:${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

function readCookieValue(value: string | undefined) {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;

  const [scope, staffId, expiresAt] = payload.split(":");
  if (scope !== "staff" || !staffId || !expiresAt) return null;
  if (Number(expiresAt) <= Date.now()) return null;

  const expected = sign(payload);
  if (signature.length !== expected.length) return null;

  const validSignature = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  return validSignature ? staffId : null;
}

export async function getStaffPinSessionId() {
  const cookieStore = await cookies();
  return readCookieValue(cookieStore.get(STAFF_PIN_COOKIE_NAME)?.value);
}

export async function setStaffPinSession(staffId: string) {
  const cookieStore = await cookies();
  cookieStore.set(STAFF_PIN_COOKIE_NAME, createCookieValue(staffId), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_SECONDS,
    path: "/"
  });
}

export async function clearStaffPinSession() {
  const cookieStore = await cookies();
  cookieStore.delete(STAFF_PIN_COOKIE_NAME);
}
