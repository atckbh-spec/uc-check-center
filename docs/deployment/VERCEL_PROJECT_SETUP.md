# Vercel 프로젝트 설정 가이드

## 1. GitHub 연결

Vercel에서 UC Check repository를 import합니다.
Framework preset은 Next.js로 설정합니다.

권장 설정:

```text
Install Command: pnpm install
Build Command: pnpm build
Output Directory: .next
Production Branch: main
```

## 2. 환경변수 설정

Production, Preview, Development 환경을 분리합니다.
Production에는 운영 Supabase 값을 넣습니다.
Preview에는 QA Supabase 값을 넣는 것이 안전합니다.

Production 필수:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_DEMO_MODE=false
KIOSK_UNLOCK_PIN
KIOSK_COOKIE_SECRET
MEMBER_PIN_PEPPER
```

## 3. Domain 연결

권장:

```text
check.urban-conditioning.example
```

`NEXT_PUBLIC_APP_URL`도 실제 production domain으로 맞춥니다.

## 4. Build 검증

Vercel build log에서 확인:

```text
Next.js build succeeded
Route output에서 staff route가 static으로 나오지 않음
NEXT_PUBLIC_DEMO_MODE=false
```

로컬에서도 다음을 먼저 통과해야 합니다.

```bash
pnpm build
pnpm qa:build-output
```

## 5. 배포 후 Smoke Test

```bash
UC_CHECK_PRODUCTION_URL=https://<production-domain> pnpm deploy:smoke
```

확인 기준:

```text
/ 응답
/login 응답
/dashboard 비로그인 redirect
/members/new 비로그인 redirect
/settings/staff 비로그인 redirect
/kiosk unlock 전 redirect
```

## 6. Rollback

장애 발생 시 이전 production deployment로 rollback합니다.

```bash
vercel rollback <previous-production-deployment-url>
```

주의:

```text
Vercel rollback은 앱 배포 rollback입니다.
Supabase DB migration은 자동으로 rollback되지 않습니다.
DB 변경은 적용 전 backup과 down plan을 별도로 준비해야 합니다.
```
