# UC Check Center Operations v1

UC Check v1 is an internal Urban Conditioning center operations system. It is not packaged as an external sales SaaS product.

## v1 Scope

The v1 scope is fixed to these center workflows:

- 출석
- 회원권
- 키오스크
- 출석 취소
- 잔여횟수 조정
- 노쇼
- 메모
- 재등록 대상
- 장기 미방문
- 월간 리포트

## Out Of Scope Until v1.1+

These items are intentionally deferred:

- 예약
- 결제
- 카카오 알림
- 회원용 마이페이지
- SCL Signal 연동
- 복수 센터 운영

## Environment Policy

Real operating values must be stored only in Vercel and Supabase environment variable settings.

Do not commit or ZIP these files:

- `.env.local`
- `.env*.local`
- `.env.production.local`

`NEXT_PUBLIC_DEMO_MODE` must be `false` for center go-live.

`KIOSK_UNLOCK_PIN` must be numeric and at least 6 digits for center operations.

`SUPABASE_SERVICE_ROLE_KEY` must never be exposed through a `NEXT_PUBLIC_` variable.

## Center Launch Checks

Run:

```bash
npm install
npm run typecheck
npm run lint
npm run build
npm run qa:build-output
npm run security:static
npm run center:preflight
```

Before live use, confirm:

- `/dashboard` redirects unauthenticated users to login.
- `/kiosk` does not expose full phone numbers or member notes.
- duplicate same-day attendance is blocked.
- canceling attendance restores the deducted remaining session count.
