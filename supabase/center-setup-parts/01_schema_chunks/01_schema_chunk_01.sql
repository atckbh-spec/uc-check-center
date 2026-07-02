-- UC Check 01_schema chunk 1
-- Run this chunk by itself, then continue with the next chunk.

-- UC Check Center Operations setup part: 01_schema.sql
-- Source: supabase/001_schema.sql
-- Run this file by itself in Supabase SQL Editor.


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
