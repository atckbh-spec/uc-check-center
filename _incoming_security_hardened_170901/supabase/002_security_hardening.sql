-- UC Check security hardening migration
-- 실행 전 Supabase DB 백업 권장

-- 1. 주요 조회 인덱스
create index if not exists idx_members_org_phone_last4_active
on public.members(organization_id, phone_last4)
where status = 'active';

create index if not exists idx_member_passes_member_status_remaining
on public.member_passes(member_id, status, remaining_sessions);

create index if not exists idx_attendance_org_date_status
on public.attendance_logs(organization_id, attendance_date, status);

create index if not exists idx_attendance_member_date_status
on public.attendance_logs(member_id, attendance_date, status);


-- 1-1. RLS helper 함수는 staff_users RLS 재귀를 피하기 위해 security definer로 고정합니다.
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

-- 2. Staff actor 검증 helper
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
    raise exception '스태프 정보가 없습니다.';
  end if;

  select * into v_actor
  from public.staff_users
  where id = p_actor_id
    and is_active = true;

  if not found then
    raise exception '활성 스태프를 찾을 수 없습니다.';
  end if;

  if v_actor.auth_user_id <> auth.uid() then
    raise exception '스태프 인증 정보가 일치하지 않습니다.';
  end if;

  if p_allowed_roles is not null and not (v_actor.role = any(p_allowed_roles)) then
    raise exception '권한이 없습니다.';
  end if;

  return v_actor;
end;
$$;

revoke execute on function public.assert_staff_actor(uuid, text[]) from public, anon, authenticated;

-- 3. 출석 체크 함수 보강
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
    raise exception '출석 출처가 올바르지 않습니다.';
  end if;

  if p_source = 'staff' then
    v_actor := public.assert_staff_actor(p_actor_id, array['owner','admin','coach','front_desk']);
  end if;

  if p_source = 'kiosk' then
    if p_actor_id is not null then
      raise exception '키오스크 출석은 actor_id를 받을 수 없습니다.';
    end if;

    -- Kiosk 출석은 Next.js 서버 액션의 service role client를 통해서만 허용합니다.
    if v_request_role <> 'service_role' then
      raise exception '키오스크 출석은 서버에서만 처리할 수 있습니다.';
    end if;
  end if;

  select * into v_member
  from public.members
  where id = p_member_id
  for update;

  if not found or v_member.status <> 'active' then
    raise exception '출석 가능한 회원이 아닙니다.';
  end if;

  if p_source = 'staff' and v_actor.organization_id <> v_member.organization_id then
    raise exception '다른 조직의 회원은 처리할 수 없습니다.';
  end if;

  select * into v_pass
  from public.member_passes
  where id = p_member_pass_id
    and member_id = p_member_id
  for update;

  if not found then
    raise exception '회원권을 찾을 수 없습니다.';
  end if;

  if v_pass.organization_id <> v_member.organization_id then
    raise exception '회원과 회원권의 조직 정보가 일치하지 않습니다.';
  end if;

  if v_pass.status <> 'active' then
    raise exception '활성 회원권이 없습니다.';
  end if;

  if v_pass.end_date is not null and v_pass.end_date < v_today then
    raise exception '만료된 회원권입니다. 스태프에게 문의해 주세요.';
  end if;

  if v_pass.remaining_sessions <= 0 then
    raise exception '잔여 횟수가 없습니다. 스태프에게 문의해 주세요.';
  end if;

  if exists (
    select 1
    from public.attendance_logs
    where member_id = p_member_id
      and member_pass_id = p_member_pass_id
      and attendance_date = v_today
      and status = 'checked_in'
  ) then
    raise exception '오늘 이미 출석 처리되었습니다.';
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
    'message', '출석 체크가 완료되었습니다.',
    'memberMaskedName', left(v_member.name, 1) || repeat('O', greatest(length(v_member.name) - 1, 1)),
    'passName', v_pass.pass_name,
    'remainingSessionsAfterCheckIn', v_remaining_after,
    'attendanceSessionNumber', v_pass.used_sessions + 1,
    'attendanceDate', v_today
  );
end;
$$;

-- 4. 출석 취소 함수 보강
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
    raise exception '출석 취소 사유를 입력해 주세요.';
  end if;

  v_actor := public.assert_staff_actor(p_actor_id, array['owner','admin']);

  select * into v_log
  from public.attendance_logs
  where id = p_attendance_id
  for update;

  if not found or v_log.status <> 'checked_in' then
    raise exception '취소 가능한 출석 기록이 아닙니다.';
  end if;

  if v_actor.organization_id <> v_log.organization_id then
    raise exception '다른 조직의 출석 기록은 취소할 수 없습니다.';
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

-- 5. 잔여 횟수 조정 함수 보강
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
    raise exception '잔여 횟수 조정 사유를 입력해 주세요.';
  end if;

  if p_amount = 0 then
    raise exception '조정 횟수가 0입니다.';
  end if;

  v_actor := public.assert_staff_actor(p_actor_id, array['owner','admin']);

  select * into v_pass
  from public.member_passes
  where id = p_pass_id
  for update;

  if not found then
    raise exception '회원권을 찾을 수 없습니다.';
  end if;

  if v_actor.organization_id <> v_pass.organization_id then
    raise exception '다른 조직의 회원권은 수정할 수 없습니다.';
  end if;

  if v_pass.status = 'cancelled' then
    raise exception '취소된 회원권은 조정할 수 없습니다.';
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

-- 6. RPC 실행 권한 정리
revoke execute on function public.check_in_member(uuid, uuid, uuid, text) from public, anon;
revoke execute on function public.cancel_attendance(uuid, text, uuid) from public, anon;
revoke execute on function public.adjust_remaining_sessions(uuid, integer, text, uuid) from public, anon;

grant execute on function public.check_in_member(uuid, uuid, uuid, text) to authenticated, service_role;
grant execute on function public.cancel_attendance(uuid, text, uuid) to authenticated, service_role;
grant execute on function public.adjust_remaining_sessions(uuid, integer, text, uuid) to authenticated, service_role;

-- 7. Kiosk 조회 시도 로그. Phase 1/2에서 사용 가능.
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
