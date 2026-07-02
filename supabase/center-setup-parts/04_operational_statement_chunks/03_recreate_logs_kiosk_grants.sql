create policy "staff can read attendance" on public.attendance_logs
for select
using (organization_id = public.current_staff_organization_id());
create policy "staff can insert no show attendance" on public.attendance_logs
for insert
with check (
  organization_id = public.current_staff_organization_id()
  and source = 'staff'
  and status = 'no_show'
  and checked_by = public.current_staff_id()
);
create policy "staff can read notes" on public.member_notes
for select
using (organization_id = public.current_staff_organization_id());
create policy "staff can create notes" on public.member_notes
for insert
with check (
  organization_id = public.current_staff_organization_id()
  and created_by = public.current_staff_id()
);
create policy "note authors and admins can update notes" on public.member_notes
for update
using (
  organization_id = public.current_staff_organization_id()
  and (created_by = public.current_staff_id() or public.current_staff_role() in ('owner','admin'))
)
with check (
  organization_id = public.current_staff_organization_id()
  and (created_by = public.current_staff_id() or public.current_staff_role() in ('owner','admin'))
);
create policy "admins can read audit" on public.audit_logs
for select
using (organization_id = public.current_staff_organization_id() and public.current_staff_role() in ('owner','admin'));
create policy "staff can insert audit" on public.audit_logs
for insert
with check (organization_id = public.current_staff_organization_id() and actor_id = public.current_staff_id());
create table if not exists public.kiosk_attempt_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  phone_last4 text,
  result text not null check (result in ('found','not_found','too_many','blocked','checked_in','pin_failed','error')),
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now()
);
alter table public.kiosk_attempt_logs drop constraint if exists kiosk_attempt_logs_result_check;
alter table public.kiosk_attempt_logs add constraint kiosk_attempt_logs_result_check
check (result in ('found','not_found','too_many','blocked','checked_in','pin_failed','error'));
alter table public.kiosk_attempt_logs enable row level security;
revoke all on table public.kiosk_attempt_logs from anon, authenticated;
grant select on table public.kiosk_attempt_logs to authenticated;
grant insert on table public.kiosk_attempt_logs to service_role;
drop policy if exists "staff can read kiosk attempt logs" on public.kiosk_attempt_logs;
drop policy if exists "service can insert kiosk attempt logs" on public.kiosk_attempt_logs;
create policy "staff can read kiosk attempt logs" on public.kiosk_attempt_logs
for select
using (organization_id = public.current_staff_organization_id());
create policy "service can insert kiosk attempt logs" on public.kiosk_attempt_logs
for insert
with check (true);
revoke execute on function public.check_in_member(uuid, uuid, uuid, text) from public, anon;
revoke execute on function public.cancel_attendance(uuid, text, uuid) from public, anon;
revoke execute on function public.adjust_remaining_sessions(uuid, integer, text, uuid) from public, anon;
grant execute on function public.check_in_member(uuid, uuid, uuid, text) to authenticated, service_role;
grant execute on function public.cancel_attendance(uuid, text, uuid) to authenticated, service_role;
grant execute on function public.adjust_remaining_sessions(uuid, integer, text, uuid) to authenticated, service_role;
