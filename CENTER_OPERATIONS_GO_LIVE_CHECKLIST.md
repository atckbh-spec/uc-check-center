# Center Operations Go-Live Checklist

## Blockers

- [ ] `.env.local`, `.env*.local`, `.env.production.local` are not included in code or ZIP packages.
- [ ] `NEXT_PUBLIC_DEMO_MODE=false`.
- [ ] `KIOSK_UNLOCK_PIN` is numeric and at least 6 digits.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is configured only as a server-side environment variable.
- [ ] No `NEXT_PUBLIC_*SERVICE_ROLE*` variable exists.
- [ ] `/dashboard` blocks unauthenticated access.
- [ ] `/kiosk` does not expose full phone numbers or member notes.
- [ ] Duplicate same-day attendance is blocked.
- [ ] Attendance cancellation restores remaining session count.

## v1 Workflows

- [ ] 출석
- [ ] 회원권
- [ ] 키오스크
- [ ] 출석 취소
- [ ] 잔여횟수 조정
- [ ] 노쇼
- [ ] 메모
- [ ] 재등록 대상
- [ ] 장기 미방문
- [ ] 월간 리포트

## Commands

```bash
npm run typecheck
npm run lint
npm run build
npm run qa:build-output
npm run security:static
npm run center:preflight
```
