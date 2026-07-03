"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAuditLog } from "@/lib/audit/actions";
import { requireStaffUser } from "@/lib/auth/require-staff";
import { isDemoMode } from "@/lib/config/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { addDaysInKorea, todayInKorea } from "@/lib/utils/format-date";
import { hashMemberPin, isValidMemberPin, normalizePin } from "@/lib/utils/member-pin";
import { phoneLast4 } from "@/lib/utils/mask-phone";

function failMemberCreate(reason: string): never {
  redirect(`/members/new?error=${encodeURIComponent(reason)}`);
}

function resolvePassMode(mode: string, startDate: string) {
  if (mode === "20_sessions") {
    return { passName: "20회 등록권", totalSessions: 20, endDate: null as string | null };
  }
  if (mode === "monthly") {
    return { passName: "한달 등록권", totalSessions: 999, endDate: addDaysInKorea(startDate, 30) };
  }
  return { passName: "10회 등록권", totalSessions: 10, endDate: null as string | null };
}

export async function createMember(formData: FormData) {
  const staff = await requireStaffUser();
  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const last4 = phoneLast4(phone);
  const pin = normalizePin(String(formData.get("pin") || "") || last4);
  const birthDate = String(formData.get("birth_date") || "") || null;
  const memo = String(formData.get("memo") || "").trim() || null;
  const startDate = String(formData.get("start_date") || todayInKorea());
  const serviceType = String(formData.get("service_type") || "conditioning");
  const passMode = String(formData.get("pass_mode") || "10_sessions");
  const pass = resolvePassMode(passMode, startDate);

  if (!name || last4.length !== 4) failMemberCreate("name_or_phone");
  if (!isValidMemberPin(pin)) failMemberCreate("pin");

  if (isDemoMode()) {
    revalidatePath("/members");
    redirect("/members/demo-member-1");
  }

  const supabase = createSupabaseAdminClient();
  const { data: member, error: memberError } = await supabase
    .from("members")
    .insert({
      organization_id: staff.organization_id,
      name,
      phone,
      phone_last4: last4,
      pin_hash: hashMemberPin(staff.organization_id, phone, pin),
      birth_date: birthDate,
      status: "active",
      first_visit_date: startDate,
      memo
    })
    .select("id")
    .single();

  if (memberError || !member) {
    console.error("Failed to create member", {
      organizationId: staff.organization_id,
      code: memberError?.code,
      message: memberError?.message
    });
    failMemberCreate(memberError?.code === "PGRST204" ? "schema" : "member");
  }

  const { data: memberPass, error: passError } = await supabase
    .from("member_passes")
    .insert({
      organization_id: staff.organization_id,
      member_id: member.id,
      pass_name: pass.passName,
      service_type: serviceType,
      total_sessions: pass.totalSessions,
      used_sessions: 0,
      remaining_sessions: pass.totalSessions,
      start_date: startDate,
      end_date: pass.endDate,
      status: "active",
      created_by: staff.id
    })
    .select("id")
    .single();

  if (passError || !memberPass) {
    await supabase.from("members").delete().eq("id", member.id).eq("organization_id", staff.organization_id);
    console.error("Failed to create member pass", {
      organizationId: staff.organization_id,
      memberId: member.id,
      code: passError?.code,
      message: passError?.message
    });
    failMemberCreate(passError?.code === "PGRST204" ? "schema" : "pass");
  }

  try {
    await createAuditLog({
      organizationId: staff.organization_id,
      actorId: staff.id,
      action: "MEMBER_CREATED",
      entityType: "members",
      entityId: member.id,
      afterData: {
        name,
        phone_last4: last4,
        birth_date: birthDate,
        pass_name: pass.passName,
        member_pass_id: memberPass.id
      }
    });
  } catch (error) {
    console.error("Member was created, but audit log failed", { memberId: member.id, error });
  }

  revalidatePath("/members");
  revalidatePath("/dashboard");
  redirect(`/members/${member.id}`);
}

export async function updateMember(memberId: string, formData: FormData) {
  const staff = await requireStaffUser();
  const supabase = await createSupabaseServerClient();
  const phone = String(formData.get("phone") || "").trim();
  const pin = normalizePin(String(formData.get("pin") || ""));
  const patch: Record<string, unknown> = {
    name: String(formData.get("name") || "").trim(),
    phone,
    phone_last4: phoneLast4(phone),
    status: String(formData.get("status") || "active"),
    birth_date: String(formData.get("birth_date") || "") || null,
    memo: String(formData.get("memo") || "").trim() || null
  };

  if (pin) {
    if (!isValidMemberPin(pin)) throw new Error("개인 PIN 번호는 숫자 4~8자리로 입력해 주세요.");
    patch.pin_hash = hashMemberPin(staff.organization_id, phone, pin);
  }

  const { error } = await supabase
    .from("members")
    .update(patch)
    .eq("id", memberId)
    .eq("organization_id", staff.organization_id);

  if (error) throw new Error(error.message);

  await createAuditLog({
    organizationId: staff.organization_id,
    actorId: staff.id,
    action: "MEMBER_UPDATED",
    entityType: "members",
    entityId: memberId,
    afterData: { ...patch, phone: undefined, pin_hash: undefined }
  });

  revalidatePath(`/members/${memberId}`);
}
