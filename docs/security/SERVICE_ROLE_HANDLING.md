# Service Role Key Handling

`SUPABASE_SERVICE_ROLE_KEY`는 Supabase RLS를 우회할 수 있는 높은 권한의 키다. UC Check에서는 이 키를 서버 전용으로만 사용한다.

## 허용 위치

- Vercel Production Environment Variable
- 로컬 `.env.local`
- trusted CI secret
- `lib/supabase/admin.ts`
- server-only scripts

## 금지 위치

- `NEXT_PUBLIC_` prefix 환경변수
- `app/**` client component
- `components/**`
- 브라우저 bundle
- Git 저장소에 실제 값 커밋
- 키오스크 화면 또는 응답

## 자동 검사

```bash
pnpm security:static
```

검사 항목:

- `app` / `components`에서 `SUPABASE_SERVICE_ROLE_KEY` 사용 여부
- `createSupabaseAdminClient`를 UI layer에서 import하는지 여부
- `NEXT_PUBLIC_*SERVICE_ROLE*` 환경변수 사용 여부

## 운영 환경변수 기준

필수:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_DEMO_MODE=false
KIOSK_UNLOCK_PIN=
KIOSK_COOKIE_SECRET=
MEMBER_PIN_PEPPER=
```

금지:

```bash
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SERVICE_ROLE_KEY=
NEXT_PUBLIC_MEMBER_PIN_PEPPER=
NEXT_PUBLIC_KIOSK_COOKIE_SECRET=
```

## No-Go

- service role key가 `NEXT_PUBLIC_` prefix로 설정됨
- production browser source에서 service role key 문자열 확인됨
- app/components에서 admin client import 확인됨
- `pnpm deploy:preflight` 또는 `pnpm security:static` 실패
