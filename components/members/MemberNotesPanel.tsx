import { MessageSquarePlus, Pin } from "lucide-react";
import { createMemberNote } from "@/lib/members/actions";
import type { MemberNote, StaffUser } from "@/lib/types";
import { formatKoreanDateTime } from "@/lib/utils/format-date";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const noteTypeLabel: Record<string, string> = {
  general: "일반",
  renewal: "재등록",
  schedule: "일정",
  payment: "결제",
  risk: "주의"
};

const noteTypeClass: Record<string, string> = {
  general: "bg-gray-100 text-gray-700",
  renewal: "bg-[#fff1e8] text-action",
  schedule: "bg-brand-soft text-brand-dark",
  payment: "bg-gray-100 text-gray-700",
  risk: "bg-[#fff1e8] text-action"
};

export function MemberNotesPanel({ memberId, notes, staffUsers }: { memberId: string; notes: MemberNote[]; staffUsers: StaffUser[] }) {
  const staffNameById = new Map(staffUsers.map((staff) => [staff.id, staff.name]));

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-ink">회원 메모 타임라인</h2>
          <p className="mt-1 text-sm text-muted">재등록, 일정, 주의사항을 스태프 전용으로 남깁니다.</p>
        </div>
        <Badge className="bg-brand-soft text-brand-dark">{notes.length}개</Badge>
      </div>

      <form action={createMemberNote.bind(null, memberId)} className="mt-4 rounded-md border border-line bg-surface p-4">
        <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
          <select name="note_type" defaultValue="general" className="focus-ring h-11 rounded-md border border-line bg-white px-3">
            <option value="general">일반</option>
            <option value="renewal">재등록</option>
            <option value="schedule">일정</option>
            <option value="payment">결제</option>
            <option value="risk">주의</option>
          </select>
          <Input name="content" minLength={2} placeholder="예: 잔여 3회 진입 시 재등록 상담 진행" required />
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-muted">
          <input name="is_pinned" type="checkbox" className="size-4 rounded border-line" />
          상단 고정 메모로 표시
        </label>
        <Button type="submit" className="mt-3 w-full sm:w-auto">
          <MessageSquarePlus className="size-4" />
          메모 저장
        </Button>
      </form>

      <div className="mt-5 divide-y divide-line">
        {notes.map((note) => (
          <div key={note.id} className="py-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={noteTypeClass[note.note_type] ?? noteTypeClass.general}>{noteTypeLabel[note.note_type] ?? note.note_type}</Badge>
              {note.is_pinned ? (
                <Badge className="bg-brand text-white">
                  <Pin className="mr-1 size-3" />
                  고정
                </Badge>
              ) : null}
              <span className="text-xs text-muted">
                {formatKoreanDateTime(note.created_at)} · {note.created_by ? staffNameById.get(note.created_by) ?? "스태프" : "시스템"}
              </span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink">{note.content}</p>
          </div>
        ))}
        {notes.length === 0 ? <div className="py-5 text-sm text-muted">아직 등록된 메모가 없습니다.</div> : null}
      </div>
    </Card>
  );
}
