export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function phoneLast4(phone: string) {
  return digitsOnly(phone).slice(-4);
}

export function maskPhone(phone: string) {
  const digits = digitsOnly(phone);
  if (digits.length < 4) return "****";
  const last4 = digits.slice(-4);
  if (digits.length >= 10) return `${digits.slice(0, 3)}-****-${last4}`;
  return `****-${last4}`;
}

export function maskKoreanName(name: string) {
  const trimmed = name.trim();
  if (trimmed.length <= 1) return `${trimmed}O`;
  return `${trimmed.slice(0, 1)}${"O".repeat(Math.max(1, trimmed.length - 1))}`;
}
