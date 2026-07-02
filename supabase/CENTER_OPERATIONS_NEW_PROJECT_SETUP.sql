-- UC Check Center Operations v1 - New Supabase Project Setup
-- Run this in Supabase SQL Editor for a new Urban Conditioning center project.
-- Do NOT run supabase/006_qa_seed_data.sql on the live center database.


-- ============================================================
-- BEGIN 001_schema.sql
-- ============================================================

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

  select * into v_member from members where id = p_member_id for update;
  if not found or v_member.status <> 'active' then
    raise exception '異쒖꽍 媛?ν븳 ?뚯썝???꾨떃?덈떎.';
  end if;

  select * into v_pass from member_passes where id = p_member_pass_id and member_id = p_member_id for update;
  if not found or v_pass.status <> 'active' then
    raise exception '?쒖꽦 ?뚯썝沅뚯씠 ?놁뒿?덈떎.';
  end if;

  if v_pass.organization_id <> v_member.organization_id then
    raise exception '?뚯썝怨??뚯썝沅뚯쓽 ?쇳꽣 ?뺣낫媛 ?쇱튂?섏? ?딆뒿?덈떎.';
  end if;

  if p_source = 'staff' and v_actor.organization_id <> v_member.organization_id then
    raise exception '?ㅻⅨ ?쇳꽣 ?뚯썝? 異쒖꽍 泥섎━?????놁뒿?덈떎.';
  end if;

  if v_pass.remaining_sessions <= 0 then
    raise exception '?붿뿬 ?잛닔媛 ?놁뒿?덈떎. ?ㅽ깭?꾩뿉寃?臾몄쓽??二쇱꽭??';
  end if;

  if exists (
    select 1 from attendance_logs
    where member_id = p_member_id
      and member_pass_id = p_member_pass_id
      and attendance_date = v_today
      and status = 'checked_in'
  ) then
    raise exception '?ㅻ뒛 ?대? 異쒖꽍 泥섎━?섏뿀?듬땲??';
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
    'message', '異쒖꽍 泥댄겕媛 ?꾨즺?섏뿀?듬땲??',
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
    raise exception '異쒖꽍 痍⑥냼 沅뚰븳???놁뒿?덈떎.';
  end if;

  select * into v_log from attendance_logs where id = p_attendance_id for update;
  if not found or v_log.status <> 'checked_in' then
    raise exception '痍⑥냼 媛?ν븳 異쒖꽍 湲곕줉???꾨떃?덈떎.';
  end if;

  if v_actor.organization_id <> v_log.organization_id then
    raise exception '?ㅻⅨ ?쇳꽣??異쒖꽍 湲곕줉? 痍⑥냼?????놁뒿?덈떎.';
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
    raise exception '?붿뿬 ?잛닔 ?섏젙 沅뚰븳???놁뒿?덈떎.';
  end if;

  select * into v_pass from member_passes where id = p_pass_id for update;
  if not found then
    raise exception '?뚯썝沅뚯쓣 李얠쓣 ???놁뒿?덈떎.';
  end if;

  if v_actor.organization_id <> v_pass.organization_id then
    raise exception '?ㅻⅨ ?쇳꽣???뚯썝沅뚯? ?섏젙?????놁뒿?덈떎.';
  end if;

  if nullif(trim(p_reason), '') is null then
    raise exception '?붿뿬 ?잛닔 ?섏젙 ?ъ쑀媛 ?꾩슂?⑸땲??';
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

-- ============================================================
-- END 001_schema.sql
-- ============================================================


-- ============================================================
-- BEGIN 002_security_hardening.sql
-- ============================================================

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

-- ============================================================
-- END 002_security_hardening.sql
-- ============================================================


-- ============================================================
-- BEGIN 003_member_registration_fields.sql
-- ============================================================

alter table public.members
add column if not exists pin_hash text;

-- ============================================================
-- END 003_member_registration_fields.sql
-- ============================================================


-- ============================================================
-- BEGIN 004_operational_hardening.sql
-- ============================================================

