# Role Permission QA

이 문서는 UC Check의 역할별 권한을 검증하기 위한 QA 가이드입니다.

## 1. 테스트 계정 준비

Production DB가 아니라 QA 또는 staging DB에서 먼저 테스트합니다.

권장 테스트 계정:

```text
owner@urban-conditioning.test
admin@urban-conditioning.test
coach@urban-conditioning.test
front@urban-conditioning.test
```

각 계정은 Supabase Auth 사용자와 `staff_users` row가 연결되어 있어야 합니다.

## 2. 환경변수

`.env.security-qa.example`을 참고해서 아래 값을 설정합니다.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SECURITY_QA_OWNER_EMAIL=owner@urban-conditioning.test
SECURITY_QA_OWNER_PASSWORD=<password>
SECURITY_QA_ADMIN_EMAIL=admin@urban-conditioning.test
SECURITY_QA_ADMIN_PASSWORD=<password>
SECURITY_QA_COACH_EMAIL=coach@urban-conditioning.test
SECURITY_QA_COACH_PASSWORD=<password>
SECURITY_QA_FRONT_DESK_EMAIL=front@urban-conditioning.test
SECURITY_QA_FRONT_DESK_PASSWORD=<password>
```

실행:

```bash
pnpm security:roles
```

## 3. 수동 검증 시나리오

### Owner

기대 결과:

```text
로그인 가능
대시보드 조회 가능
회원 생성 가능
회원권 생성 가능
잔여횟수 조정 가능
출석 취소 가능
직원 초대 가능
직원 비활성화 가능
감사 로그 조회 가능
```

### Admin

기대 결과:

```text
로그인 가능
대시보드 조회 가능
회원/회원권 관리 가능
잔여횟수 조정 가능
출석 취소 가능
감사 로그 조회 가능
마지막 owner 삭제/비활성화 불가
```

### Coach

기대 결과:

```text
로그인 가능
회원 조회 가능
출석 체크 가능
노쇼 기록 가능
메모 작성 가능
잔여횟수 조정 불가
출석 취소 불가
직원 관리 불가
감사 로그 조회 불가
```

### Front Desk

기대 결과:

```text
로그인 가능
회원 조회 가능
회원 생성 가능
회원권 생성 가능
출석 체크 가능
노쇼 기록 가능
잔여횟수 조정 불가
출석 취소 불가
직원 권한 변경 불가
감사 로그 조회 불가
```

## 4. 직접 API 우회 테스트

앱 UI에서 버튼이 숨겨져 있어도 Supabase RLS가 막아야 합니다.

확인해야 할 직접 API 우회:

```text
coach가 member_passes.remaining_sessions 직접 update 시도
front_desk가 cancel_attendance 직접 호출 시도
anon이 members select 시도
anon이 check_in_member 호출 시도
coach가 audit_logs select 시도
```

이 테스트는 `security:roles` 스크립트와 Supabase SQL editor에서 함께 확인합니다.
