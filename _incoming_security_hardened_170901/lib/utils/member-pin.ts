import crypto from "crypto";

export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function memberPinPayload(organizationId: string, phone: string, pin: string) {
  return `${organizationId}:${digitsOnly(phone)}:${pin}`;
}

function memberPinPepper() {
  return process.env.MEMBER_PIN_PEPPER || "";
}

export function hashMemberPin(organizationId: string, phone: string, pin: string) {
  const pepper = memberPinPepper();
  return crypto.createHash("sha256").update(`${memberPinPayload(organizationId, phone, pin)}:${pepper}`).digest("hex");
}

export function hashMemberPinLegacy(organizationId: string, phone: string, pin: string) {
  return crypto.createHash("sha256").update(memberPinPayload(organizationId, phone, pin)).digest("hex");
}

export function verifyMemberPinHash(organizationId: string, phone: string, pin: string, storedHash: string | null | undefined) {
  if (!storedHash) return false;
  return hashMemberPin(organizationId, phone, pin) === storedHash || hashMemberPinLegacy(organizationId, phone, pin) === storedHash;
}

export function normalizePin(value: string) {
  return digitsOnly(value).slice(0, 8);
}

export function isValidMemberPin(value: string) {
  return /^\d{4,8}$/.test(value);
}
