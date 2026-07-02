create policy "staff can read own organization" on public.organizations
for select
using (id = public.current_staff_organization_id());
create policy "staff can read staff in organization" on public.staff_users
for select
using (organization_id = public.current_staff_organization_id());
create policy "owners can manage staff in organization" on public.staff_users
for update
using (organization_id = public.current_staff_organization_id() and public.current_staff_role() = 'owner')
with check (organization_id = public.current_staff_organization_id() and public.current_staff_role() = 'owner');
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
create policy "staff can read pass templates" on public.pass_templates
for select
using (organization_id = public.current_staff_organization_id());
create policy "admins can manage pass templates" on public.pass_templates
for all
using (organization_id = public.current_staff_organization_id() and public.current_staff_role() in ('owner','admin'))
with check (organization_id = public.current_staff_organization_id() and public.current_staff_role() in ('owner','admin'));
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
