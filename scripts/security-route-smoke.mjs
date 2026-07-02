#!/usr/bin/env node
const baseUrl = (process.env.UC_CHECK_PRODUCTION_URL || process.env.UC_CHECK_BASE_URL || "").replace(/\/$/, "");

if (!baseUrl) {
  console.error("Set UC_CHECK_PRODUCTION_URL or UC_CHECK_BASE_URL before running security:routes.");
  console.error("Example: UC_CHECK_PRODUCTION_URL=https://uc-check.example.com pnpm security:routes");
  process.exit(1);
}

const failures = [];
const warnings = [];
const passes = [];

function pass(name, detail = "ok") { passes.push({ name, detail }); }
function fail(name, detail) { failures.push({ name, detail }); }

async function request(pathname) {
  const url = `${baseUrl}${pathname}`;
  const res = await fetch(url, {
    redirect: "manual",
    headers: {
      "User-Agent": "uc-check-security-route-smoke/1.0",
      "Accept": "text/html,application/xhtml+xml,application/json"
    }
  });
  const body = await res.text().catch(() => "");
  return { url, status: res.status, location: res.headers.get("location") || "", body };
}

function bodyHasAny(body, keywords) {
  return keywords.filter((keyword) => body.toLowerCase().includes(keyword.toLowerCase()));
}

const protectedRoutes = [
  "/dashboard",
  "/attendance/today",
  "/members",
  "/members/new",
  "/check-in",
  "/reports/monthly",
  "/settings/staff"
];

const protectedKeywords = [
  "Demo Admin",
  "QA Owner",
  "오늘 출석",
  "회원 등록",
  "직원 관리",
  "잔여횟수 조정",
  "audit_logs",
  "member_notes",
  "Staff Command",
  "최근 출석"
];

for (const route of protectedRoutes) {
  try {
    const result = await request(route);
    const isRedirect = result.status >= 300 && result.status < 400;
    const isBlocked = [401, 403, 404].includes(result.status);
    const isLoginPage = result.status === 200 && /로그인|login|staff login/i.test(result.body);
    const leaked = bodyHasAny(result.body, protectedKeywords);

    if (leaked.length > 0) {
      fail(`${route} unauthenticated protected content leak`, `status ${result.status}; keywords: ${leaked.join(", ")}`);
    } else if (isRedirect || isBlocked || isLoginPage) {
      pass(`${route} unauthenticated access is blocked`, `status ${result.status}${result.location ? ` -> ${result.location}` : ""}`);
    } else {
      fail(`${route} unauthenticated access is blocked`, `unexpected status ${result.status}`);
    }
  } catch (error) {
    fail(`${route} request`, error.message);
  }
}

const kioskLockedRoutes = [
  "/kiosk",
  "/kiosk/search?last4=1234",
  "/kiosk/confirm?memberId=00000000-0000-0000-0000-000000000000&passId=00000000-0000-0000-0000-000000000000"
];

for (const route of kioskLockedRoutes) {
  try {
    const result = await request(route);
    const isRedirectToUnlock = result.status >= 300 && result.status < 400 && result.location.includes("/kiosk/unlock");
    const isUnlockPage = result.status === 200 && /키오스크|unlock|잠금|PIN/i.test(result.body);
    const leaked = bodyHasAny(result.body, ["회원 메모", "member_notes", "audit_logs", "전체 전화번호", "010-"]);

    if (leaked.length > 0) {
      fail(`${route} does not leak kiosk-sensitive data while locked`, `keywords: ${leaked.join(", ")}`);
    } else if (isRedirectToUnlock || isUnlockPage) {
      pass(`${route} requires kiosk unlock`, `status ${result.status}${result.location ? ` -> ${result.location}` : ""}`);
    } else {
      fail(`${route} requires kiosk unlock`, `unexpected status ${result.status}`);
    }
  } catch (error) {
    fail(`${route} request`, error.message);
  }
}

const publicRoutes = ["/", "/login", "/kiosk/unlock"];
for (const route of publicRoutes) {
  try {
    const result = await request(route);
    if (result.status >= 200 && result.status < 500) {
      pass(`${route} public route responds`, `status ${result.status}`);
    } else {
      fail(`${route} public route responds`, `status ${result.status}`);
    }

    const leaked = bodyHasAny(result.body, [
      "SUPABASE_SERVICE_ROLE_KEY",
      "service_role",
      "MEMBER_PIN_PEPPER",
      "KIOSK_COOKIE_SECRET",
      "audit_logs",
      "member_notes"
    ]);
    if (leaked.length > 0) fail(`${route} public route does not expose secrets/internal tables`, `keywords: ${leaked.join(", ")}`);
    else pass(`${route} public route does not expose secrets/internal tables`, "ok");
  } catch (error) {
    fail(`${route} request`, error.message);
  }
}

console.log("\nUC Check production route security smoke test");
console.log("============================================");
for (const item of passes) console.log(`✅ ${item.name} — ${item.detail}`);
for (const item of warnings) console.log(`⚠️  ${item.name} — ${item.detail}`);
for (const item of failures) console.error(`❌ ${item.name} — ${item.detail}`);
console.log("--------------------------------------------");
console.log(`Passed: ${passes.length} | Warnings: ${warnings.length} | Failed: ${failures.length}`);

if (failures.length > 0) process.exit(1);
