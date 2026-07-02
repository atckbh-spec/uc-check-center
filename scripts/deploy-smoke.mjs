#!/usr/bin/env node
const baseUrl = process.env.UC_CHECK_PRODUCTION_URL || process.env.UC_CHECK_BASE_URL;

if (!baseUrl) {
  console.error("❌ Set UC_CHECK_PRODUCTION_URL, for example: UC_CHECK_PRODUCTION_URL=https://check.example.com pnpm deploy:smoke");
  process.exit(1);
}

function url(path) {
  return new URL(path, baseUrl).toString();
}

const publicRoutes = ["/", "/login", "/kiosk/unlock"];
const protectedStaffRoutes = ["/dashboard", "/members/new", "/settings/staff", "/attendance/today", "/reports/monthly"];
const kioskRoutes = ["/kiosk", "/kiosk/search", "/kiosk/confirm"];

async function fetchManual(path) {
  return fetch(url(path), {
    redirect: "manual",
    headers: { "user-agent": "uc-check-deploy-smoke/1.0" }
  });
}

async function expectPublic(path) {
  const res = await fetchManual(path);
  if (![200, 307, 308].includes(res.status)) {
    throw new Error(`${path} expected public response/redirect, got ${res.status}`);
  }
  console.log(`✅ ${path} responded with ${res.status}`);
}

async function expectLoginRedirect(path) {
  const res = await fetchManual(path);
  const location = res.headers.get("location") || "";
  if (res.status >= 300 && res.status < 400 && location.includes("/login")) {
    console.log(`✅ ${path} redirects unauthenticated user to login`);
    return;
  }
  if (res.status === 401 || res.status === 403) {
    console.log(`✅ ${path} blocks unauthenticated user with ${res.status}`);
    return;
  }
  throw new Error(`${path} did not block unauthenticated user. status=${res.status}, location=${location}`);
}

async function expectKioskLocked(path) {
  const res = await fetchManual(path);
  const location = res.headers.get("location") || "";
  if (res.status >= 300 && res.status < 400 && (location.includes("/kiosk/unlock") || location.includes("/kiosk"))) {
    console.log(`✅ ${path} is locked or redirected before kiosk unlock`);
    return;
  }
  if ([400, 401, 403].includes(res.status)) {
    console.log(`✅ ${path} blocks locked kiosk access with ${res.status}`);
    return;
  }
  throw new Error(`${path} did not appear locked before kiosk unlock. status=${res.status}, location=${location}`);
}

console.log(`UC Check deployment smoke test base URL: ${baseUrl}`);

try {
  for (const route of publicRoutes) await expectPublic(route);
  for (const route of protectedStaffRoutes) await expectLoginRedirect(route);
  for (const route of kioskRoutes) await expectKioskLocked(route);
  console.log("\n✅ Deployment smoke test passed.");
} catch (error) {
  console.error(`\n❌ Deployment smoke test failed: ${error.message}`);
  process.exit(1);
}
