# UC Check 다음 작업: 운영 배포 안정화 패치 적용

현재 UC Check 프로젝트에 첨부한 `uc_check_security_hardening_patch.zip`을 적용해줘.
이 패치는 Demo 1 Kiosk, Demo 2 Staff Command, Demo 3 Member Detail 이후의 **운영 배포 blocker 제거 패치**다.

## 목표

1. 보호 페이지가 `next build` 중 static HTML로 생성되지 않게 한다.
2. production build phase에서 demo staff/demo data로 인증을 우회하지 않는다.
3. Supabase RLS helper 재귀 가능성을 제거한다.
4. broad `for all manage` RLS policy를 역할별 policy로 세분화한다.
5. kiosk attempt logging과 member PIN pepper를 추가한다.
6. 중복/약한 migration 파일을 deprecated 처리하고 canonical migration 순서를 명확히 한다.

## 적용 파일

패치에 포함된 주요 변경 파일:

- `lib/config/env.ts`
- `lib/auth/require-staff.ts`
- `app/**/page.tsx`
- `lib/audit/actions.ts`
- `lib/kiosk/attempt-log.ts`
- `lib/kiosk/actions.ts`
- `lib/kiosk/queries.ts`
- `lib/utils/member-pin.ts`
- `lib/members/actions.ts`
- `lib/passes/actions.ts`
- `lib/staff/actions.ts`
- `supabase/001_schema.sql`
- `supabase/002_security_hardening.sql`
- `supabase/004_operational_hardening.sql`
- `supabase/schema.sql`
- `.eslintrc.json`
- `.env.example`
- `README.md`

## 반드시 확인할 것

### 1. Auth/static build

다음 파일에서 `isProductionBuildPhase` 기반 demo staff/demo data 우회가 없어야 한다.

- `lib/config/env.ts`
- `lib/auth/require-staff.ts`

`shouldUseDemoData()`는 반드시 `NEXT_PUBLIC_DEMO_MODE === "true"`일 때만 true여야 한다.

Staff/Kiosk 보호 페이지에는 아래가 있어야 한다.

```ts
export const dynamic = "force-dynamic";
```

대상:

- `app/dashboard/page.tsx`
- `app/attendance/today/page.tsx`
- `app/check-in/page.tsx`
- `app/check-in/success/page.tsx`
- `app/members/page.tsx`
- `app/members/new/page.tsx`
- `app/members/[id]/page.tsx`
- `app/reports/monthly/page.tsx`
- `app/settings/staff/page.tsx`
- `app/kiosk/page.tsx`
- `app/kiosk/search/page.tsx`
- `app/kiosk/confirm/page.tsx`
- `app/kiosk/success/page.tsx`
- `app/kiosk/admin/page.tsx`
- `app/kiosk/unlock/page.tsx`
- `app/login/page.tsx`

### 2. Supabase migration

새 DB에서는 아래 순서로 적용한다.

1. `supabase/001_schema.sql`
2. `supabase/002_security_hardening.sql`
3. `supabase/003_member_registration_fields.sql`
4. `supabase/004_operational_hardening.sql`
5. `supabase/20260629_staff_command_dashboard_indexes.sql`

기존 DB에서는 전체 `schema.sql`을 다시 실행하지 말고 위 migration 중 아직 적용하지 않은 것을 순서대로 적용한다.

중요:

- `supabase/01_security_hardening.sql`
- `supabase/02_member_registration_fields.sql`
- `supabase/20260629_kiosk_demo1_hardening.sql`

위 3개는 deprecated compatibility file이다. 새로 실행하지 마라.

### 3. RLS/RPC

`004_operational_hardening.sql` 적용 후 아래 조건을 확인해줘.

- `current_staff_organization_id()` / `current_staff_role()` / `current_staff_id()`가 `security definer` + `set search_path = public`인지
- `members`, `member_passes`, `attendance_logs`, `member_notes`, `audit_logs`가 broad `for all manage`가 아니라 역할별 policy인지
- `check_in_member` kiosk source는 service role 요청만 허용하는지
- `cancel_attendance`, `adjust_remaining_sessions`는 owner/admin만 실행 가능한지
- `CREATE POLICY IF NOT EXISTS` 구문이 남아 있지 않은지

### 4. Kiosk logging / PIN pepper

`.env.local`에 아래 값을 추가해줘.

```bash
MEMBER_PIN_PEPPER=긴-랜덤-문자열
```

기존 PIN hash는 legacy 방식도 허용되도록 backward compatible하게 유지되어야 한다.
새로 저장되는 PIN은 pepper가 포함된 hash를 사용해야 한다.

`kiosk_attempt_logs`에는 다음 이벤트가 기록될 수 있어야 한다.

- `found`
- `not_found`
- `too_many`
- `blocked`
- `pin_failed`
- `checked_in`
- `error`

## 검증 명령

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm build
```

## 빌드 결과 확인

`pnpm build` 결과에서 아래 페이지가 static route로 나오면 실패다.

- `/dashboard`
- `/attendance/today`
- `/members/new`
- `/settings/staff`
- `/kiosk`
- `/kiosk/search`
- `/kiosk/confirm`
- `/kiosk/success`

이 페이지들은 dynamic route로 처리되어야 한다.

## 브라우저 QA

1. 로그아웃 상태에서 `/dashboard` 접근 → `/login`으로 redirect
2. 로그아웃 상태에서 `/members` 접근 → `/login`으로 redirect
3. `/kiosk` 접근 시 unlock cookie가 없으면 `/kiosk/unlock`으로 redirect
4. `/kiosk/unlock`에서 직원 PIN 입력 → `/kiosk` 접근 가능
5. 전화번호 끝 4자리 검색 → 후보 표시
6. 개인 PIN 실패 → 오류 메시지 + `kiosk_attempt_logs.pin_failed`
7. 개인 PIN 성공 → 출석 체크 + 잔여 횟수 차감 + `kiosk_attempt_logs.checked_in`
8. admin이 `/attendance/today`에서 출석 취소 → 잔여 횟수 복구 + audit log 저장
9. coach/front_desk가 잔여횟수 조정 시도 → 권한 없음
10. owner/admin이 잔여횟수 조정 RPC 실행 → 성공
