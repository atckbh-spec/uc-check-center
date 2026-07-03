# UC Check 운영 안정화 패치 노트

## 패치 이름

`Security / Auth / RLS Hardening Patch`

## 목적

이 패치는 Demo 1, Demo 2, Demo 3 이후 실제 운영 배포 전에 반드시 막아야 하는 blocker를 제거한다.

## 핵심 변경

### 1. Production build demo 우회 제거

변경 파일:

- `lib/config/env.ts`
- `lib/auth/require-staff.ts`

변경 내용:

- `shouldUseDemoData()`가 production build phase를 더 이상 참조하지 않는다.
- `getCurrentStaffUser()`가 production build phase에서 demo staff를 반환하지 않는다.
- 데모 데이터는 `NEXT_PUBLIC_DEMO_MODE=true`일 때만 사용된다.

### 2. Staff/Kiosk 페이지 dynamic 강제

변경 파일:

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

추가 내용:

```ts
export const dynamic = "force-dynamic";
```

### 3. Supabase RLS helper 보강

변경 파일:

- `supabase/001_schema.sql`
- `supabase/002_security_hardening.sql`
- `supabase/004_operational_hardening.sql`

보강 내용:

- `current_staff_organization_id()`
- `current_staff_role()`
- `current_staff_id()`

위 helper를 `security definer` + `set search_path = public`로 고정했다.

### 4. RLS policy 세분화

새 migration:

- `supabase/004_operational_hardening.sql`

내용:

- 기존 broad `staff can manage ... for all` policy 제거
- `select`, `insert`, `update` 역할별 분리
- `delete` 기본 차단
- 회원권/잔여횟수 수정은 RPC 중심으로 제한
- audit logs 조회는 owner/admin 중심으로 제한

### 5. Kiosk attempt logging 추가

새 파일:

- `lib/kiosk/attempt-log.ts`

변경 파일:

- `lib/kiosk/queries.ts`
- `lib/kiosk/actions.ts`

기록 이벤트:

- `found`
- `not_found`
- `too_many`
- `blocked`
- `pin_failed`
- `checked_in`
- `error`

### 6. Member PIN pepper 추가

변경 파일:

- `lib/utils/member-pin.ts`
- `.env.example`

추가 env:

```bash
MEMBER_PIN_PEPPER=replace-with-a-long-random-secret
```

기존 legacy hash도 계속 허용되도록 `verifyMemberPinHash()`를 추가했다.

### 7. Audit log 실패 처리

변경 파일:

- `lib/audit/actions.ts`

감사 로그 insert 실패 시 조용히 넘어가지 않고 error를 throw한다.

### 8. 서버 액션 권한 강화

변경 파일:

- `lib/members/actions.ts`
- `lib/passes/actions.ts`
- `lib/staff/actions.ts`

변경 내용:

- 회원 생성/수정: owner/admin/front_desk
- 회원권 생성: owner/admin/front_desk
- 담당 코치 변경: owner/admin
- 잔여횟수 조정: owner/admin 유지

### 9. Deprecated migration 정리

변경 파일:

- `supabase/01_security_hardening.sql`
- `supabase/02_member_registration_fields.sql`
- `supabase/20260629_kiosk_demo1_hardening.sql`

해당 파일들은 실행용 SQL이 아니라 deprecated 안내 파일로 바뀌었다.

## 검증 상태

이 환경에는 `node_modules`와 `pnpm`이 없어서 실제 `pnpm typecheck`, `pnpm lint`, `pnpm build`는 실행하지 못했다.
대신 정적 파일 검사를 통해 아래는 확인했다.

- 보호 페이지에 `export const dynamic = "force-dynamic"` 삽입됨
- `isProductionBuildPhase` 인증 우회 제거됨
- `CREATE POLICY IF NOT EXISTS` 제거됨
- `004_operational_hardening.sql` 생성됨
- `MEMBER_PIN_PEPPER` env 추가됨

로컬/Codex에서는 반드시 아래를 실행한다.

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm build
```
