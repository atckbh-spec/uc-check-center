-- UC Check Demo 2 Staff Command dashboard performance indexes
-- Safe to run multiple times. These indexes help dashboard cards and priority lists load quickly.

create index if not exists idx_attendance_org_date_status_source
on attendance_logs(organization_id, attendance_date, status, source);

create index if not exists idx_attendance_org_date_checkin_desc
on attendance_logs(organization_id, attendance_date, checkin_at desc);

create index if not exists idx_member_passes_org_status_remaining
on member_passes(organization_id, status, remaining_sessions);

create index if not exists idx_members_org_status_last_visit
on members(organization_id, status, last_visit_date);
