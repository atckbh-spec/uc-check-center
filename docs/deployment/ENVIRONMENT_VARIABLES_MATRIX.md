# UC Check 환경변수 매트릭스

운영 배포에서 가장 흔한 사고는 잘못된 환경변수입니다.
특히 `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_DEMO_MODE`, kiosk secret 값은 배포 전 반드시 확인합니다.

## 1. 필수 변수

| 변수 | Development | Preview | Production | 클라이언트 노출 | 필수 |
|---|---|---|---|---:|---:|
| `NEXT_PUBLIC_SUPABASE_URL` | local/dev Supabase | QA Supabase | Production Supabase | O | O |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | dev anon | QA anon | prod anon | O | O |
| `SUPABASE_SERVICE_ROLE_KEY` | dev service role | QA service role | prod service role | X | O |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | preview URL | production URL | O | O |
| `NEXT_PUBLIC_DEMO_MODE` | 필요 시 true | false | false | O | O |
| `KIOSK_UNLOCK_PIN` | 테스트 PIN | QA PIN | 운영 PIN | X | O |
| `KIOSK_COOKIE_SECRET` | dev secret | QA secret | prod secret | X | O |
| `MEMBER_PIN_PEPPER` | dev pepper | QA pepper | prod pepper | X | O |

## 2. 운영 환경 금지값

운영에서는 아래 값이 하나라도 있으면 배포를 중단합니다.

```text
NEXT_PUBLIC_DEMO_MODE=true
KIOSK_UNLOCK_PIN=123456
KIOSK_UNLOCK_PIN=000000
KIOSK_COOKIE_SECRET=replace-with-long-random-string
KIOSK_COOKIE_SECRET=changeme
MEMBER_PIN_PEPPER=replace-with-a-long-random-secret
MEMBER_PIN_PEPPER=changeme
SUPABASE_SERVICE_ROLE_KEY 누락
```

## 3. 길이 기준

| 변수 | 최소 길이 | 권장 |
|---|---:|---|
| `KIOSK_UNLOCK_PIN` | 6 | 숫자 6~10자리 |
| `KIOSK_COOKIE_SECRET` | 32 | `openssl rand -base64 48` |
| `MEMBER_PIN_PEPPER` | 32 | `openssl rand -base64 48` |

## 4. Vercel에 넣는 방법

Dashboard 기준:

```text
Project Settings
→ Environment Variables
→ 변수명 입력
→ 값 입력
→ Environment 선택: Production / Preview / Development
→ Save
```

CLI 기준:

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add NEXT_PUBLIC_APP_URL production
vercel env add NEXT_PUBLIC_DEMO_MODE production
vercel env add KIOSK_UNLOCK_PIN production
vercel env add KIOSK_COOKIE_SECRET production
vercel env add MEMBER_PIN_PEPPER production
```

## 5. 환경변수 로컬 확인

```bash
pnpm deploy:preflight
```

`.env.local`, `.env.production.local`, 현재 shell 환경변수를 함께 검사합니다.
