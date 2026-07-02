#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const allowMutation = process.env.SECURITY_QA_ENABLE_MUTATION_TESTS === "true";

if (!url || !anonKey) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.");
  process.exit(1);
}

const roles = [
  { role: "owner", email: process.env.SECURITY_QA_OWNER_EMAIL, password: process.env.SECURITY_QA_OWNER_PASSWORD },
  { role: "admin", email: process.env.SECURITY_QA_ADMIN_EMAIL, password: process.env.SECURITY_QA_ADMIN_PASSWORD },
  { role: "coach", email: process.env.SECURITY_QA_COACH_EMAIL, password: process.env.SECURITY_QA_COACH_PASSWORD },
  { role: "front_desk", email: process.env.SECURITY_QA_FRONT_DESK_EMAIL, password: process.env.SECURITY_QA_FRONT_DESK_PASSWORD }
].filter((entry) => entry.email && entry.password);

const errors = [];
const warnings = [];

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function pass(message) {
  console.log(`✅ ${message}`);
}

function client() {
  return createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function signIn(roleConfig) {
  const supabase = client();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: roleConfig.email,
    password: roleConfig.password
  });
  if (error || !data.session) {
    fail(`${roleConfig.role}: login failed for ${roleConfig.email}: ${error?.message || "no session"}`);
    return null;
  }
  return supabase;
}

async function expectRpcDenied(supabase, role, rpcName, args, messageNeedles = []) {
  const { data, error } = await supabase.rpc(rpcName, args);
  if (!error && data) {
    fail(`${role}: ${rpcName} unexpectedly succeeded.`);
    return;
  }
  if (!error) {
    warn(`${role}: ${rpcName} returned no data and no error. Review manually.`);
    return;
  }
  if (messageNeedles.length) {
    const message = String(error.message || "").toLowerCase();
    const ok = messageNeedles.some((needle) => message.includes(needle.toLowerCase()));
    if (!ok) warn(`${role}: ${rpcName} failed with unexpected message: ${error.message}`);
  }
  pass(`${role}: ${rpcName} denied as expected.`);
}

console.log("UC Check Supabase role permission matrix");

const anon = client();
const { data: anonMembers, error: anonMembersError } = await anon.from("members").select("id").limit(1);
if (anonMembersError) {
  pass("anon: members select denied by RLS/error.");
} else if (Array.isArray(anonMembers) && anonMembers.length === 0) {
  pass("anon: members select returns no rows.");
} else {
  fail("anon: members select returned data. Public member data may be exposed.");
}

await expectRpcDenied(
  anon,
  "anon",
  "adjust_remaining_sessions",
  {
    p_member_pass_id: "00000000-0000-0000-0000-000000000000",
    p_adjustment: 1,
    p_reason: "security qa anon denial",
    p_actor_id: "00000000-0000-0000-0000-000000000000"
  },
  ["permission", "denied", "권한"]
);

if (!roles.length) {
  warn("No SECURITY_QA_* role credentials were provided. Skipping authenticated role checks.");
} else {
  for (const roleConfig of roles) {
    const supabase = await signIn(roleConfig);
    if (!supabase) continue;

    const { data: staff, error: staffError } = await supabase.from("staff_users").select("id, role, is_active").limit(5);
    if (staffError) {
      fail(`${roleConfig.role}: cannot read staff_users in own organization: ${staffError.message}`);
    } else if (!Array.isArray(staff) || !staff.some((row) => row.role === roleConfig.role)) {
      warn(`${roleConfig.role}: staff_users readable but expected role row was not found. Check test account mapping.`);
    } else {
      pass(`${roleConfig.role}: can read staff context.`);
    }

    const { data: members, error: membersError } = await supabase.from("members").select("id, name").limit(5);
    if (membersError) {
      fail(`${roleConfig.role}: cannot read members: ${membersError.message}`);
    } else {
      pass(`${roleConfig.role}: can read members (${members?.length ?? 0} rows).`);
    }

    const { data: auditRows, error: auditError } = await supabase.from("audit_logs").select("id").limit(1);
    if (["owner", "admin"].includes(roleConfig.role)) {
      if (auditError) warn(`${roleConfig.role}: audit_logs read failed; confirm owner/admin RLS: ${auditError.message}`);
      else pass(`${roleConfig.role}: audit_logs read allowed.`);
    } else {
      if (auditError) pass(`${roleConfig.role}: audit_logs read denied.`);
      else if (Array.isArray(auditRows) && auditRows.length === 0) pass(`${roleConfig.role}: audit_logs returned no rows.`);
      else fail(`${roleConfig.role}: audit_logs returned data. Coach/front desk should not read audit logs.`);
    }

    await expectRpcDenied(
      supabase,
      roleConfig.role,
      "check_in_member",
      {
        p_member_id: "00000000-0000-0000-0000-000000000000",
        p_member_pass_id: "00000000-0000-0000-0000-000000000000",
        p_actor_id: null,
        p_source: "kiosk"
      },
      ["service", "server", "서버", "키오스크"]
    );

    if (allowMutation) {
      warn(`${roleConfig.role}: mutation tests are enabled but not implemented in this script. Use dedicated QA DB and extend cautiously.`);
    }

    await supabase.auth.signOut();
  }
}

if (warnings.length) {
  console.log("\nWarnings:");
  for (const message of warnings) console.log(`⚠️  ${message}`);
}

if (errors.length) {
  console.error("\nRole permission matrix failed:");
  for (const message of errors) console.error(`❌ ${message}`);
  process.exit(1);
}

console.log("\n✅ Role permission matrix completed.");
