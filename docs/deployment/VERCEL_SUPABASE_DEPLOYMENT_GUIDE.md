# UC Check Vercel + Supabase 실제 배포 가이드

이 문서는 UC Check를 실제 Urban Conditioning 운영 환경에 배포하기 위한 기준 절차입니다.
목표는 “배포 성공”이 아니라 다음 조건을 만족하는 것입니다.

```text
비로그인 사용자는 staff 화면에 접근할 수 없다.
키오스크는 잠금 해제 후에만 사용할 수 있다.
출석 체크와 잔여횟수 차감은 서버/RPC에서만 처리된다.
운영 DB에 QA seed data가 들어가지 않는다.
배포 후 문제가 생기면 즉시 rollback할 수 있다.
```

---

## 1. 운영 환경 구조

권장 운영 구조:

```text
GitHub Repository
  ↓
Vercel Project
  ↓
Next.js App Router Web App
  ↓
Supabase Project
  ├─ PostgreSQL
  ├─ Supabase Auth
  ├─ RLS Policies
  └─ RPC Functions
```

Vercel에는 Production, Preview, Development 환경변수를 분리해서 설정합니다.
Supabase는 최소한 `local/dev`, `QA`, `production` DB를 분리하는 것이 좋습니다.

---

## 2. 사전 준비

필요 계정:

```text
GitHub 계정
Vercel 계정
Supabase 계정
운영자 이메일 계정
```

로컬 필요 도구:

```bash
node --version
pnpm --version
npx vercel --version
npx supabase --version
```

권장:

```text
Node.js 20 LTS 이상
pnpm 사용
Supabase CLI 설치
Vercel CLI 설치
```

---

## 3. Supabase 운영 프로젝트 생성

Supabase에서 운영용 프로젝트를 새로 만듭니다.
프로젝트 이름 예시:

```text
uc-check-production
```

Region은 실제 사용자가 한국에 있으므로 가능한 가까운 region을 선택합니다.
프로젝트 생성 후 다음 값을 확보합니다.

```text
Project URL
Anon public key
Service role key
Database password
Project reference ID
```

주의:

```text
service_role key는 절대 클라이언트 코드, 브라우저, Git 저장소에 노출하지 않습니다.
```

---

## 4. Supabase migration 적용

운영 DB에는 QA seed를 넣지 않습니다.
새 운영 DB 기준 migration 순서:

```bash
# 방법 A: SQL Editor에서 순서대로 실행
supabase/001_schema.sql
supabase/002_security_hardening.sql
supabase/003_member_registration_fields.sql
supabase/004_operational_hardening.sql
supabase/20260629_staff_command_dashboard_indexes.sql
supabase/005_operations_ui_support.sql
```

CLI를 사용하는 경우:

```bash
supabase login
supabase link --project-ref <production-project-ref>
supabase db push
supabase migration list
```

중요:

```text
supabase/006_qa_seed_data.sql은 운영 DB에 적용하지 않습니다.
supabase/schema.sql은 참고용 통합 스냅샷이며, 운영 적용 기준은 migration 파일 순서입니다.
01_security_hardening.sql, 02_member_registration_fields.sql, 20260629_kiosk_demo1_hardening.sql은 deprecated 호환 파일입니다.
```

---

## 5. 최초 조직과 Owner 연결

Supabase Auth에서 운영자 이메일 계정을 생성합니다.
그 다음 SQL Editor에서 아래 순서로 연결합니다.

```sql
insert into public.organizations (name, slug)
values ('Urban Conditioning', 'urban-conditioning')
returning id;
```

반환된 organization id와 Auth user id를 사용합니다.

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

확인 쿼리:

```sql
select id, name, email, role, is_active
from public.staff_users
where role = 'owner';
```

---

## 6. Vercel 프로젝트 생성

Vercel에서 GitHub repository를 연결합니다.
Framework preset은 Next.js로 자동 감지되면 그대로 사용합니다.

기본 설정:

```text
Install Command: pnpm install
Build Command: pnpm build
Output Directory: .next
```

Production branch는 보통 `main`을 사용합니다.

---

## 7. Vercel 환경변수 설정

Vercel Project Settings → Environment Variables에 아래 값을 설정합니다.
Production 환경 기준:

