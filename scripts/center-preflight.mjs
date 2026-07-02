#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];
const warnings = [];
const passes = [];

function value(key) {
  return String(process.env[key] || "").trim();
}

function pass(message) {
  passes.push(message);
}

function warn(message) {
  warnings.push(message);
}

function fail(message) {
  errors.push(message);
}

function exists(file) {
  return fs.existsSync(path.join(root, file));
}

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function requireEnv(key) {
  if (!value(key)) fail(`${key} is required for center operations launch.`);
  else pass(`${key} is present.`);
}

const forbiddenEnvFiles = [".env.local", ".env.production.local"];
for (const file of forbiddenEnvFiles) {
  if (exists(file)) fail(`${file} must not be committed or included in release packages.`);
  else pass(`${file} is absent.`);
}

if (exists(".gitignore")) {
  const gitignore = read(".gitignore");
  for (const pattern of [".env.local", ".env*.local", ".env.production.local", "node_modules/", ".next/"]) {
    if (gitignore.includes(pattern)) pass(`.gitignore excludes ${pattern}`);
    else fail(`.gitignore must exclude ${pattern}`);
  }
} else {
  fail(".gitignore is required.");
}

for (const key of [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_DEMO_MODE",
  "KIOSK_UNLOCK_PIN",
  "KIOSK_COOKIE_SECRET",
  "MEMBER_PIN_PEPPER"
]) {
  requireEnv(key);
}

if (value("NEXT_PUBLIC_DEMO_MODE") === "true") {
  fail("NEXT_PUBLIC_DEMO_MODE=true is not allowed for center go-live.");
} else if (value("NEXT_PUBLIC_DEMO_MODE") === "false") {
  pass("NEXT_PUBLIC_DEMO_MODE is false.");
} else if (value("NEXT_PUBLIC_DEMO_MODE")) {
  fail("NEXT_PUBLIC_DEMO_MODE must be exactly false.");
}

if (value("KIOSK_UNLOCK_PIN") && !/^\d{6,}$/.test(value("KIOSK_UNLOCK_PIN"))) {
  fail("KIOSK_UNLOCK_PIN must be numeric and at least 6 digits for center operations.");
} else if (value("KIOSK_UNLOCK_PIN")) {
  pass("KIOSK_UNLOCK_PIN has at least 6 digits.");
}

if (value("KIOSK_COOKIE_SECRET") && value("KIOSK_COOKIE_SECRET").length < 32) {
  fail("KIOSK_COOKIE_SECRET must be at least 32 characters.");
}

if (value("MEMBER_PIN_PEPPER") && value("MEMBER_PIN_PEPPER").length < 32) {
  fail("MEMBER_PIN_PEPPER must be at least 32 characters.");
}

const publicServiceRoleKeys = Object.keys(process.env).filter((key) => /^NEXT_PUBLIC_.*SERVICE_ROLE/i.test(key));
if (publicServiceRoleKeys.length) {
  fail(`Service role key must not be exposed through NEXT_PUBLIC_: ${publicServiceRoleKeys.join(", ")}`);
} else {
  pass("No NEXT_PUBLIC service role key detected.");
}

if (exists(".env.example")) {
  const envExample = read(".env.example");
  if (/NEXT_PUBLIC_DEMO_MODE\s*=\s*true/.test(envExample)) fail(".env.example must not suggest demo mode for launch.");
  else pass(".env.example does not enable demo mode.");
  if (/SUPABASE_SERVICE_ROLE_KEY\s*=\s*(?!$|<|replace|your-|#)/i.test(envExample)) {
    warn(".env.example appears to include a concrete service role value. Keep it descriptive only.");
  }
}

const requiredDocs = [
  "README_CENTER_OPERATIONS.md",
  "CENTER_OPERATIONS_GO_LIVE_CHECKLIST.md",
  "CENTER_STAFF_OPERATION_MANUAL.md",
  "CENTER_DATA_AND_PRIVACY_POLICY.md",
  "CENTER_UPDATE_ROADMAP.md"
];

for (const doc of requiredDocs) {
  if (exists(doc)) pass(`${doc} exists.`);
  else fail(`${doc} is required.`);
}

const v1Scope = [
  "출석",
  "회원권",
  "키오스크",
  "출석 취소",
  "잔여횟수 조정",
  "노쇼",
  "메모",
  "재등록 대상",
  "장기 미방문",
  "월간 리포트"
];

if (exists("README_CENTER_OPERATIONS.md")) {
  const centerReadme = read("README_CENTER_OPERATIONS.md");
  for (const item of v1Scope) {
    if (centerReadme.includes(item)) pass(`v1 scope documents ${item}`);
    else fail(`README_CENTER_OPERATIONS.md must document v1 scope: ${item}`);
  }
}

console.log("\nUC Check center operations preflight");
console.log("====================================");
for (const item of passes) console.log(`PASS ${item}`);
for (const item of warnings) console.log(`WARN ${item}`);
for (const item of errors) console.error(`FAIL ${item}`);
console.log("------------------------------------");
console.log(`Passed: ${passes.length} | Warnings: ${warnings.length} | Failed: ${errors.length}`);

if (errors.length > 0) process.exit(1);
