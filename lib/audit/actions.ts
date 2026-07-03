"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function createAuditLog(input: {
  organizationId: string;
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  beforeData?: unknown;
  afterData?: unknown;
}) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("audit_logs").insert({
    organization_id: input.organizationId,
    actor_id: input.actorId ?? null,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    before_data: input.beforeData ?? null,
    after_data: input.afterData ?? null
  });

  if (error) {
    console.error("Failed to create audit log", {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      error
    });
    throw new Error("감사 로그를 저장하지 못했습니다.");
  }
}
