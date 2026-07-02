"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAuditLog } from "@/lib/audit/actions";
import { requireRole, requireStaffUser } from "@/lib/auth/require-staff";
import { isDemoMode } from "@/lib/config/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { addDaysInKorea, todayInKorea } from "@/lib/utils/format-date";
import { hashMemberPin, isValidMemberPin, normalizePin } from "@/lib/utils/member-pin";
import { phoneLast4 } from "@/lib/utils/mask-phone";

const allowedNoteTypes = new Set(["general", "renewal", "schedule", "payment", "risk"]);

function resolvePassMode(mode: string, startDate: string) {
  if (mode === "20_sessions") {
    return { passName: "20회 등록권", totalSessions: 20, endDate: null };
  }
  if (mode === "monthly") {
    return { passName: "한달 등록권", totalSessions: 999, endDate: addDaysInKorea(startDate, 30) };
  }
  return { passName: "10회 등록권", totalSessions: 10, endDate: null };
}

export async function createMember(formData: FormData) {
  const staff = await requireRole(["owner", "admin", "front_desk"]);
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

  if (!name || last4.length !== 4) {
    throw new Error("이름과 휴대폰 번호를 확인해 주세요.");
  }
  if (!isValidMemberPin(pin)) {
    throw new Error("개인 PIN 번호는 숫자 4~8자리로 입력해 주세요.");
  }

  if (isDemoMode()) {
    revalidatePath("/members");
    redirect("/members/demo-member-1");
  }

  const supabase = await createSupabaseServerClient();
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

  if (memberError) throw new Error(memberError.message);

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

  if (passError) {
    await supabase.from("members").delete().eq("id", member.id).eq("organization_id", staff.organization_id);
    throw new Error(passError.message);
  }

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

  revalidatePath("/members");
  revalidatePath("/dashboard");
  redirect(`/members/${member.id}`);
}

export async function updateMember(memberId: string, formData: FormData) {
  const staff = await requireRole(["owner", "admin", "front_desk"]);
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
  revalidatePath("/members");
}

export async function createMemberNote(memberId: string, formData: FormData) {
  const staff = await requireStaffUser();
  const noteType = String(formData.get("note_type") || "general");
  const content = String(formData.get("content") || "").trim();
  const isPinned = String(formData.get("is_pinned") || "") === "on";

  if (!allowedNoteTypes.has(noteType)) {
    throw new Error("지원하지 않는 메모 유형입니다.");
  }
  if (content.length < 2) {
    throw new Error("메모 내용을 2자 이상 입력해 주세요.");
  }

  if (isDemoMode()) {
    revalidatePath(`/members/${memberId}`);
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { data: member, error: memberError } = await supabase
    .from("members")
    .select("id")
    .eq("id", memberId)
    .eq("organization_id", staff.organization_id)
    .single();

  if (memberError || !member) throw new Error("현재 조직 소속 회원을 찾을 수 없습니다.");

  const { data: note, error } = await supabase
    .from("member_notes")
    .insert({
      organization_id: staff.organization_id,
      member_id: memberId,
      note_type: noteType,
      content,
      is_pinned: isPinned,
      created_by: staff.id
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await createAuditLog({
    organizationId: staff.organization_id,
    actorId: staff.id,
    action: "MEMBER_NOTE_CREATED",
    entityType: "member_notes",
    entityId: note.id,
    afterData: {
      member_id: memberId,
      note_type: noteType,
      is_pinned: isPinned
    }
  });

  revalidatePath(`/members/${memberId}`);
  revalidatePath("/dashboard");
}
