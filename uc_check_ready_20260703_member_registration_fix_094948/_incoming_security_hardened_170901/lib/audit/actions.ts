"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function createAuditLog(input: {
  organizationId: string;
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  beforeData?: unknown;
  afterData?: unknown;
}) {
  const supabase = await createSupabaseServerClient();
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
    throw new Error(`감사 로그 저장 실패: ${error.message}`);
  }
}
