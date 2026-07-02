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
alter table public.organizations enable row level security;
alter table public.staff_users enable row level security;
alter table public.members enable row level security;
alter table public.pass_templates enable row level security;
alter table public.member_passes enable row level security;
alter table public.attendance_logs enable row level security;
alter table public.member_notes enable row level security;
alter table public.audit_logs enable row level security;
drop policy if exists "staff can read own organization" on public.organizations;
drop policy if exists "staff can read staff" on public.staff_users;
drop policy if exists "staff can manage members" on public.members;
drop policy if exists "staff can manage pass templates" on public.pass_templates;
drop policy if exists "staff can manage member passes" on public.member_passes;
drop policy if exists "staff can manage attendance" on public.attendance_logs;
drop policy if exists "staff can manage notes" on public.member_notes;
drop policy if exists "staff can read audit" on public.audit_logs;
drop policy if exists "staff can insert audit" on public.audit_logs;
drop policy if exists "staff can read staff in organization" on public.staff_users;
drop policy if exists "owners can manage staff in organization" on public.staff_users;
drop policy if exists "staff can read members" on public.members;
drop policy if exists "ops staff can create members" on public.members;
drop policy if exists "ops staff can update members" on public.members;
drop policy if exists "staff can read pass templates" on public.pass_templates;
drop policy if exists "admins can manage pass templates" on public.pass_templates;
drop policy if exists "staff can read member passes" on public.member_passes;
drop policy if exists "ops staff can create member passes" on public.member_passes;
drop policy if exists "admins can update member passes" on public.member_passes;
drop policy if exists "staff can read attendance" on public.attendance_logs;
drop policy if exists "staff can insert no show attendance" on public.attendance_logs;
drop policy if exists "staff can read notes" on public.member_notes;
drop policy if exists "staff can create notes" on public.member_notes;
drop policy if exists "note authors and admins can update notes" on public.member_notes;
drop policy if exists "admins can read audit" on public.audit_logs;