-- UC Check operational hardening migration
-- 紐⑹쟻:
-- 1) staff_users RLS ?ш?瑜?留됯린 ?꾪빐 RLS helper瑜?security definer濡?怨좎젙
-- 2) MVP 珥덇린 broad "for all manage" policy瑜???븷蹂?policy濡??몃텇??-- 3) kiosk_attempt_logs policy瑜?CREATE POLICY IF NOT EXISTS ?놁씠 ?덉쟾?섍쾶 ?ъ깮??-- 4) ?듭떖 RPC ?ㅽ뻾 沅뚰븳??紐낆떆?곸쑝濡??뺣━

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

create policy "admins can manage pass templates" on public.pass_templates
for all
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

-- ============================================================
-- END 004_operational_hardening.sql
-- ============================================================


-- ============================================================
-- BEGIN 20260629_staff_command_dashboard_indexes.sql
-- ============================================================

-- UC Check Demo 2 Staff Command dashboard performance indexes
-- Safe to run multiple times. These indexes help dashboard cards and priority lists load quickly.

create index if not exists idx_attendance_org_date_status_source
on attendance_logs(organization_id, attendance_date, status, source);

create index if not exists idx_attendance_org_date_checkin_desc
on attendance_logs(organization_id, attendance_date, checkin_at desc);

create index if not exists idx_member_passes_org_status_remaining
on member_passes(organization_id, status, remaining_sessions);

create index if not exists idx_members_org_status_last_visit
on members(organization_id, status, last_visit_date);

-- ============================================================
-- END 20260629_staff_command_dashboard_indexes.sql
-- ============================================================


-- ============================================================
-- BEGIN 005_operations_ui_support.sql
-- ============================================================

-- UC Check operations UI support indexes and duplicate protection
-- Apply after 004_operational_hardening.sql.

create index if not exists idx_member_notes_org_member_pinned_created
on public.member_notes(organization_id, member_id, is_pinned desc, created_at desc);

create index if not exists idx_attendance_logs_org_member_status_checkin
on public.attendance_logs(organization_id, member_id, status, checkin_at desc);

-- Prevent repeated no-show entries for the same member/pass/date.
-- member_pass_id may be null, so an expression index is used for stable duplicate protection.
create unique index if not exists attendance_no_duplicate_no_show
on public.attendance_logs(
  member_id,
  coalesce(member_pass_id, '00000000-0000-0000-0000-000000000000'::uuid),
  attendance_date
)
where status = 'no_show';

-- ============================================================
-- END 005_operations_ui_support.sql
-- ============================================================


-- ============================================================
-- BEGIN 008_security_qa_assertions.sql
-- ============================================================

-- UC Check production security QA assertions
-- Apply after production migrations and before production Go/No-Go.
-- This file creates read-only security audit functions for service_role driven checks.

create or replace function public.security_qa_report()
returns table (
  check_name text,
  status text,
  severity text,
  detail text
)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_count integer;
  v_detail text;
  v_has_anon boolean := exists (select 1 from pg_roles where rolname = 'anon');
  v_has_service_role boolean := exists (select 1 from pg_roles where rolname = 'service_role');
