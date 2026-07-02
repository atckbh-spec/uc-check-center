#!/usr/bin/env node
const baseUrl = process.env.UC_CHECK_BASE_URL || "http://localhost:3000";

const publicRoutes = ["/", "/login", "/kiosk", "/kiosk/unlock"];
const protectedRoutes = ["/dashboard", "/members/new", "/settings/staff", "/attendance/today"];

function url(path) {
  return new URL(path, baseUrl).toString();
}

async function checkPublic(path) {
  const res = await fetch(url(path), { redirect: "manual" });
  if (![200, 307, 308].includes(res.status)) {
    throw new Error(`${path} returned ${res.status}`);
  }
  console.log(`✅ ${path} responded with ${res.status}`);
}

async function checkProtected(path) {
  const res = await fetch(url(path), { redirect: "manual" });
  const location = res.headers.get("location") || "";
  if (res.status >= 300 && res.status < 400 && location.includes("/login")) {
    console.log(`✅ ${path} redirects to login`);
    return;
  }
  if (res.status === 401 || res.status === 403) {
    console.log(`✅ ${path} blocks unauthenticated access with ${res.status}`);
    return;
  }
  throw new Error(`${path} did not block unauthenticated access. status=${res.status}, location=${location}`);
}

console.log(`UC Check smoke test base URL: ${baseUrl}`);

try {
  for (const route of publicRoutes) await checkPublic(route);
  for (const route of protectedRoutes) await checkProtected(route);
  console.log("\n✅ Smoke test passed.");
} catch (error) {
  console.error(`\n❌ Smoke test failed: ${error.message}`);
  process.exit(1);
}
