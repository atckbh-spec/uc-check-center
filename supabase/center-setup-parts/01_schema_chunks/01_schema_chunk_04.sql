-- UC Check 01_schema chunk 4
-- Run this chunk by itself, then continue with the next chunk.

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

create or replace function check_in_member(
  p_member_id uuid,
  p_member_pass_id uuid,
  p_actor_id uuid,
  p_source text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member members%rowtype;
  v_pass member_passes%rowtype;
  v_actor staff_users%rowtype;
  v_org uuid;
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_remaining_after integer;
begin
  if p_source not in ('staff','kiosk') then
    raise exception 'Invalid check-in source.';
  end if;

  if p_source = 'staff' then
    if p_actor_id is null then
      raise exception '?ㅽ깭??異쒖꽍 泥댄겕?먮뒗 泥섎━???뺣낫媛 ?꾩슂?⑸땲??';
    end if;

    select * into v_actor from staff_users
    where id = p_actor_id and is_active = true;

    if not found then
      raise exception '?쒖꽦 ?ㅽ깭??怨꾩젙???뺤씤?????놁뒿?덈떎.';
    end if;
  end if;

  if p_source = 'kiosk' and p_actor_id is not null then
    raise exception '?ㅼ삤?ㅽ겕 異쒖꽍 泥댄겕?먮뒗 ?ㅽ깭??泥섎━?먮? 吏?뺥븷 ???놁뒿?덈떎.';
  end if;
