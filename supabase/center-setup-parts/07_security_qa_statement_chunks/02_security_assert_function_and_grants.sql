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
