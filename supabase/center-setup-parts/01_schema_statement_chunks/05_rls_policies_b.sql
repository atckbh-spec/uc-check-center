create policy "staff can read member passes" on member_passes
for select
using (organization_id = public.current_staff_organization_id());
create policy "ops staff can create member passes" on member_passes
for insert
with check (
  organization_id = public.current_staff_organization_id()
  and public.current_staff_role() in ('owner','admin','front_desk')
);
create policy "admins can update member passes" on member_passes
for update
using (organization_id = public.current_staff_organization_id() and public.current_staff_role() in ('owner','admin'))
with check (organization_id = public.current_staff_organization_id() and public.current_staff_role() in ('owner','admin'));
create policy "staff can read attendance" on attendance_logs
for select
using (organization_id = public.current_staff_organization_id());
create policy "staff can insert no show attendance" on attendance_logs
for insert
with check (
  organization_id = public.current_staff_organization_id()
  and source = 'staff'
  and status = 'no_show'
  and checked_by = public.current_staff_id()
);
create policy "staff can read notes" on member_notes
for select
using (organization_id = public.current_staff_organization_id());
create policy "staff can create notes" on member_notes
for insert
with check (
  organization_id = public.current_staff_organization_id()
  and created_by = public.current_staff_id()
);
create policy "note authors and admins can update notes" on member_notes
for update
using (
  organization_id = public.current_staff_organization_id()
  and (created_by = public.current_staff_id() or public.current_staff_role() in ('owner','admin'))
)
with check (
  organization_id = public.current_staff_organization_id()
  and (created_by = public.current_staff_id() or public.current_staff_role() in ('owner','admin'))
);
create policy "admins can read audit" on audit_logs
for select
using (organization_id = public.current_staff_organization_id() and public.current_staff_role() in ('owner','admin'));
create policy "staff can insert audit" on audit_logs
for insert
with check (organization_id = public.current_staff_organization_id() and actor_id = public.current_staff_id());
