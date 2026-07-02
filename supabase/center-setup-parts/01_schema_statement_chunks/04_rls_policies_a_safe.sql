drop policy if exists "staff can read own organization" on organizations;
drop policy if exists "staff can read staff in organization" on staff_users;
drop policy if exists "owners can manage staff in organization" on staff_users;
drop policy if exists "staff can read members" on members;
drop policy if exists "ops staff can create members" on members;
drop policy if exists "ops staff can update members" on members;
drop policy if exists "staff can read pass templates" on pass_templates;
drop policy if exists "admins can manage pass templates" on pass_templates;
alter table organizations enable row level security;
alter table staff_users enable row level security;
alter table members enable row level security;
alter table pass_templates enable row level security;
alter table member_passes enable row level security;
alter table attendance_logs enable row level security;
alter table member_notes enable row level security;
alter table audit_logs enable row level security;
create policy "staff can read own organization" on organizations
for select
using (id = public.current_staff_organization_id());
create policy "staff can read staff in organization" on staff_users
for select
using (organization_id = public.current_staff_organization_id());
create policy "owners can manage staff in organization" on staff_users
for update
using (organization_id = public.current_staff_organization_id() and public.current_staff_role() = 'owner')
with check (organization_id = public.current_staff_organization_id() and public.current_staff_role() = 'owner');
create policy "staff can read members" on members
for select
using (organization_id = public.current_staff_organization_id());
create policy "ops staff can create members" on members
for insert
with check (
  organization_id = public.current_staff_organization_id()
  and public.current_staff_role() in ('owner','admin','front_desk')
);
create policy "ops staff can update members" on members
for update
using (
  organization_id = public.current_staff_organization_id()
  and public.current_staff_role() in ('owner','admin','front_desk')
)
with check (
  organization_id = public.current_staff_organization_id()
  and public.current_staff_role() in ('owner','admin','front_desk')
);
create policy "staff can read pass templates" on pass_templates
for select
using (organization_id = public.current_staff_organization_id());
create policy "admins can manage pass templates" on pass_templates
for all
using (organization_id = public.current_staff_organization_id() and public.current_staff_role() in ('owner','admin'))
with check (organization_id = public.current_staff_organization_id() and public.current_staff_role() in ('owner','admin'));
