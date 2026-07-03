import crypto from "crypto";

export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function hashMemberPin(organizationId: string, phone: string, pin: string) {
  return crypto.createHash("sha256").update(`${organizationId}:${digitsOnly(phone)}:${pin}`).digest("hex");
}

export function normalizePin(value: string) {
  return digitsOnly(value).slice(0, 8);
}

export function isValidMemberPin(value: string) {
  return /^\d{4,8}$/.test(value);
}