| 변수 | Production 값 | 공개 여부 | 설명 |
|---|---|---:|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` | Public | Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key | Public | RLS 적용된 public key |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key | Secret | 서버 전용 |
| `NEXT_PUBLIC_APP_URL` | production 도메인 | Public | 앱 URL |
| `NEXT_PUBLIC_DEMO_MODE` | `false` | Public | 운영에서는 false |
| `KIOSK_UNLOCK_PIN` | 6자리 이상 | Secret | 태블릿 잠금 해제 PIN |
| `KIOSK_COOKIE_SECRET` | 긴 랜덤 문자열 | Secret | kiosk cookie 서명용 |
| `MEMBER_PIN_PEPPER` | 긴 랜덤 문자열 | Secret | 회원 PIN hash pepper |

랜덤 문자열 생성 예:

```bash
openssl rand -base64 48
```

운영 금지값:

```text
NEXT_PUBLIC_DEMO_MODE=true
KIOSK_UNLOCK_PIN=123456
KIOSK_COOKIE_SECRET=replace-with-long-random-string
MEMBER_PIN_PEPPER=replace-with-a-long-random-secret
```

---

## 8. 로컬 production preflight

배포 전 로컬에서 운영용 환경변수와 동일한 값을 `.env.production.local` 또는 `.env.local`에 넣고 확인합니다.

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm build
pnpm qa:build-output
pnpm deploy:preflight
```

`pnpm qa:build-output`은 보호 페이지가 static HTML로 생성됐는지 확인합니다.
`pnpm deploy:preflight`는 환경변수의 위험한 기본값과 누락 값을 검사합니다.

---

## 9. Preview 배포 확인

GitHub branch를 push해서 Vercel Preview deployment를 만듭니다.
Preview 환경변수는 Production과 다른 Supabase QA 프로젝트를 가리키는 것이 안전합니다.

Preview에서 확인:

```bash
UC_CHECK_PRODUCTION_URL=https://<preview-url> pnpm deploy:smoke
```

브라우저 확인:

```text
/ 접속
/login 접속
/dashboard 비로그인 접근 → /login redirect
/kiosk 접근 → /kiosk/unlock redirect
```

---

## 10. Production 배포

Preview 테스트가 통과하면 main branch로 merge합니다.
또는 CLI 배포를 사용하는 경우:

```bash
vercel --prod
```

배포 직후 확인:

```bash
UC_CHECK_PRODUCTION_URL=https://<production-domain> pnpm deploy:smoke
```

Vercel dashboard에서 확인:

```text
Build succeeded
Environment = Production
NEXT_PUBLIC_DEMO_MODE=false
Production domain 연결 정상
```

---

## 11. 현장 태블릿 설정

태블릿 브라우저에서 접속:

```text
https://<production-domain>/kiosk/unlock
```

권장 설정:

```text
브라우저 자동완성 끄기
홈 화면 바로가기 추가
화면 자동잠금 시간 길게 설정
운영 중 관리자 페이지 접근 금지
키오스크 PIN은 스태프만 알고 있기
```

태블릿 테스트:

```text
1. /kiosk/unlock에서 PIN 입력
2. /kiosk 이동 확인
3. 테스트 회원 전화번호 끝 4자리 입력
4. 후보 선택
5. PIN 확인 또는 출석 확인
6. 출석 완료
7. 5초 후 초기화
```

---

## 12. 배포 후 모니터링

배포 당일 확인 항목:

```text
스태프 로그인 성공률
키오스크 unlock 실패 횟수
전화번호 끝 4자리 후보 없음 발생 빈도
PIN 실패 횟수
중복 출석 차단 여부
출석 취소 발생 건수
잔여횟수 조정 발생 건수
Supabase RPC error
Vercel function error
```

초기 운영 1주일 동안은 매일 마감 후 다음을 확인합니다.

```sql
select status, source, count(*)
from public.attendance_logs
where attendance_date = current_date
 group by status, source;
```

```sql
select action, count(*)
from public.audit_logs
where created_at >= now() - interval '1 day'
 group by action
 order by count(*) desc;
```

---

## 13. Rollback 기준

아래 중 하나라도 발생하면 즉시 rollback을 고려합니다.

```text
비로그인 사용자가 /dashboard 접근 가능
회원 메모가 /kiosk에 노출
키오스크 출석 시 잔여횟수 중복 차감
출석 취소 후 잔여횟수 복구 실패
운영자가 로그인할 수 없음
Supabase RPC 전체 실패
```

Vercel rollback:

```bash
vercel rollback <previous-production-deployment-url>
```

DB migration 문제는 자동 rollback되지 않습니다.
DB 변경 전에는 반드시 SQL과 백업 상태를 남겨야 합니다.

---

## 14. 공식 문서 참고

- Vercel Environment Variables: https://vercel.com/docs/environment-variables
- Vercel Rollback: https://vercel.com/docs/cli/rollback
- Supabase CLI: https://supabase.com/docs/reference/cli/introduction
- Supabase Database Migrations: https://supabase.com/docs/guides/deployment/database-migrations
- Supabase Managing Environments: https://supabase.com/docs/guides/deployment/managing-environments
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
