-- UC Check Demo 1 Kiosk Focus hardening migration
-- Superseded by supabase/002_security_hardening.sql.
--
-- This file intentionally does not redefine check_in_member, cancel_attendance,
-- or adjust_remaining_sessions. Older Demo 1 packs contained weaker RPC
-- definitions here, and running them after 002_security_hardening.sql could
-- overwrite the production-safe kiosk/service-role checks.
--
-- Keep the execute privileges aligned with the hardened migration.
revoke execute on function public.check_in_member(uuid, uuid, uuid, text) from public, anon;
revoke execute on function public.cancel_attendance(uuid, text, uuid) from public, anon;
revoke execute on function public.adjust_remaining_sessions(uuid, integer, text, uuid) from public, anon;

grant execute on function public.check_in_member(uuid, uuid, uuid, text) to authenticated, service_role;
grant execute on function public.cancel_attendance(uuid, text, uuid) to authenticated, service_role;
grant execute on function public.adjust_remaining_sessions(uuid, integer, text, uuid) to authenticated, service_role;
