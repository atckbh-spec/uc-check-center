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
