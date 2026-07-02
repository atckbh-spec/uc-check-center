-- UC Check QA seed data
-- 목적: 현장 QA/UAT용 테스트 회원, 회원권, 출석 로그를 생성합니다.
-- 주의: 운영 DB에 적용하지 마세요.
--
-- 사용 방법:
-- 1) Supabase Auth에서 테스트 owner 계정을 먼저 생성합니다.
-- 2) 생성된 auth.users.id를 아래 v_owner_auth_user_id에 넣습니다.
-- 3) QA DB에서 이 SQL을 실행합니다.

create extension if not exists "pgcrypto";

DO $$
DECLARE
  v_org_id uuid := '11111111-1111-1111-1111-111111111111';
  v_owner_staff_id uuid := '22222222-2222-2222-2222-222222222222';
  v_owner_auth_user_id uuid := '00000000-0000-0000-0000-000000000000'; -- TODO: replace with a real auth.users.id
  v_today date := (now() at time zone 'Asia/Seoul')::date;
BEGIN
  IF v_owner_auth_user_id = '00000000-0000-0000-0000-000000000000'::uuid THEN
    RAISE EXCEPTION 'v_owner_auth_user_id를 Supabase Auth 테스트 계정 UUID로 교체한 뒤 실행하세요.';
  END IF;

  INSERT INTO public.organizations (id, name, slug)
  VALUES (v_org_id, 'Urban Conditioning QA', 'urban-conditioning-qa')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug;

  INSERT INTO public.staff_users (id, organization_id, auth_user_id, name, email, role, is_active)
  VALUES (
    v_owner_staff_id,
    v_org_id,
    v_owner_auth_user_id,
    'QA Owner',
    'qa-owner@urban-conditioning.test',
    'owner',
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    organization_id = EXCLUDED.organization_id,
    auth_user_id = EXCLUDED.auth_user_id,
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    updated_at = now();

  INSERT INTO public.pass_templates (id, organization_id, name, default_total_sessions, default_valid_days, service_type, is_active)
  VALUES
    ('33333333-3333-3333-3333-333333333301', v_org_id, 'PT 20회권', 20, 90, 'pt', true),
    ('33333333-3333-3333-3333-333333333302', v_org_id, '컨디셔닝 10회권', 10, 60, 'conditioning', true),
    ('33333333-3333-3333-3333-333333333303', v_org_id, '그룹 8회권', 8, 45, 'group', true),
    ('33333333-3333-3333-3333-333333333304', v_org_id, '체험 1회권', 1, 14, 'trial', true)
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    default_total_sessions = EXCLUDED.default_total_sessions,
    default_valid_days = EXCLUDED.default_valid_days,
    service_type = EXCLUDED.service_type,
    is_active = EXCLUDED.is_active;

  INSERT INTO public.members (
    id, organization_id, name, phone, phone_last4, status, assigned_coach_id,
    first_visit_date, last_visit_date, memo, created_at, updated_at
  )
  VALUES
    ('44444444-4444-4444-4444-444444444401', v_org_id, '김민수', '01012345678', '5678', 'active', v_owner_staff_id, v_today - 60, v_today, 'QA: 오늘 이미 출석된 중복 방지 테스트 회원', now(), now()),
    ('44444444-4444-4444-4444-444444444402', v_org_id, '박서연', '01098761234', '1234', 'active', v_owner_staff_id, v_today - 40, v_today - 1, 'QA: 키오스크 정상 체크인 / 재등록 대상', now(), now()),
    ('44444444-4444-4444-4444-444444444403', v_org_id, '박성훈', '01033331234', '1234', 'active', v_owner_staff_id, v_today - 30, v_today - 3, 'QA: 동일 전화번호 끝 4자리 후보 테스트', now(), now()),
    ('44444444-4444-4444-4444-444444444404', v_org_id, '이정훈', '01055557777', '7777', 'active', v_owner_staff_id, v_today - 80, v_today - 16, 'QA: 장기 미방문 + 노쇼 주의 + 잔여 1회', now(), now()),
    ('44444444-4444-4444-4444-444444444405', v_org_id, '최유진', '01022229999', '9999', 'active', v_owner_staff_id, v_today - 20, v_today - 4, 'QA: 잔여 0회 출석 차단 테스트', now(), now()),
    ('44444444-4444-4444-4444-444444444406', v_org_id, '오민재', '01044448888', '8888', 'active', v_owner_staff_id, v_today - 10, null, 'QA: 방문 이력 없음 / 스태프 직접 출석 테스트', now(), now()),
    ('44444444-4444-4444-4444-444444444407', v_org_id, '정하늘', '01012121212', '1212', 'active', v_owner_staff_id, v_today - 50, v_today - 21, 'QA: 만료일 지난 회원권 테스트', now(), now()),
    ('44444444-4444-4444-4444-444444444408', v_org_id, '문가온', '01077770000', '0000', 'paused', v_owner_staff_id, v_today - 90, v_today - 35, 'QA: paused 회원 검색 제외 테스트', now(), now())
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    phone_last4 = EXCLUDED.phone_last4,
    status = EXCLUDED.status,
    assigned_coach_id = EXCLUDED.assigned_coach_id,
    first_visit_date = EXCLUDED.first_visit_date,
    last_visit_date = EXCLUDED.last_visit_date,
    memo = EXCLUDED.memo,
    updated_at = now();

  -- pin_hash를 비워두면 현재 앱은 phone_last4를 legacy PIN처럼 허용합니다.
  UPDATE public.members
  SET pin_hash = null
  WHERE organization_id = v_org_id
    AND id IN (
      '44444444-4444-4444-4444-444444444401',
      '44444444-4444-4444-4444-444444444402',
      '44444444-4444-4444-4444-444444444403',
      '44444444-4444-4444-4444-444444444404',
      '44444444-4444-4444-4444-444444444405',
      '44444444-4444-4444-4444-444444444406',
      '44444444-4444-4444-4444-444444444407',
      '44444444-4444-4444-4444-444444444408'
    );

  INSERT INTO public.member_passes (
    id, organization_id, member_id, pass_template_id, pass_name, service_type,
    total_sessions, used_sessions, remaining_sessions, start_date, end_date,
    status, assigned_coach_id, created_by, created_at, updated_at
  )
  VALUES
    ('55555555-5555-5555-5555-555555555401', v_org_id, '44444444-4444-4444-4444-444444444401', '33333333-3333-3333-3333-333333333301', 'PT 20회권', 'pt', 20, 12, 8, v_today - 60, v_today + 30, 'active', v_owner_staff_id, v_owner_staff_id, now(), now()),
    ('55555555-5555-5555-5555-555555555402', v_org_id, '44444444-4444-4444-4444-444444444402', '33333333-3333-3333-3333-333333333302', '컨디셔닝 10회권', 'conditioning', 10, 7, 3, v_today - 40, v_today + 20, 'active', v_owner_staff_id, v_owner_staff_id, now(), now()),
    ('55555555-5555-5555-5555-555555555403', v_org_id, '44444444-4444-4444-4444-444444444403', '33333333-3333-3333-3333-333333333301', 'PT 10회권', 'pt', 10, 4, 6, v_today - 30, v_today + 50, 'active', v_owner_staff_id, v_owner_staff_id, now(), now()),
    ('55555555-5555-5555-5555-555555555404', v_org_id, '44444444-4444-4444-4444-444444444404', '33333333-3333-3333-3333-333333333303', '그룹 8회권', 'group', 8, 7, 1, v_today - 80, v_today + 10, 'active', v_owner_staff_id, v_owner_staff_id, now(), now()),
    ('55555555-5555-5555-5555-555555555405', v_org_id, '44444444-4444-4444-4444-444444444405', '33333333-3333-3333-3333-333333333302', '컨디셔닝 10회권', 'conditioning', 10, 10, 0, v_today - 20, v_today + 40, 'used_up', v_owner_staff_id, v_owner_staff_id, now(), now()),
    ('55555555-5555-5555-5555-555555555406', v_org_id, '44444444-4444-4444-4444-444444444406', '33333333-3333-3333-3333-333333333301', 'PT 20회권', 'pt', 20, 5, 15, v_today - 10, v_today + 80, 'active', v_owner_staff_id, v_owner_staff_id, now(), now()),
    ('55555555-5555-5555-5555-555555555407', v_org_id, '44444444-4444-4444-4444-444444444407', '33333333-3333-3333-3333-333333333301', 'PT 20회권', 'pt', 20, 8, 12, v_today - 70, v_today - 1, 'active', v_owner_staff_id, v_owner_staff_id, now(), now()),
    ('55555555-5555-5555-5555-555555555408', v_org_id, '44444444-4444-4444-4444-444444444408', '33333333-3333-3333-3333-333333333303', '그룹 8회권', 'group', 8, 3, 5, v_today - 90, v_today + 30, 'paused', v_owner_staff_id, v_owner_staff_id, now(), now())
  ON CONFLICT (id) DO UPDATE SET
    pass_name = EXCLUDED.pass_name,
    service_type = EXCLUDED.service_type,
    total_sessions = EXCLUDED.total_sessions,
    used_sessions = EXCLUDED.used_sessions,
    remaining_sessions = EXCLUDED.remaining_sessions,
    start_date = EXCLUDED.start_date,
    end_date = EXCLUDED.end_date,
    status = EXCLUDED.status,
    assigned_coach_id = EXCLUDED.assigned_coach_id,
    updated_at = now();

  INSERT INTO public.attendance_logs (
    id, organization_id, member_id, member_pass_id, checkin_at, attendance_date,
    service_type, status, source, deducted_sessions, checked_by, memo, created_at
  )
  VALUES
    ('66666666-6666-6666-6666-666666666401', v_org_id, '44444444-4444-4444-4444-444444444401', '55555555-5555-5555-5555-555555555401', now(), v_today, 'pt', 'checked_in', 'staff', 1, v_owner_staff_id, 'QA 오늘 출석 / 중복 방지 테스트', now()),
    ('66666666-6666-6666-6666-666666666402', v_org_id, '44444444-4444-4444-4444-444444444401', '55555555-5555-5555-5555-555555555401', now() - interval '1 day', v_today - 1, 'pt', 'checked_in', 'staff', 1, v_owner_staff_id, 'QA 최근 출석', now()),
    ('66666666-6666-6666-6666-666666666403', v_org_id, '44444444-4444-4444-4444-444444444401', '55555555-5555-5555-5555-555555555401', now() - interval '8 days', v_today - 8, 'pt', 'checked_in', 'staff', 1, v_owner_staff_id, 'QA 2주 전 출석', now()),
    ('66666666-6666-6666-6666-666666666404', v_org_id, '44444444-4444-4444-4444-444444444402', '55555555-5555-5555-5555-555555555402', now() - interval '1 day', v_today - 1, 'conditioning', 'checked_in', 'kiosk', 1, null, 'QA 키오스크 최근 출석', now()),
    ('66666666-6666-6666-6666-666666666405', v_org_id, '44444444-4444-4444-4444-444444444402', '55555555-5555-5555-5555-555555555402', now() - interval '3 days', v_today - 3, 'conditioning', 'checked_in', 'staff', 1, v_owner_staff_id, 'QA 최근 출석', now()),
    ('66666666-6666-6666-6666-666666666406', v_org_id, '44444444-4444-4444-4444-444444444403', '55555555-5555-5555-5555-555555555403', now() - interval '3 days', v_today - 3, 'pt', 'checked_in', 'staff', 1, v_owner_staff_id, 'QA 동일 뒷자리 후보 출석', now()),
    ('66666666-6666-6666-6666-666666666407', v_org_id, '44444444-4444-4444-4444-444444444404', '55555555-5555-5555-5555-555555555404', now() - interval '16 days', v_today - 16, 'group', 'checked_in', 'staff', 1, v_owner_staff_id, 'QA 장기 미방문 기준 최근 방문', now()),
    ('66666666-6666-6666-6666-666666666408', v_org_id, '44444444-4444-4444-4444-444444444404', '55555555-5555-5555-5555-555555555404', now() - interval '6 days', v_today - 6, 'group', 'no_show', 'staff', 0, v_owner_staff_id, 'QA 노쇼 1', now()),
    ('66666666-6666-6666-6666-666666666409', v_org_id, '44444444-4444-4444-4444-444444444404', '55555555-5555-5555-5555-555555555404', now() - interval '20 days', v_today - 20, 'group', 'no_show', 'staff', 0, v_owner_staff_id, 'QA 노쇼 2', now()),
    ('66666666-6666-6666-6666-666666666410', v_org_id, '44444444-4444-4444-4444-444444444405', '55555555-5555-5555-5555-555555555405', now() - interval '4 days', v_today - 4, 'conditioning', 'checked_in', 'staff', 1, v_owner_staff_id, 'QA 잔여 0회 회원 마지막 출석', now())
  ON CONFLICT (id) DO UPDATE SET
    checkin_at = EXCLUDED.checkin_at,
    attendance_date = EXCLUDED.attendance_date,
    status = EXCLUDED.status,
    source = EXCLUDED.source,
    deducted_sessions = EXCLUDED.deducted_sessions,
    checked_by = EXCLUDED.checked_by,
    memo = EXCLUDED.memo;

  INSERT INTO public.member_notes (id, organization_id, member_id, note_type, content, is_pinned, created_by, created_at)
  VALUES
    ('77777777-7777-7777-7777-777777777401', v_org_id, '44444444-4444-4444-4444-444444444402', 'renewal', 'QA 재등록 안내 대상. 다음 방문 시 10회권/20회권 상담 필요.', true, v_owner_staff_id, now() - interval '2 days'),
    ('77777777-7777-7777-7777-777777777402', v_org_id, '44444444-4444-4444-4444-444444444404', 'risk', 'QA 장기 미방문 및 노쇼 주의. 연락 필요.', true, v_owner_staff_id, now() - interval '5 days'),
    ('77777777-7777-7777-7777-777777777403', v_org_id, '44444444-4444-4444-4444-444444444401', 'general', 'QA 오늘 출석된 회원. 중복 출석 방지 확인용.', false, v_owner_staff_id, now() - interval '1 day')
  ON CONFLICT (id) DO UPDATE SET
    note_type = EXCLUDED.note_type,
    content = EXCLUDED.content,
    is_pinned = EXCLUDED.is_pinned,
    created_by = EXCLUDED.created_by,
    created_at = EXCLUDED.created_at;

  INSERT INTO public.audit_logs (id, organization_id, actor_id, action, entity_type, entity_id, after_data, created_at)
  VALUES
    ('88888888-8888-8888-8888-888888888401', v_org_id, v_owner_staff_id, 'QA_SEED_APPLIED', 'organizations', v_org_id, jsonb_build_object('seed', '006_qa_seed_data.sql'), now())
  ON CONFLICT (id) DO UPDATE SET
    after_data = EXCLUDED.after_data,
    created_at = now();
END $$;

-- QA quick checks
select 'members' as table_name, count(*) from public.members where organization_id = '11111111-1111-1111-1111-111111111111'
union all
select 'member_passes', count(*) from public.member_passes where organization_id = '11111111-1111-1111-1111-111111111111'
union all
select 'attendance_logs', count(*) from public.attendance_logs where organization_id = '11111111-1111-1111-1111-111111111111'
union all
select 'member_notes', count(*) from public.member_notes where organization_id = '11111111-1111-1111-1111-111111111111';
