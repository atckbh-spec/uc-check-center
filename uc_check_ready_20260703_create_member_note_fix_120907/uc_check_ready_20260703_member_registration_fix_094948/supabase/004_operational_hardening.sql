-- UC Check operational hardening migration
-- 목적:
-- 1) staff_users RLS 재귀를 막기 위해 RLS helper를 security definer로 고정
-- 2) MVP 초기 broad "for all manage" policy를 역할별 policy로 세분화
-- 3) kiosk_attempt_logs policy를 CREATE POLICY IF NOT EXISTS 없이 안전하게 재생성
-- 4) 핵심 RPC 실행 권한을 명시적으로 정리

-- RLS helper functions
create or replace function public.current_staff_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from public.staff_users
  where auth_user_id = auth.uid()
    and is_active = true
  limit 1
$$;

create or replace function public.current_staff_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.staff_users
  where auth_user_id = auth.uid()
    and is_active = true
  limit 1
$$;

create or replace function public.current_staff_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.staff_users
  where auth_user_id = auth.uid()
    and is_active = true
  limit 1
$$;

revoke execute on function public.current_staff_organization_id() from public, anon;
revoke execute on function public.current_staff_role() from public, anon;
revoke execute on function public.current_staff_id() from public, anon;
grant execute on function public.current_staff_organization_id() to authenticated, service_role;
grant execute on function public.current_staff_role() to authenticated, service_role;
grant execute on function public.current_staff_id() to authenticated, service_role;

-- Ensure RLS is enabled
alter table public.organizations enable row level security;
alter table public.staff_users enable row level security;
alter table public.members enable row level security;
alter table public.pass_templates enable row level security;
alter table public.member_passes enable row level security;
alter table public.attendance_logs enable row level security;
alter table public.member_notes enable row level security;
alter table public.audit_logs enable row level security;

-- Drop legacy broad policies
drop policy if exists "staff can read own organization" on public.organizations;
drop policy if exists "staff can read staff" on public.staff_users;
drop policy if exists "staff can manage members" on public.members;
drop policy if exists "staff can manage pass templates" on public.pass_templates;
drop policy if exists "staff can manage member passes" on public.member_passes;
drop policy if exists "staff can manage attendance" on public.attendance_logs;
drop policy if exists "staff can manage notes" on public.member_notes;
drop policy if exists "staff can read audit" on public.audit_logs;
drop policy if exists "staff can insert audit" on public.audit_logs;

-- Drop prior hardened policies before recreating them idempotently
drop policy if exists "staff can read staff in organization" on public.staff_users;
drop policy if exists "owners can manage staff in organization" on public.staff_users;
drop policy if exists "staff can read members" on public.members;
drop policy if exists "staff can create members" on public.members;
drop policy if exists "staff can update members" on public.members;
drop policy if exists "owners and admins can delete members" on public.members;
drop policy if exists "ops staff can create members" on public.members;
drop policy if exists "ops staff can update members" on public.members;
drop policy if exists "staff can read pass templates" on public.pass_templates;
drop policy if exists "admins can manage pass templates" on public.pass_templates;
drop policy if exists "admins can create pass templates" on public.pass_templates;
drop policy if exists "admins can update pass templates" on public.pass_templates;
drop policy if exists "owners admins can create pass templates" on public.pass_templates;
drop policy if exists "owners admins can update pass templates" on public.pass_templates;
drop policy if exists "staff can read member passes" on public.member_passes;
drop policy if exists "staff can create member passes" on public.member_passes;
drop policy if exists "owners admins can update member passes" on public.member_passes;
drop policy if exists "owners admins can delete member passes" on public.member_passes;
drop policy if exists "ops staff can create member passes" on public.member_passes;
drop policy if exists "admins can update member passes" on public.member_passes;
drop policy if exists "staff can read attendance" on public.attendance_logs;
drop policy if exists "staff can create attendance" on public.attendance_logs;
drop policy if exists "owners admins can update attendance" on public.attendance_logs;
drop policy if exists "owners admins can delete attendance" on public.attendance_logs;
drop policy if exists "staff can insert no show attendance" on public.attendance_logs;
drop policy if exists "staff can read notes" on public.member_notes;
drop policy if exists "staff can create notes" on public.member_notes;
drop policy if exists "staff can update own notes" on public.member_notes;
drop policy if exists "note authors and admins can update notes" on public.member_notes;
drop policy if exists "owners admins can read audit" on public.audit_logs;
drop policy if exists "admins can read audit" on public.audit_logs;

