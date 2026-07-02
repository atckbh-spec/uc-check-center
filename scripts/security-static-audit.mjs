#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const warnings = [];
const passes = [];

function rel(file) {
  return path.relative(root, file).replaceAll(path.sep, "/");
}

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function exists(file) {
  return fs.existsSync(path.join(root, file));
}

function stripSqlComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(/\r?\n/)
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");
}

function walk(dir, files = []) {
  const full = path.join(root, dir);
  if (!fs.existsSync(full)) return files;
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    if (["node_modules", ".next", ".git"].includes(entry.name)) continue;
    const fullPath = path.join(full, entry.name);
    const relative = rel(fullPath);
    if (entry.isDirectory()) walk(relative, files);
    else files.push(relative);
  }
  return files;
}

function pass(name, detail = "ok") { passes.push({ name, detail }); }
function fail(name, detail) { failures.push({ name, detail }); }
function warn(name, detail) { warnings.push({ name, detail }); }
function expect(condition, name, detail) { condition ? pass(name, detail) : fail(name, detail); }

const protectedPages = [
  "app/dashboard/page.tsx",
  "app/attendance/today/page.tsx",
  "app/check-in/page.tsx",
  "app/check-in/success/page.tsx",
  "app/members/page.tsx",
  "app/members/new/page.tsx",
  "app/members/[id]/page.tsx",
  "app/reports/monthly/page.tsx",
  "app/settings/staff/page.tsx",
  "app/kiosk/page.tsx",
  "app/kiosk/search/page.tsx",
  "app/kiosk/confirm/page.tsx",
  "app/kiosk/success/page.tsx",
  "app/kiosk/admin/page.tsx",
  "app/kiosk/unlock/page.tsx",
  "app/login/page.tsx"
];

for (const file of protectedPages) {
  if (!exists(file)) {
    fail(`protected page exists: ${file}`, "file is missing");
    continue;
  }
  const body = read(file);
  expect(
    body.includes('export const dynamic = "force-dynamic"') || body.includes("export const dynamic = 'force-dynamic'"),
    `force dynamic: ${file}`,
    "page opts out of static prerender"
  );
}

if (exists("lib/config/env.ts")) {
  const env = read("lib/config/env.ts");
  expect(!env.includes("isProductionBuildPhase"), "no production build demo bypass in env config", "isProductionBuildPhase is absent");
  expect(/shouldUseDemoData\(\)[\s\S]*return\s+isDemoMode\(\)/.test(env), "demo data only follows demo mode", "shouldUseDemoData returns isDemoMode()");
}

if (exists("lib/auth/require-staff.ts")) {
  const auth = read("lib/auth/require-staff.ts");
  expect(!auth.includes("isProductionBuildPhase") && !auth.includes("phase-production-build"), "no production build demo staff bypass", "require-staff does not special-case build phase");
  expect(auth.includes("supabase.auth.getUser()"), "staff auth uses Supabase user session", "getCurrentStaffUser reads authenticated user");
}

const appAndComponentFiles = ["app", "components"].flatMap((dir) => walk(dir)).filter((file) => /\.(ts|tsx|js|jsx)$/.test(file));
const serviceRoleLeaks = [];
for (const file of appAndComponentFiles) {
  const body = read(file);
  if (body.includes("SUPABASE_SERVICE_ROLE_KEY") || body.includes("createSupabaseAdminClient")) {
    serviceRoleLeaks.push(file);
  }
}
expect(serviceRoleLeaks.length === 0, "service role not imported from app/components", serviceRoleLeaks.length ? serviceRoleLeaks.join(", ") : "ok");

const allSourceFiles = ["app", "components", "lib"].flatMap((dir) => walk(dir)).filter((file) => /\.(ts|tsx|js|jsx|mjs)$/.test(file));
const publicServiceKeyRefs = [];
for (const file of allSourceFiles) {
  const body = read(file);
  if (/NEXT_PUBLIC_[A-Z0-9_]*SERVICE_ROLE/i.test(body)) publicServiceKeyRefs.push(file);
}
expect(publicServiceKeyRefs.length === 0, "no NEXT_PUBLIC service-role env references", publicServiceKeyRefs.length ? publicServiceKeyRefs.join(", ") : "ok");

