-- UC Check 01_schema chunk 2
-- Run this chunk by itself, then continue with the next chunk.

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
