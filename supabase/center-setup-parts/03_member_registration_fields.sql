-- UC Check Center Operations setup part: 03_member_registration_fields.sql
-- Source: supabase/003_member_registration_fields.sql
-- Run this file by itself in Supabase SQL Editor.


alter table public.members
add column if not exists pin_hash text;