-- Organizations
create policy "staff can read own organization" on public.organizations
for select
using (id = public.current_staff_organization_id());

-- Staff users
create policy "staff can read staff in organization" on public.staff_users
for select
using (organization_id = public.current_staff_organization_id());

create policy "owners can manage staff in organization" on public.staff_users
for update
using (organization_id = public.current_staff_organization_id() and public.current_staff_role() = 'owner')
with check (organization_id = public.current_staff_organization_id() and public.current_staff_role() = 'owner');

-- Members
create policy "staff can read members" on public.members
for select
using (organization_id = public.current_staff_organization_id());

create policy "ops staff can create members" on public.members
for insert
with check (
  organization_id = public.current_staff_organization_id()
  and public.current_staff_role() in ('owner','admin','front_desk')
);

create policy "ops staff can update members" on public.members
for update
using (
  organization_id = public.current_staff_organization_id()
  and public.current_staff_role() in ('owner','admin','front_desk')
)
with check (
  organization_id = public.current_staff_organization_id()
  and public.current_staff_role() in ('owner','admin','front_desk')
);

-- Pass templates
create policy "staff can read pass templates" on public.pass_templates
for select
using (organization_id = public.current_staff_organization_id());

create policy "admins can create pass templates" on public.pass_templates
for insert
with check (organization_id = public.current_staff_organization_id() and public.current_staff_role() in ('owner','admin'));

create policy "admins can update pass templates" on public.pass_templates
for update
using (organization_id = public.current_staff_organization_id() and public.current_staff_role() in ('owner','admin'))
with check (organization_id = public.current_staff_organization_id() and public.current_staff_role() in ('owner','admin'));

-- Member passes
create policy "staff can read member passes" on public.member_passes
for select
using (organization_id = public.current_staff_organization_id());

create policy "ops staff can create member passes" on public.member_passes
for insert
with check (
  organization_id = public.current_staff_organization_id()
  and public.current_staff_role() in ('owner','admin','front_desk')
);

create policy "admins can update member passes" on public.member_passes
for update
using (organization_id = public.current_staff_organization_id() and public.current_staff_role() in ('owner','admin'))
with check (organization_id = public.current_staff_organization_id() and public.current_staff_role() in ('owner','admin'));

-- Attendance logs
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

-- Member notes
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

-- Audit logs
create policy "admins can read audit" on public.audit_logs
for select
using (organization_id = public.current_staff_organization_id() and public.current_staff_role() in ('owner','admin'));

create policy "staff can insert audit" on public.audit_logs
for insert
with check (organization_id = public.current_staff_organization_id() and actor_id = public.current_staff_id());

-- Kiosk attempt logs
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

-- RPC execute grants
revoke execute on function public.check_in_member(uuid, uuid, uuid, text) from public, anon;
revoke execute on function public.cancel_attendance(uuid, text, uuid) from public, anon;
revoke execute on function public.adjust_remaining_sessions(uuid, integer, text, uuid) from public, anon;

grant execute on function public.check_in_member(uuid, uuid, uuid, text) to authenticated, service_role;
grant execute on function public.cancel_attendance(uuid, text, uuid) to authenticated, service_role;
grant execute on function public.adjust_remaining_sessions(uuid, integer, text, uuid) to authenticated, service_role;
