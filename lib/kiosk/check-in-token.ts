import crypto from "crypto";

const TOKEN_TTL_MS = 10 * 60 * 1000;

type KioskCheckInTokenPayload = {
  memberId: string;
  passId: string;
  expiresAt: number;
};

function getKioskTokenSecret() {
  return process.env.KIOSK_ACCESS_SECRET || process.env.NEXTAUTH_SECRET || process.env.KIOSK_UNLOCK_PIN || "uc-check-dev-kiosk-secret";
}

function sign(value: string) {
  return crypto.createHmac("sha256", getKioskTokenSecret()).update(value).digest("base64url");
}

export function createKioskCheckInToken(memberId: string, passId: string) {
  const payload: KioskCheckInTokenPayload = {
    memberId,
    passId,
    expiresAt: Date.now() + TOKEN_TTL_MS
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifyKioskCheckInToken(token: string, memberId: string, passId: string) {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return false;

  const expectedSignature = sign(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return false;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as KioskCheckInTokenPayload;
    return payload.memberId === memberId && payload.passId === passId && payload.expiresAt >= Date.now();
  } catch {
    return false;
  }
}
