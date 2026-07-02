#!/usr/bin/env node
import fs from "fs";
import path from "path";

const root = process.cwd();
const envFiles = [".env.production.local", ".env.local", ".env.production", ".env"];

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, "utf8");
  const parsed = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
  }
  return parsed;
}

const fileEnv = {};
const loadedFiles = [];
for (const file of envFiles) {
  const fullPath = path.join(root, file);
  if (fs.existsSync(fullPath)) {
    Object.assign(fileEnv, parseEnvFile(fullPath));
    loadedFiles.push(file);
  }
}

const env = { ...fileEnv, ...process.env };
const errors = [];
const warnings = [];

function value(key) {
  return String(env[key] || "").trim();
}

function requireVar(key) {
  if (!value(key)) errors.push(`Missing required environment variable: ${key}`);
}

function forbidPlaceholder(key, placeholders) {
  const current = value(key);
  if (!current) return;
  const lowered = current.toLowerCase();
  for (const placeholder of placeholders) {
    if (lowered.includes(placeholder.toLowerCase())) {
      errors.push(`${key} still looks like a placeholder: ${current}`);
      return;
    }
  }
}

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_DEMO_MODE",
  "KIOSK_UNLOCK_PIN",
  "KIOSK_COOKIE_SECRET",
  "MEMBER_PIN_PEPPER"
];

for (const key of required) requireVar(key);

if (value("NEXT_PUBLIC_DEMO_MODE") !== "false") {
  errors.push("NEXT_PUBLIC_DEMO_MODE must be exactly 'false' for production deployment.");
}

if (value("NEXT_PUBLIC_SUPABASE_URL") && !value("NEXT_PUBLIC_SUPABASE_URL").startsWith("https://")) {
  errors.push("NEXT_PUBLIC_SUPABASE_URL should start with https:// in production.");
}

if (value("NEXT_PUBLIC_APP_URL") && !value("NEXT_PUBLIC_APP_URL").startsWith("https://")) {
  warnings.push("NEXT_PUBLIC_APP_URL should use https:// for production. Local development may use http://localhost:3000.");
}

if (value("KIOSK_UNLOCK_PIN") && !/^\d{6,}$/.test(value("KIOSK_UNLOCK_PIN"))) {
  errors.push("KIOSK_UNLOCK_PIN must be numeric and at least 6 digits for production.");
}

if (value("KIOSK_COOKIE_SECRET") && value("KIOSK_COOKIE_SECRET").length < 32) {
  errors.push("KIOSK_COOKIE_SECRET must be at least 32 characters.");
}

if (value("MEMBER_PIN_PEPPER") && value("MEMBER_PIN_PEPPER").length < 32) {
  errors.push("MEMBER_PIN_PEPPER must be at least 32 characters.");
}

forbidPlaceholder("NEXT_PUBLIC_SUPABASE_ANON_KEY", ["replace", "your-", "example", "changeme"]);
forbidPlaceholder("SUPABASE_SERVICE_ROLE_KEY", ["replace", "your-", "example", "changeme"]);
forbidPlaceholder("KIOSK_UNLOCK_PIN", ["replace", "123456", "000000", "111111", "changeme"]);
forbidPlaceholder("KIOSK_COOKIE_SECRET", ["replace", "long-random", "changeme", "secret"]);
forbidPlaceholder("MEMBER_PIN_PEPPER", ["replace", "long-random", "changeme", "pepper"]);

const publicEnvKeys = Object.keys(env).filter((key) => key.startsWith("NEXT_PUBLIC_"));
if (publicEnvKeys.includes("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY")) {
  errors.push("Do not expose service role key through NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY.");
}

const qaSeedPath = path.join(root, "supabase", "006_qa_seed_data.sql");
if (fs.existsSync(qaSeedPath)) {
  warnings.push("QA seed file exists. Confirm it is never applied to production Supabase.");
}

console.log("UC Check center operations hosting preflight");
console.log(`Loaded env files: ${loadedFiles.length ? loadedFiles.join(", ") : "none"}`);

if (warnings.length) {
  console.log("\nWarnings:");
  for (const warning of warnings) console.log(`⚠️  ${warning}`);
}

if (errors.length) {
  console.error("\nCenter operations hosting preflight failed:");
  for (const error of errors) console.error(`❌ ${error}`);
  process.exit(1);
}

console.log("\n✅ Center operations hosting preflight passed.");
