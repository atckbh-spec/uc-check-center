# UC Check 최종 보안/권한 QA Runbook

이 문서는 UC Check를 실제 Urban Conditioning 운영 URL에 올리기 전 마지막으로 확인해야 하는 보안/권한 QA 절차다.

## 목표

다음 문제가 없는지 확인한다.

- 비로그인 사용자가 스태프 화면에 접근하는 문제
- 관리자 페이지가 static HTML로 빌드되어 공개되는 문제
- `SUPABASE_SERVICE_ROLE_KEY`가 브라우저 코드에 노출되는 문제
- Coach/Front Desk가 관리자 권한 작업을 우회하는 문제
- 키오스크 화면에서 회원 메모, 전체 전화번호, audit 정보가 노출되는 문제
- Supabase RLS/RPC 권한이 앱 권한보다 넓게 열려 있는 문제

## 필수 명령

운영 배포 전 로컬/CI에서 실행한다.

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm build
pnpm qa:build-output
pnpm security:static
```

운영 DB에 `supabase/008_security_qa_assertions.sql` 적용 후 실행한다.

```bash
pnpm security:db
```

운영 URL 배포 후 실행한다.

```bash
UC_CHECK_PRODUCTION_URL=https://<production-domain> pnpm security:routes
```

전체 묶음 검증은 다음 순서를 권장한다.

```bash
pnpm security:check
pnpm security:db
UC_CHECK_PRODUCTION_URL=https://<production-domain> pnpm security:routes
```

## Go / No-Go 기준

### Go 가능

아래 조건을 모두 만족해야 한다.

- `pnpm build` 통과
- `pnpm qa:build-output` 통과
- `pnpm security:static` 통과
- `pnpm security:db`에서 blocker/high failure 없음
- `pnpm security:routes` 통과
- Owner 로그인 가능
- Staff 페이지 비로그인 접근 차단
- Kiosk unlock 전 `/kiosk` 접근 차단
- Kiosk에서 회원 메모/전체 전화번호 미노출
- Owner/Admin만 출석 취소와 잔여횟수 조정 가능

### No-Go

아래 중 하나라도 발견되면 운영 배포를 중지한다.

- `/dashboard.html`, `/members/new.html`, `/settings/staff.html` 같은 보호 페이지 static HTML 생성
- 비로그인 상태에서 `/dashboard` 내용 노출
- `NEXT_PUBLIC_` 환경변수에 service role key 또는 secret 값 노출
- `security_qa_report()` blocker/high failure 발생
- 키오스크에서 회원 메모 또는 전체 전화번호 노출
- 중복 출석이 차단되지 않음
- 출석 취소 후 잔여횟수 복구 실패
- Coach/Front Desk가 직접 잔여횟수 수정 가능

## 운영 URL 수동 확인

브라우저 시크릿 모드에서 확인한다.

1. `/dashboard` 접근 → `/login` 이동 또는 차단
2. `/members/new` 접근 → `/login` 이동 또는 차단
3. `/settings/staff` 접근 → `/login` 이동 또는 차단
4. `/kiosk` 접근 → `/kiosk/unlock` 이동
5. `/kiosk/unlock`에서 잘못된 PIN 입력 → 접근 불가
6. 올바른 PIN 입력 → `/kiosk` 접근 가능
7. 회원 전화번호 뒷 4자리 입력 → 후보 정보가 마스킹되어 표시
8. 키오스크 어디에서도 회원 메모/전체 전화번호/관리자 기능이 보이지 않는지 확인

## 권한 수동 확인

각 역할 계정으로 로그인한다.

- Owner
- Admin
- Coach
- Front Desk

확인 항목은 `ROLE_PERMISSION_QA_MATRIX.md`를 따른다.

## DB 보안 확인

`supabase/008_security_qa_assertions.sql`을 적용한 뒤 다음을 실행한다.

```bash
pnpm security:db
```

DB audit가 보는 주요 항목:

- 주요 테이블 RLS 활성화
- legacy broad manage policy 제거 여부
- `current_staff_*` helper가 `SECURITY DEFINER`인지
- critical RPC가 `PUBLIC`/`anon`에게 열려 있지 않은지
- kiosk check-in이 service role path를 요구하는지
- kiosk attempt log write 권한이 제한되어 있는지

## 사고 발생 시

배포 후 보호 페이지 노출, 개인정보 노출, 잔여횟수 오류가 발견되면 즉시 다음을 따른다.

1. Vercel rollback
2. Kiosk 태블릿 사용 중지
3. 수기 출석표로 임시 전환
4. Supabase audit_logs와 attendance_logs 확인
5. 영향 받은 회원/스태프 범위 확인
6. 수정 migration 또는 hotfix 적용
7. QA 재실행 후 재배포

자세한 장애 대응은 `docs/qa/ROLLBACK_AND_INCIDENT_RUNBOOK.md`를 따른다.
