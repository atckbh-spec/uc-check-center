-- UC Check Center Operations setup part: 02_security_hardening.sql
-- Source: supabase/002_security_hardening.sql
-- Run this file by itself in Supabase SQL Editor.


-- UC Check security hardening migration
-- ?ㅽ뻾 ??Supabase DB 諛깆뾽 沅뚯옣

-- 1. 二쇱슂 議고쉶 ?몃뜳??create index if not exists idx_members_org_phone_last4_active
on public.members(organization_id, phone_last4)
where status = 'active';

create index if not exists idx_member_passes_member_status_remaining
on public.member_passes(member_id, status, remaining_sessions);

create index if not exists idx_attendance_org_date_status
on public.attendance_logs(organization_id, attendance_date, status);

create index if not exists idx_attendance_member_date_status
on public.attendance_logs(member_id, attendance_date, status);


-- 1-1. RLS helper ?⑥닔??staff_users RLS ?ш?瑜??쇳븯湲??꾪빐 security definer濡?怨좎젙?⑸땲??
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

-- 2. Staff actor 寃利?helper
create or replace function public.assert_staff_actor(
  p_actor_id uuid,
  p_allowed_roles text[] default null
)
returns public.staff_users
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.staff_users%rowtype;
begin
  if p_actor_id is null then
    raise exception '?ㅽ깭???뺣낫媛 ?놁뒿?덈떎.';
  end if;

  select * into v_actor
  from public.staff_users
  where id = p_actor_id
    and is_active = true;

  if not found then
    raise exception '?쒖꽦 ?ㅽ깭?꾨? 李얠쓣 ???놁뒿?덈떎.';
  end if;

  if v_actor.auth_user_id <> auth.uid() then
    raise exception '?ㅽ깭???몄쬆 ?뺣낫媛 ?쇱튂?섏? ?딆뒿?덈떎.';
  end if;

  if p_allowed_roles is not null and not (v_actor.role = any(p_allowed_roles)) then
    raise exception '沅뚰븳???놁뒿?덈떎.';
  end if;

  return v_actor;
end;
$$;

revoke execute on function public.assert_staff_actor(uuid, text[]) from public, anon, authenticated;

