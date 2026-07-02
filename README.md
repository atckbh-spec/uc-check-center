# UC Check

Urban Conditioning 전용 출석 체크 웹앱입니다. 현장 태블릿 키오스크, 직원 대시보드, 회원/회원권 관리, 출석 리포트, 직원 권한 관리를 포함합니다.

## 실행 준비

```bash
pnpm install
cp .env.example .env.local
```

`.env.local`에 실제 값을 입력합니다.

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
- production build phase에서는 더 이상 demo staff/demo data로 인증을 우회하지 않습니다.
- Supabase 환경변수가 없다고 자동으로 데모 모드가 되지 않습니다.
- production에서는 `KIOSK_UNLOCK_PIN`이 6자리 이상이어야 합니다.
- `KIOSK_COOKIE_SECRET`과 `MEMBER_PIN_PEPPER`는 운영 환경에서 긴 랜덤 문자열로 설정합니다.
- `SUPABASE_SERVICE_ROLE_KEY`는 서버 액션에서만 사용하며 클라이언트에 노출하지 않습니다.

## Supabase SQL 적용 순서

새 Supabase DB를 만드는 경우 아래 순서로 적용합니다.

1. `supabase/001_schema.sql`
2. `supabase/002_security_hardening.sql`
3. `supabase/003_member_registration_fields.sql`
4. `supabase/004_operational_hardening.sql`
5. `supabase/20260629_staff_command_dashboard_indexes.sql`
6. `supabase/005_operations_ui_support.sql`

기존 DB를 운영 중인 경우 아래 순서로 적용합니다.

1. 현재 DB 백업
2. `supabase/002_security_hardening.sql`
3. `supabase/003_member_registration_fields.sql`
4. `supabase/004_operational_hardening.sql`
5. `supabase/20260629_staff_command_dashboard_indexes.sql`
6. `supabase/005_operations_ui_support.sql`

중요:

- 기존 DB에는 전체 `schema.sql`을 다시 실행하지 마세요.
- `supabase/schema.sql`은 참고용 통합 스냅샷입니다. 실제 적용은 위 migration 순서를 우선합니다.
- `supabase/01_security_hardening.sql`, `supabase/02_member_registration_fields.sql`, `supabase/20260629_kiosk_demo1_hardening.sql`은 이전 패치 호환용 파일입니다. 새 환경에서는 위 순서의 `001~005` 파일을 사용하세요.
- `004_operational_hardening.sql`은 broad `for all` RLS policy를 역할별 policy로 세분화하고, `current_staff_*` helper를 `security definer`로 고정합니다.

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

빌드 후 확인해야 하는 핵심 사항:

- `/dashboard`, `/attendance/today`, `/members/new`, `/settings/staff`가 static route로 출력되지 않아야 합니다.
- 로그인하지 않은 상태에서 staff 페이지 접근 시 `/login`으로 redirect되어야 합니다.
- `/kiosk`는 unlock cookie가 없으면 `/kiosk/unlock`으로 redirect되어야 합니다.

## Center Operations Launch

Use `README_CENTER_OPERATIONS.md` as the entry point for Urban Conditioning internal center launch.

- `README_CENTER_OPERATIONS.md`: center operations v1 scope and launch flow
- `CENTER_OPERATIONS_GO_LIVE_CHECKLIST.md`: go-live checklist
- `CENTER_STAFF_OPERATION_MANUAL.md`: staff operation manual
- `CENTER_DATA_AND_PRIVACY_POLICY.md`: center data and privacy policy
- `CENTER_UPDATE_ROADMAP.md`: v1.1+ update roadmap
- `README_DEPLOYMENT.md`: technical Vercel + Supabase hosting notes

Run center launch checks with:

```bash
npm run center:check
```

Run center preflight only with:

```bash
npm run center:preflight
```

Do not apply `supabase/006_qa_seed_data.sql` to the live center database. It is for QA/UAT data only.
