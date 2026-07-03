import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MemberPass } from "@/lib/types";

export async function getActivePassesByMember(memberId: string, organizationId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("member_passes")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("member_id", memberId)
    .eq("status", "active")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data as MemberPass[];
}
