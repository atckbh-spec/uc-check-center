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
