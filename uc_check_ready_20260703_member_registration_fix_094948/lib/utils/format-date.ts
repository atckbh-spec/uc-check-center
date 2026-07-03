export function todayInKorea() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

export function addDaysInKorea(date: string, days: number) {
  const base = new Date(`${date}T00:00:00+09:00`);
  base.setDate(base.getDate() + days);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(base);
}

export function formatKoreanDateTime(value: string | Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function formatKoreanTime(value: string | Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function formatKoreanLongDate(value: string | Date = new Date()) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long"
  }).format(new Date(value));
}

export function daysSince(date: string | null) {
  if (!date) return 9999;
  const then = new Date(`${date}T00:00:00+09:00`).getTime();
  const now = new Date(`${todayInKorea()}T00:00:00+09:00`).getTime();
  return Math.floor((now - then) / 86400000);
}
