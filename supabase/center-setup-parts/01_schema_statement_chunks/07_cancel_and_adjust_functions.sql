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