-- 3. 異쒖꽍 泥댄겕 ?⑥닔 蹂닿컯
create or replace function public.check_in_member(
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
  v_member public.members%rowtype;
  v_pass public.member_passes%rowtype;
  v_actor public.staff_users%rowtype;
  v_org uuid;
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_remaining_after integer;
  v_request_role text := coalesce(current_setting('request.jwt.claim.role', true), '');
begin
  if p_source not in ('staff','kiosk') then
    raise exception '異쒖꽍 異쒖쿂媛 ?щ컮瑜댁? ?딆뒿?덈떎.';
  end if;

  if p_source = 'staff' then
    v_actor := public.assert_staff_actor(p_actor_id, array['owner','admin','coach','front_desk']);
  end if;

  if p_source = 'kiosk' then
    if p_actor_id is not null then
      raise exception '?ㅼ삤?ㅽ겕 異쒖꽍? actor_id瑜?諛쏆쓣 ???놁뒿?덈떎.';
    end if;

    -- Kiosk 異쒖꽍? Next.js ?쒕쾭 ?≪뀡??service role client瑜??듯빐?쒕쭔 ?덉슜?⑸땲??
    if v_request_role <> 'service_role' then
      raise exception '?ㅼ삤?ㅽ겕 異쒖꽍? ?쒕쾭?먯꽌留?泥섎━?????덉뒿?덈떎.';
    end if;
  end if;

  select * into v_member
  from public.members
  where id = p_member_id
  for update;

  if not found or v_member.status <> 'active' then
    raise exception '異쒖꽍 媛?ν븳 ?뚯썝???꾨떃?덈떎.';
  end if;

  if p_source = 'staff' and v_actor.organization_id <> v_member.organization_id then
    raise exception '?ㅻⅨ 議곗쭅???뚯썝? 泥섎━?????놁뒿?덈떎.';
  end if;

  select * into v_pass
  from public.member_passes
  where id = p_member_pass_id
    and member_id = p_member_id
  for update;

  if not found then
    raise exception '?뚯썝沅뚯쓣 李얠쓣 ???놁뒿?덈떎.';
  end if;

  if v_pass.organization_id <> v_member.organization_id then
    raise exception '?뚯썝怨??뚯썝沅뚯쓽 議곗쭅 ?뺣낫媛 ?쇱튂?섏? ?딆뒿?덈떎.';
  end if;

  if v_pass.status <> 'active' then
    raise exception '?쒖꽦 ?뚯썝沅뚯씠 ?놁뒿?덈떎.';
  end if;

  if v_pass.end_date is not null and v_pass.end_date < v_today then
    raise exception '留뚮즺???뚯썝沅뚯엯?덈떎. ?ㅽ깭?꾩뿉寃?臾몄쓽??二쇱꽭??';
  end if;

  if v_pass.remaining_sessions <= 0 then
    raise exception '?붿뿬 ?잛닔媛 ?놁뒿?덈떎. ?ㅽ깭?꾩뿉寃?臾몄쓽??二쇱꽭??';
  end if;

  if exists (
    select 1
    from public.attendance_logs
    where member_id = p_member_id
      and member_pass_id = p_member_pass_id
      and attendance_date = v_today
      and status = 'checked_in'
  ) then
    raise exception '?ㅻ뒛 ?대? 異쒖꽍 泥섎━?섏뿀?듬땲??';
  end if;

  v_org := v_member.organization_id;
  v_remaining_after := v_pass.remaining_sessions - 1;

  insert into public.attendance_logs (
    organization_id,
    member_id,
    member_pass_id,
    checkin_at,
    attendance_date,
    service_type,
    status,
    source,
    deducted_sessions,
    checked_by
  ) values (
    v_org,
    p_member_id,
    p_member_pass_id,
    now(),
    v_today,
    v_pass.service_type,
    'checked_in',
    p_source,
    1,
    case when p_source = 'staff' then p_actor_id else null end
  );

  update public.member_passes
  set used_sessions = used_sessions + 1,
      remaining_sessions = v_remaining_after,
      status = case when v_remaining_after = 0 then 'used_up' else status end,
      updated_at = now()
  where id = p_member_pass_id;

  update public.members
  set last_visit_date = v_today,
      updated_at = now()
  where id = p_member_id;

  insert into public.audit_logs(
    organization_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    after_data
  ) values (
    v_org,
    case when p_source = 'staff' then p_actor_id else null end,
    case when p_source = 'kiosk' then 'KIOSK_CHECK_IN' else 'STAFF_CHECK_IN' end,
    'members',
    p_member_id,
    jsonb_build_object(
      'member_pass_id', p_member_pass_id,
      'remaining_after', v_remaining_after,
      'source', p_source
    )
  );

  return jsonb_build_object(
    'success', true,
    'message', '異쒖꽍 泥댄겕媛 ?꾨즺?섏뿀?듬땲??',
    'memberMaskedName', left(v_member.name, 1) || repeat('O', greatest(length(v_member.name) - 1, 1)),
    'passName', v_pass.pass_name,
    'remainingSessionsAfterCheckIn', v_remaining_after,
    'attendanceSessionNumber', v_pass.used_sessions + 1,
    'attendanceDate', v_today
  );
end;
$$;

-- 4. 異쒖꽍 痍⑥냼 ?⑥닔 蹂닿컯
create or replace function public.cancel_attendance(
  p_attendance_id uuid,
  p_reason text,
  p_actor_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_log public.attendance_logs%rowtype;
  v_actor public.staff_users%rowtype;
  v_reason text := trim(coalesce(p_reason, ''));
begin
  if char_length(v_reason) < 2 then
    raise exception '異쒖꽍 痍⑥냼 ?ъ쑀瑜??낅젰??二쇱꽭??';
  end if;

  v_actor := public.assert_staff_actor(p_actor_id, array['owner','admin']);

  select * into v_log
  from public.attendance_logs
  where id = p_attendance_id
  for update;

  if not found or v_log.status <> 'checked_in' then
    raise exception '痍⑥냼 媛?ν븳 異쒖꽍 湲곕줉???꾨떃?덈떎.';
  end if;

  if v_actor.organization_id <> v_log.organization_id then
    raise exception '?ㅻⅨ 議곗쭅??異쒖꽍 湲곕줉? 痍⑥냼?????놁뒿?덈떎.';
  end if;

  update public.attendance_logs
  set status = 'cancelled',
      cancelled_by = p_actor_id,
      cancelled_at = now(),
      memo = v_reason
  where id = p_attendance_id;

  if v_log.member_pass_id is not null and coalesce(v_log.deducted_sessions, 0) > 0 then
    update public.member_passes
    set used_sessions = greatest(used_sessions - v_log.deducted_sessions, 0),
        remaining_sessions = remaining_sessions + v_log.deducted_sessions,
        status = case when status = 'used_up' then 'active' else status end,
        updated_at = now()
    where id = v_log.member_pass_id;
  end if;

  insert into public.audit_logs(
    organization_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    before_data,
    after_data
  ) values (
    v_log.organization_id,
    p_actor_id,
    'ATTENDANCE_CANCELLED',
    'attendance_logs',
    p_attendance_id,
    to_jsonb(v_log),
    jsonb_build_object('reason', v_reason, 'restored_sessions', v_log.deducted_sessions)
  );
end;
$$;

-- 5. ?붿뿬 ?잛닔 議곗젙 ?⑥닔 蹂닿컯
create or replace function public.adjust_remaining_sessions(
  p_pass_id uuid,
  p_amount integer,
  p_reason text,
  p_actor_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pass public.member_passes%rowtype;
  v_actor public.staff_users%rowtype;
  v_reason text := trim(coalesce(p_reason, ''));
  v_new_remaining integer;
begin
  if char_length(v_reason) < 2 then
    raise exception '?붿뿬 ?잛닔 議곗젙 ?ъ쑀瑜??낅젰??二쇱꽭??';
  end if;

  if p_amount = 0 then
    raise exception '議곗젙 ?잛닔媛 0?낅땲??';
  end if;

  v_actor := public.assert_staff_actor(p_actor_id, array['owner','admin']);

  select * into v_pass
  from public.member_passes
  where id = p_pass_id
  for update;

  if not found then
    raise exception '?뚯썝沅뚯쓣 李얠쓣 ???놁뒿?덈떎.';
  end if;

  if v_actor.organization_id <> v_pass.organization_id then
    raise exception '?ㅻⅨ 議곗쭅???뚯썝沅뚯? ?섏젙?????놁뒿?덈떎.';
  end if;

  if v_pass.status = 'cancelled' then
    raise exception '痍⑥냼???뚯썝沅뚯? 議곗젙?????놁뒿?덈떎.';
  end if;

  v_new_remaining := least(v_pass.total_sessions, greatest(v_pass.remaining_sessions + p_amount, 0));

  update public.member_passes
  set remaining_sessions = v_new_remaining,
      used_sessions = greatest(total_sessions - v_new_remaining, 0),
      status = case
        when v_new_remaining = 0 then 'used_up'
        when status = 'used_up' and v_new_remaining > 0 then 'active'
        else status
      end,
      updated_at = now()
  where id = p_pass_id;

  insert into public.audit_logs(
    organization_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    before_data,
    after_data
  ) values (
    v_pass.organization_id,
    p_actor_id,
    'PASS_REMAINING_ADJUSTED',
    'member_passes',
    p_pass_id,
    to_jsonb(v_pass),
    jsonb_build_object('amount', p_amount, 'reason', v_reason, 'remaining_after', v_new_remaining)
  );
end;
$$;

-- 6. RPC ?ㅽ뻾 沅뚰븳 ?뺣━
revoke execute on function public.check_in_member(uuid, uuid, uuid, text) from public, anon;
revoke execute on function public.cancel_attendance(uuid, text, uuid) from public, anon;
revoke execute on function public.adjust_remaining_sessions(uuid, integer, text, uuid) from public, anon;

grant execute on function public.check_in_member(uuid, uuid, uuid, text) to authenticated, service_role;
grant execute on function public.cancel_attendance(uuid, text, uuid) to authenticated, service_role;
grant execute on function public.adjust_remaining_sessions(uuid, integer, text, uuid) to authenticated, service_role;

-- 7. Kiosk 議고쉶 ?쒕룄 濡쒓렇. Phase 1/2?먯꽌 ?ъ슜 媛??
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

create policy "staff can read kiosk attempt logs"
on public.kiosk_attempt_logs
for select
using (organization_id = public.current_staff_organization_id());

create policy "service can insert kiosk attempt logs"
on public.kiosk_attempt_logs
for insert
with check (true);
