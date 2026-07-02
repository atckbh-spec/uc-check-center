-- UC Check operations UI support indexes and duplicate protection
-- Apply after 004_operational_hardening.sql.

create index if not exists idx_member_notes_org_member_pinned_created
on public.member_notes(organization_id, member_id, is_pinned desc, created_at desc);

create index if not exists idx_attendance_logs_org_member_status_checkin
on public.attendance_logs(organization_id, member_id, status, checkin_at desc);

-- Prevent repeated no-show entries for the same member/pass/date.
-- member_pass_id may be null, so an expression index is used for stable duplicate protection.
create unique index if not exists attendance_no_duplicate_no_show
on public.attendance_logs(
  member_id,
  coalesce(member_pass_id, '00000000-0000-0000-0000-000000000000'::uuid),
  attendance_date
)
where status = 'no_show';
