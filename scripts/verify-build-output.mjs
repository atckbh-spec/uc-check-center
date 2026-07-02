#!/usr/bin/env node
import fs from "fs";
import path from "path";

const root = process.cwd();
const nextDir = path.join(root, ".next");
const serverAppDir = path.join(nextDir, "server", "app");

const protectedStaticHtml = [
  "dashboard.html",
  path.join("attendance", "today.html"),
  "check-in.html",
  path.join("check-in", "success.html"),
  "members.html",
  path.join("members", "new.html"),
  path.join("reports", "monthly.html"),
  path.join("settings", "staff.html"),
  "kiosk.html",
  path.join("kiosk", "search.html"),
  path.join("kiosk", "confirm.html"),
  path.join("kiosk", "success.html"),
  path.join("kiosk", "admin.html"),
  path.join("kiosk", "unlock.html")
];

const forbiddenStaticStrings = [
  "Demo Admin",
  "qa-owner@urban-conditioning.test",
  "01012345678",
  "010-1234-5678",
  "QA Owner"
];

function fail(message) {
  console.error(`\n❌ ${message}`);
  process.exitCode = 1;
}

function pass(message) {
  console.log(`✅ ${message}`);
}

if (!fs.existsSync(nextDir)) {
  fail(".next directory not found. Run `pnpm build` before `pnpm qa:build-output`.");
  process.exit(process.exitCode ?? 1);
}

if (!fs.existsSync(serverAppDir)) {
  fail(".next/server/app directory not found. Next build output is missing or unexpected.");
  process.exit(process.exitCode ?? 1);
}

let foundStatic = false;
for (const rel of protectedStaticHtml) {
  const file = path.join(serverAppDir, rel);
  if (fs.existsSync(file)) {
    foundStatic = true;
    fail(`Protected route was prerendered as static HTML: .next/server/app/${rel}`);
    const content = fs.readFileSync(file, "utf8");
    for (const needle of forbiddenStaticStrings) {
      if (content.includes(needle)) {
        fail(`Static HTML contains forbidden data string '${needle}' in ${rel}`);
      }
    }
  }
}

if (!foundStatic) {
  pass("No protected staff/kiosk route was emitted as static HTML.");
}

const dynamicPages = [
  path.join(serverAppDir, "dashboard", "page.js"),
  path.join(serverAppDir, "attendance", "today", "page.js"),
  path.join(serverAppDir, "members", "new", "page.js"),
  path.join(serverAppDir, "settings", "staff", "page.js")
];

for (const page of dynamicPages) {
  if (fs.existsSync(page)) {
    pass(`Dynamic page bundle exists: ${path.relative(root, page)}`);
  } else {
    console.warn(`⚠️ Could not find expected page bundle: ${path.relative(root, page)}`);
  }
}

if (process.exitCode) {
  console.error("\nBuild output verification failed. Fix dynamic auth/static prerendering before deploying.");
  process.exit(process.exitCode);
}

console.log("\n✅ Build output verification passed.");
