# Supabase RLS / RPC Audit Guide

## 1. 확인 대상

RLS를 반드시 확인해야 하는 테이블:

```text
organizations
staff_users
members
member_passes
attendance_logs
member_notes
audit_logs
kiosk_attempt_logs
```

민감 RPC:

```text
check_in_member
cancel_attendance
adjust_remaining_sessions
```

## 2. SQL Editor 점검 쿼리

### 정책 목록 확인

```sql
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

### 함수 권한 확인

```sql
select
  n.nspname as schema,
  p.proname as function,
  pg_get_function_identity_arguments(p.oid) as args,
  p.prosecdef as security_definer,
  array_to_string(p.proacl, ', ') as grants
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('check_in_member', 'cancel_attendance', 'adjust_remaining_sessions', 'current_staff_organization_id', 'current_staff_role', 'current_staff_id')
order by p.proname;
```

### broad FOR ALL 정책 확인

```sql
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('members', 'member_passes', 'attendance_logs', 'audit_logs')
  and cmd = 'ALL';
```

기대 결과:

```text
0 rows
```

## 3. RPC 기대 동작

### check_in_member

```text
staff source: authenticated active staff만 가능
kiosk source: service_role 서버 액션만 가능
anon/public: 실행 불가
잔여횟수 0회: 실패
중복 출석: 실패
```

### cancel_attendance

```text
owner/admin만 가능
취소 사유 필수
잔여횟수 복구
attendance_logs.status = cancelled
```

### adjust_remaining_sessions

```text
owner/admin만 가능
사유 필수
잔여횟수 음수 불가
audit_logs 기록
```

## 4. Migration 순서

Production DB에는 아래 순서만 적용합니다.

```text
001_schema.sql
002_security_hardening.sql
003_member_registration_fields.sql
004_operational_hardening.sql
20260629_staff_command_dashboard_indexes.sql
005_operations_ui_support.sql
007_production_bootstrap_support.sql
```

적용 금지:

```text
006_qa_seed_data.sql
01_security_hardening.sql
02_member_registration_fields.sql
20260629_kiosk_demo1_hardening.sql
```