const kioskFiles = walk("app/kiosk").concat(walk("components/kiosk"), walk("lib/kiosk")).filter((file) => /\.(ts|tsx|js|jsx|mjs)$/.test(file));
const kioskForbidden = [];
for (const file of kioskFiles) {
  const body = read(file);
  const forbiddenPatterns = [
    /member_notes/,
    /audit_logs/,
    /\.select\(\s*["']\*["']\s*\)/,
    /memo\s*[:=]/i,
    /content\s*[:=]/i
  ];
  if (forbiddenPatterns.some((pattern) => pattern.test(body))) kioskForbidden.push(file);
}
expect(kioskForbidden.length === 0, "kiosk code avoids notes/audit/full selects", kioskForbidden.length ? kioskForbidden.join(", ") : "ok");

const sqlFiles = walk("supabase").filter((file) => file.endsWith(".sql"));
const createPolicyIfNotExists = [];
const broadPolicyCreates = [];
for (const file of sqlFiles) {
  const body = stripSqlComments(read(file));
  if (/create\s+policy\s+if\s+not\s+exists/i.test(body)) createPolicyIfNotExists.push(file);
  if (/create\s+policy\s+"staff can manage/i.test(body)) broadPolicyCreates.push(file);
}
expect(createPolicyIfNotExists.length === 0, "no CREATE POLICY IF NOT EXISTS", createPolicyIfNotExists.length ? createPolicyIfNotExists.join(", ") : "ok");
expect(broadPolicyCreates.length === 0, "no broad staff manage policy creation", broadPolicyCreates.length ? broadPolicyCreates.join(", ") : "ok");

const deprecatedMigrations = [
  "supabase/01_security_hardening.sql",
  "supabase/02_member_registration_fields.sql",
  "supabase/20260629_kiosk_demo1_hardening.sql"
];
for (const file of deprecatedMigrations) {
  if (!exists(file)) {
    warn(`deprecated migration marker exists: ${file}`, "file is absent; acceptable if README explicitly removed it");
    continue;
  }
  const body = read(file);
  const lowered = body.toLowerCase();
  expect(lowered.includes("deprecated") || lowered.includes("do not apply") || lowered.includes("사용하지"), `deprecated migration is marked: ${file}`, "contains deprecated/do not apply marker");
  expect(!/create\s+or\s+replace\s+function\s+public\.check_in_member/i.test(stripSqlComments(body)), `deprecated migration cannot redefine check_in_member: ${file}`, "does not redefine critical RPC");
}

if (exists(".env.production.example")) {
  const envProd = read(".env.production.example");
  expect(envProd.includes("KIOSK_COOKIE_SECRET"), "production env includes KIOSK_COOKIE_SECRET", "ok");
  expect(envProd.includes("MEMBER_PIN_PEPPER"), "production env includes MEMBER_PIN_PEPPER", "ok");
  expect(!/NEXT_PUBLIC_.*SERVICE_ROLE/i.test(envProd), "production env example does not expose service role publicly", "ok");
  if (/NEXT_PUBLIC_DEMO_MODE\s*=\s*true/.test(envProd)) fail("production demo mode disabled", "NEXT_PUBLIC_DEMO_MODE=true in .env.production.example");
  else pass("production demo mode disabled", "NEXT_PUBLIC_DEMO_MODE is not true");
}

if (exists("package.json")) {
  const pkg = JSON.parse(read("package.json"));
  const scripts = pkg.scripts || {};
  for (const scriptName of ["security:static", "security:routes", "security:db", "security:check"]) {
    expect(Boolean(scripts[scriptName]), `package script exists: ${scriptName}`, scripts[scriptName] || "missing");
  }
}

console.log("\nUC Check static security audit");
console.log("==============================");
for (const item of passes) console.log(`✅ ${item.name} — ${item.detail}`);
for (const item of warnings) console.log(`⚠️  ${item.name} — ${item.detail}`);
for (const item of failures) console.error(`❌ ${item.name} — ${item.detail}`);
console.log("------------------------------");
console.log(`Passed: ${passes.length} | Warnings: ${warnings.length} | Failed: ${failures.length}`);

if (failures.length > 0) process.exit(1);
