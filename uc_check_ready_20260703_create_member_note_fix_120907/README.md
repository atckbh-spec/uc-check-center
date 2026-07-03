# UC Check

Urban Conditioning 전용 출석 체크 웹앱입니다. 현장 태블릿 키오스크, 직원 대시보드, 회원/회원권 관리, 출석 리포트, 직원 권한 관리를 포함합니다.

## 실행 준비

```bash
pnpm install
cp .env.example .env.local
```

`.env.local`에는 실제 운영 값을 입력합니다.

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_APP_URL=https://your-domain.example
NEXT_PUBLIC_DEMO_MODE=false
KIOSK_UNLOCK_PIN=123456
KIOSK_COOKIE_SECRET=replace-with-long-random-string
MEMBER_PIN_PEPPER=replace-with-another-long-random-string
```

보안 기준:
- `NEXT_PUBLIC_DEMO_MODE=true`일 때만 데모 모드가 켜집니다.
- production build phase에서 demo staff/demo data로 인증을 우회하지 않습니다.
- Supabase 환경변수가 없다고 자동으로 데모 모드가 되지 않습니다.
- production에서는 `KIOSK_UNLOCK_PIN`이 6자리 이상이어야 합니다.
- `KIOSK_COOKIE_SECRET`과 `MEMBER_PIN_PEPPER`는 운영 환경에서 긴 랜덤 문자열로 설정합니다.
- `SUPABASE_SERVICE_ROLE_KEY`는 서버 액션에서만 사용하고 클라이언트에 노출하지 않습니다.

## Supabase SQL 적용 순서

새 Supabase DB를 만드는 경우 아래 순서로 적용합니다.

1. `supabase/001_schema.sql`
2. `supabase/002_security_hardening.sql`
3. `supabase/003_member_registration_fields.sql`
4. `supabase/004_operational_hardening.sql`
5. `supabase/20260629_staff_command_dashboard_indexes.sql`

기존 DB를 운영 중인 경우 전체 `schema.sql`을 다시 실행하지 말고, 백업 후 migration만 순서대로 적용합니다.

1. `supabase/002_security_hardening.sql`
2. `supabase/003_member_registration_fields.sql`
3. `supabase/004_operational_hardening.sql`
4. `supabase/20260629_staff_command_dashboard_indexes.sql`

중요:
- `supabase/schema.sql`은 전체 기준 스키마 참고용입니다.
- `supabase/01_security_hardening.sql`, `supabase/02_member_registration_fields.sql`, `supabase/20260629_kiosk_demo1_hardening.sql`은 이전 패치 호환용 파일입니다. 신규 운영 배포에서는 위의 `001~004` 순서를 사용합니다.
- `004_operational_hardening.sql`은 broad `for all` RLS policy를 제거하고 역할별 policy로 세분화하며, `current_staff_*` helper를 `security definer`로 고정합니다.

## 최초 조직/운영자 연결

Supabase Auth에서 운영자 계정을 만든 뒤 `organizations`, `staff_users`를 연결합니다.

```sql
insert into organizations (name, slug)
values ('Urban Conditioning', 'urban-conditioning')
returning id;

insert into staff_users (organization_id, auth_user_id, name, email, role, is_active)
values (
  '<organization_id>',
  '<auth.users.id>',
  'Owner',
  'owner@example.com',
  'owner',
  true
);
```

## 주요 경로

- `/kiosk/unlock`: 키오스크 잠금 해제
- `/kiosk`: 현장 회원 체크인
- `/kiosk/admin`: 관리자 PIN 진입
- `/dashboard`: 직원 대시보드
- `/members`: 회원 관리
- `/attendance/today`: 오늘 출석
- `/reports/monthly`: 월간 리포트
- `/settings/staff`: 직원 설정

## 검증

```bash
pnpm typecheck
pnpm lint
pnpm build
```
