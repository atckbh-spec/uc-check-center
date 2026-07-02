# Supabase 운영 설정 가이드

## 1. 운영 DB 생성

Supabase에서 production 프로젝트를 새로 생성합니다.
QA 또는 개발 프로젝트와 운영 프로젝트를 반드시 분리합니다.

권장 이름:

```text
uc-check-production
```

## 2. Migration 적용

새 DB 적용 순서:

```text
001_schema.sql
002_security_hardening.sql
003_member_registration_fields.sql
004_operational_hardening.sql
20260629_staff_command_dashboard_indexes.sql
005_operations_ui_support.sql
```

운영 금지:

```text
006_qa_seed_data.sql
schema.sql 전체 재실행
deprecated migration 파일 실행
```

## 3. RLS 확인

운영 배포 전 아래 정책이 맞는지 확인합니다.

```text
members: staff select, 권한별 insert/update, delete 금지
member_passes: staff select, admin 중심 insert/update
attendance_logs: staff select, 출석/취소는 RPC 중심
member_notes: staff select/insert, organization 제한
staff_users: owner/admin 관리
```

## 4. RPC 권한 확인

중요 RPC:

```text
check_in_member
cancel_attendance
adjust_remaining_sessions
```

확인 기준:

```text
anon/public이 직접 실행할 수 없어야 함
kiosk source 출석은 service_role 기반 서버 액션에서만 가능해야 함
staff 출석은 actor staff 검증이 있어야 함
```

## 5. 최초 Owner 생성

Auth user 생성 후 `staff_users`와 연결합니다.

```sql
insert into public.organizations (name, slug)
values ('Urban Conditioning', 'urban-conditioning')
returning id;
```

```sql
insert into public.staff_users (
  organization_id,
  auth_user_id,
  name,
  email,
  role,
  is_active
)
values (
  '<organization_id>',
  '<auth.users.id>',
  'Owner',
  'owner@example.com',
  'owner',
  true
);
```

## 6. 운영 확인 SQL

```sql
select name, slug from public.organizations;
```

```sql
select name, email, role, is_active
from public.staff_users
order by created_at;
```

```sql
select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('check_in_member', 'cancel_attendance', 'adjust_remaining_sessions');
```

## 7. 백업 기준

운영 데이터 입력 전:

```text
migration 적용 완료 시점
최초 owner 연결 시점
첫 현장 테스트 전
정식 운영 전날
```

위 시점마다 Supabase dashboard 백업 또는 dump를 남기는 것을 권장합니다.
