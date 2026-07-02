#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const failOnMedium = process.env.SECURITY_QA_FAIL_ON_MEDIUM === "true";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  console.error("Run this only from a trusted local/CI environment. Never expose SUPABASE_SERVICE_ROLE_KEY to the browser.");
  process.exit(1);
}

if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
  console.error("NEXT_PUBLIC_DEMO_MODE=true is not allowed for production security DB audit.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

function statusIcon(status) {
  if (status === "pass") return "✅";
  if (status === "warn") return "⚠️ ";
  return "❌";
}

const { data, error } = await supabase.rpc("security_qa_report");

if (error) {
  console.error("Failed to call security_qa_report().");
  console.error(error.message);
  console.error("\nApply supabase/008_security_qa_assertions.sql to the target database, then rerun:");
  console.error("pnpm security:db");
  process.exit(1);
}

const rows = Array.isArray(data) ? data : [];
if (rows.length === 0) {
  console.error("security_qa_report() returned no rows. Check the SQL function implementation.");
  process.exit(1);
}

const blockerFailures = rows.filter((row) => row.status === "fail" && ["blocker", "high"].includes(row.severity));
const mediumFailures = rows.filter((row) => row.status === "fail" && row.severity === "medium");
const warnings = rows.filter((row) => row.status === "warn");

console.log("\nUC Check database security audit");
console.log("================================");
for (const row of rows) {
  const icon = statusIcon(row.status);
  console.log(`${icon} [${row.severity}] ${row.check_name} — ${row.detail}`);
}
console.log("--------------------------------");
console.log(`Total: ${rows.length} | Blocker/High failures: ${blockerFailures.length} | Medium failures: ${mediumFailures.length} | Warnings: ${warnings.length}`);

if (blockerFailures.length > 0 || (failOnMedium && mediumFailures.length > 0)) {
  console.error("\nDatabase security audit failed.");
  process.exit(1);
}