begin
  -- Required tables must have RLS enabled.
  return query
  with required(table_name) as (
    values
      ('organizations'),
      ('staff_users'),
      ('members'),
      ('pass_templates'),
      ('member_passes'),
      ('attendance_logs'),
      ('member_notes'),
      ('audit_logs'),
      ('kiosk_attempt_logs')
  )
  select
    ('rls enabled: ' || required.table_name)::text as check_name,
    case when c.oid is not null and c.relrowsecurity then 'pass' else 'fail' end::text as status,
    'blocker'::text as severity,
    case
      when c.oid is null then 'table is missing'
      when not c.relrowsecurity then 'row level security is not enabled'
      else 'ok'
    end::text as detail
  from required
  left join pg_class c
    on c.relname = required.table_name
   and c.relnamespace = 'public'::regnamespace;

  -- Legacy broad policies must not remain active.
  select count(*), coalesce(string_agg(c.relname || '.' || p.polname, ', ' order by c.relname, p.polname), '')
  into v_count, v_detail
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
  where c.relnamespace = 'public'::regnamespace
    and p.polname in (
      'staff can manage members',
      'staff can manage pass templates',
      'staff can manage member passes',
      'staff can manage attendance',
      'staff can manage notes'
    );

  return query select
    'no legacy broad staff manage policies'::text,
    case when v_count = 0 then 'pass' else 'fail' end::text,
    'blocker'::text,
    case when v_count = 0 then 'ok' else v_detail end::text;

  -- Delete and FOR ALL policies on operational tables should not exist.
  select count(*), coalesce(string_agg(c.relname || '.' || p.polname || ':' || p.polcmd, ', ' order by c.relname, p.polname), '')
  into v_count, v_detail
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
  where c.relnamespace = 'public'::regnamespace
    and c.relname in ('members','member_passes','attendance_logs','member_notes','audit_logs')
    and p.polcmd in ('*','d');

  return query select
    'no delete or for-all RLS policies on operational tables'::text,
    case when v_count = 0 then 'pass' else 'fail' end::text,
    'high'::text,
    case when v_count = 0 then 'ok' else v_detail end::text;

  -- Helper functions used inside RLS must be SECURITY DEFINER to avoid staff_users recursion.
  return query
  with required(proname) as (
    values
      ('current_staff_organization_id'),
      ('current_staff_role'),
      ('current_staff_id')
  )
  select
    ('helper function security definer: ' || required.proname)::text,
    case when p.oid is not null and p.prosecdef then 'pass' else 'fail' end::text,
    'blocker'::text,
    case
      when p.oid is null then 'function is missing'
      when not p.prosecdef then 'function is not SECURITY DEFINER'
      else 'ok'
    end::text
  from required
  left join pg_proc p
    on p.proname = required.proname
   and p.pronamespace = 'public'::regnamespace;

  -- Helper functions should pin search_path.
  return query
  with required(proname) as (
    values
      ('current_staff_organization_id'),
      ('current_staff_role'),
      ('current_staff_id'),
      ('check_in_member'),
      ('cancel_attendance'),
      ('adjust_remaining_sessions')
  )
  select
    ('function search_path pinned: ' || required.proname)::text,
    case when p.oid is not null and array_to_string(coalesce(p.proconfig, array[]::text[]), ' ') like '%search_path=public%' then 'pass' else 'fail' end::text,
    'high'::text,
    case
      when p.oid is null then 'function is missing'
      when array_to_string(coalesce(p.proconfig, array[]::text[]), ' ') not like '%search_path=public%' then 'search_path is not pinned to public'
      else 'ok'
    end::text
  from required
  left join pg_proc p
    on p.proname = required.proname
   and p.pronamespace = 'public'::regnamespace;

  -- Critical RPC functions must not be executable by PUBLIC or anon.
  select count(*), coalesce(string_agg(p.proname, ', ' order by p.proname), '')
  into v_count, v_detail
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and p.proname in ('check_in_member','cancel_attendance','adjust_remaining_sessions')
    and (
      has_function_privilege('PUBLIC', p.oid, 'EXECUTE')
      or (v_has_anon and has_function_privilege('anon', p.oid, 'EXECUTE'))
    );

  return query select
    'critical RPC not executable by PUBLIC or anon'::text,
    case when v_count = 0 then 'pass' else 'fail' end::text,
    'blocker'::text,
    case when v_count = 0 then 'ok' else v_detail end::text;

  -- service_role should be able to execute critical RPC functions.
  if v_has_service_role then
    select count(*), coalesce(string_agg(p.proname, ', ' order by p.proname), '')
    into v_count, v_detail
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in ('check_in_member','cancel_attendance','adjust_remaining_sessions')
      and not has_function_privilege('service_role', p.oid, 'EXECUTE');

    return query select
      'critical RPC executable by service_role'::text,
      case when v_count = 0 then 'pass' else 'fail' end::text,
      'high'::text,
      case when v_count = 0 then 'ok' else v_detail end::text;
  else
    return query select
      'critical RPC executable by service_role'::text,
      'warn'::text,
      'medium'::text,
      'service_role role was not found in this database'::text;
  end if;

  -- check_in_member body should include kiosk service_role restriction.
  select count(*), coalesce(string_agg(p.proname, ', ' order by p.proname), '')
  into v_count, v_detail
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and p.proname = 'check_in_member'
    and (
      pg_get_functiondef(p.oid) not like '%p_source = ''kiosk''%'
      or pg_get_functiondef(p.oid) not like '%service_role%'
      or pg_get_functiondef(p.oid) not like '%?ㅼ삤?ㅽ겕 異쒖꽍? ?쒕쾭?먯꽌留?泥섎━?????덉뒿?덈떎%'
    );

  return query select
    'kiosk check-in requires service_role path'::text,
    case when v_count = 0 then 'pass' else 'fail' end::text,
    'blocker'::text,
    case when v_count = 0 then 'ok' else v_detail end::text;

  -- Required policies should exist by name.
  return query
  with required(table_name, policy_name) as (
    values
      ('members','staff can read members'),
      ('members','ops staff can create members'),
      ('members','ops staff can update members'),
      ('member_passes','staff can read member passes'),
      ('member_passes','ops staff can create member passes'),
      ('member_passes','admins can update member passes'),
      ('attendance_logs','staff can read attendance'),
      ('attendance_logs','staff can insert no show attendance'),
      ('audit_logs','admins can read audit'),
      ('kiosk_attempt_logs','staff can read kiosk attempt logs'),
      ('kiosk_attempt_logs','service can insert kiosk attempt logs')
  )
  select
    ('required RLS policy exists: ' || required.table_name || '.' || required.policy_name)::text,
    case when p.oid is not null then 'pass' else 'fail' end::text,
    'high'::text,
    case when p.oid is null then 'policy is missing' else 'ok' end::text
  from required
  left join pg_class c
    on c.relname = required.table_name
   and c.relnamespace = 'public'::regnamespace
  left join pg_policy p
    on p.polrelid = c.oid
   and p.polname = required.policy_name;

  -- Kiosk attempt logs should not grant insert to anon/authenticated.
  select count(*), coalesce(string_agg(grantee || ':' || privilege_type, ', ' order by grantee, privilege_type), '')
  into v_count, v_detail
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name = 'kiosk_attempt_logs'
    and grantee in ('anon','authenticated')
    and privilege_type in ('INSERT','UPDATE','DELETE');

  return query select
    'kiosk attempt logs write restricted'::text,
    case when v_count = 0 then 'pass' else 'fail' end::text,
    'high'::text,
    case when v_count = 0 then 'ok' else v_detail end::text;
end;
$$;

create or replace function public.assert_uc_check_security_posture()
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_failures integer;
  v_detail text;
begin
  select count(*), coalesce(string_agg(check_name || ' => ' || detail, E'\n' order by severity, check_name), '')
  into v_failures, v_detail
  from public.security_qa_report()
  where status = 'fail'
    and severity in ('blocker','high');

  if v_failures > 0 then
    raise exception 'UC Check security posture failed: % checks failed. %', v_failures, v_detail;
  end if;
end;
$$;

revoke execute on function public.security_qa_report() from public, anon, authenticated;
revoke execute on function public.assert_uc_check_security_posture() from public, anon, authenticated;
grant execute on function public.security_qa_report() to service_role;
grant execute on function public.assert_uc_check_security_posture() to service_role;

comment on function public.security_qa_report() is 'UC Check production security QA report. Execute with service_role before production Go/No-Go.';
comment on function public.assert_uc_check_security_posture() is 'Raises an exception if UC Check production security QA has blocker/high failures.';

-- ============================================================
-- END 008_security_qa_assertions.sql
-- ============================================================

