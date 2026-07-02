create extension if not exists "pgcrypto";

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists staff_users (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null check (role in ('owner','admin','coach','front_desk')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  phone text not null,
  phone_last4 text not null,
  birth_date date,
  gender text,
  status text not null default 'active' check (status in ('active','inactive','paused','archived')),
  assigned_coach_id uuid references staff_users(id),
  first_visit_date date,
  last_visit_date date,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pass_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  default_total_sessions integer not null check (default_total_sessions > 0),
  default_valid_days integer,
  service_type text not null check (service_type in ('pt','conditioning','group','trial','other')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists member_passes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  pass_template_id uuid references pass_templates(id),
  pass_name text not null,
  service_type text not null check (service_type in ('pt','conditioning','group','trial','other')),
  total_sessions integer not null check (total_sessions >= 0),
  used_sessions integer not null default 0 check (used_sessions >= 0),
  remaining_sessions integer not null check (remaining_sessions >= 0),
  start_date date not null,
  end_date date,
  status text not null default 'active' check (status in ('active','paused','expired','used_up','cancelled')),
  assigned_coach_id uuid references staff_users(id),
  created_by uuid references staff_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists attendance_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  member_pass_id uuid references member_passes(id),
  checkin_at timestamptz not null default now(),
  attendance_date date not null,
  service_type text check (service_type in ('pt','conditioning','group','trial','other')),
  status text not null check (status in ('checked_in','cancelled','no_show','manual_adjustment')),
  source text not null check (source in ('staff','kiosk','system')),
  deducted_sessions integer not null default 1,
  checked_by uuid references staff_users(id),
  cancelled_by uuid references staff_users(id),
  cancelled_at timestamptz,
  memo text,
  created_at timestamptz not null default now()
);

create unique index if not exists attendance_no_duplicate_checked_in
on attendance_logs(member_id, member_pass_id, attendance_date)
where status = 'checked_in';

create table if not exists member_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  note_type text not null check (note_type in ('general','renewal','schedule','payment','risk')),
  content text not null,
  is_pinned boolean not null default false,
  created_by uuid references staff_users(id),
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  actor_id uuid references staff_users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

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
      raise exception '스태프 출석 체크에는 처리자 정보가 필요합니다.';
    end if;

    select * into v_actor from staff_users
    where id = p_actor_id and is_active = true;

    if not found then
      raise exception '활성 스태프 계정을 확인할 수 없습니다.';
    end if;
  end if;

  if p_source = 'kiosk' and p_actor_id is not null then
    raise exception '키오스크 출석 체크에는 스태프 처리자를 지정할 수 없습니다.';
  end if;

  select * into v_member from members where id = p_member_id for update;
  if not found or v_member.status <> 'active' then
    raise exception '출석 가능한 회원이 아닙니다.';
  end if;

  select * into v_pass from member_passes where id = p_member_pass_id and member_id = p_member_id for update;
  if not found or v_pass.status <> 'active' then
    raise exception '활성 회원권이 없습니다.';
  end if;

  if v_pass.organization_id <> v_member.organization_id then
    raise exception '회원과 회원권의 센터 정보가 일치하지 않습니다.';
  end if;

  if p_source = 'staff' and v_actor.organization_id <> v_member.organization_id then
    raise exception '다른 센터 회원은 출석 처리할 수 없습니다.';
  end if;

  if v_pass.remaining_sessions <= 0 then
    raise exception '잔여 횟수가 없습니다. 스태프에게 문의해 주세요.';
  end if;

  if exists (
    select 1 from attendance_logs
    where member_id = p_member_id
      and member_pass_id = p_member_pass_id
      and attendance_date = v_today
      and status = 'checked_in'
  ) then
    raise exception '오늘 이미 출석 처리되었습니다.';
  end if;

  v_org := v_member.organization_id;
  v_remaining_after := v_pass.remaining_sessions - 1;

  insert into attendance_logs (
    organization_id, member_id, member_pass_id, checkin_at, attendance_date,
    service_type, status, source, deducted_sessions, checked_by
  ) values (
    v_org, p_member_id, p_member_pass_id, now(), v_today,
    v_pass.service_type, 'checked_in', p_source, 1, p_actor_id
  );

  update member_passes
  set used_sessions = used_sessions + 1,
      remaining_sessions = remaining_sessions - 1,
      status = case when remaining_sessions - 1 = 0 then 'used_up' else status end,
      updated_at = now()
  where id = p_member_pass_id;

  update members
  set last_visit_date = v_today,
      updated_at = now()
  where id = p_member_id;

  insert into audit_logs(organization_id, actor_id, action, entity_type, entity_id, after_data)
  values (v_org, p_actor_id, case when p_source = 'kiosk' then 'KIOSK_CHECK_IN' else 'STAFF_CHECK_IN' end, 'members', p_member_id,
    jsonb_build_object('member_pass_id', p_member_pass_id, 'remaining_after', v_remaining_after, 'source', p_source));

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

create or replace function cancel_attendance(p_attendance_id uuid, p_reason text, p_actor_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_log attendance_logs%rowtype;
  v_actor staff_users%rowtype;
begin
  select * into v_actor from staff_users
  where id = p_actor_id and is_active = true and role in ('owner','admin');

  if not found then
    raise exception '출석 취소 권한이 없습니다.';
  end if;

  select * into v_log from attendance_logs where id = p_attendance_id for update;
  if not found or v_log.status <> 'checked_in' then
    raise exception '취소 가능한 출석 기록이 아닙니다.';
  end if;

  if v_actor.organization_id <> v_log.organization_id then
    raise exception '다른 센터의 출석 기록은 취소할 수 없습니다.';
  end if;

  update attendance_logs
  set status = 'cancelled', cancelled_by = p_actor_id, cancelled_at = now(), memo = p_reason
  where id = p_attendance_id;

  update member_passes
  set used_sessions = greatest(used_sessions - 1, 0),
      remaining_sessions = remaining_sessions + 1,
      status = case when status = 'used_up' then 'active' else status end,
      updated_at = now()
  where id = v_log.member_pass_id;

  insert into audit_logs(organization_id, actor_id, action, entity_type, entity_id, before_data, after_data)
  values (v_log.organization_id, p_actor_id, 'ATTENDANCE_CANCELLED', 'attendance_logs', p_attendance_id,
    to_jsonb(v_log), jsonb_build_object('reason', p_reason));
end;
$$;

create or replace function adjust_remaining_sessions(p_pass_id uuid, p_amount integer, p_reason text, p_actor_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pass member_passes%rowtype;
  v_actor staff_users%rowtype;
begin
  select * into v_actor from staff_users
  where id = p_actor_id and is_active = true and role in ('owner','admin');

  if not found then
    raise exception '잔여 횟수 수정 권한이 없습니다.';
  end if;

  select * into v_pass from member_passes where id = p_pass_id for update;
  if not found then
    raise exception '회원권을 찾을 수 없습니다.';
  end if;

  if v_actor.organization_id <> v_pass.organization_id then
    raise exception '다른 센터의 회원권은 수정할 수 없습니다.';
  end if;

  if nullif(trim(p_reason), '') is null then
    raise exception '잔여 횟수 수정 사유가 필요합니다.';
  end if;

  update member_passes
  set remaining_sessions = greatest(remaining_sessions + p_amount, 0),
      status = case when greatest(remaining_sessions + p_amount, 0) = 0 then 'used_up' else 'active' end,
      updated_at = now()
  where id = p_pass_id;

  insert into audit_logs(organization_id, actor_id, action, entity_type, entity_id, before_data, after_data)
  values (v_pass.organization_id, p_actor_id, 'PASS_REMAINING_ADJUSTED', 'member_passes', p_pass_id,
    to_jsonb(v_pass), jsonb_build_object('amount', p_amount, 'reason', p_reason));
end;
$$;
