# UC Check Center Operations Hosting Notes

This document is the technical hosting note for Urban Conditioning internal center operations v1.

Use `README_CENTER_OPERATIONS.md` as the primary launch document. Use this file only for Vercel + Supabase hosting details.

## Required Checks

```bash
npm install
npm run typecheck
npm run lint
npm run build
npm run qa:build-output
npm run security:static
npm run center:preflight
```

## Environment Management

Real operating values must be configured only in Vercel and Supabase settings.

Do not commit or package:

- `.env.local`
- `.env*.local`
- `.env.production.local`

Required operating values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_DEMO_MODE=false`
- `KIOSK_UNLOCK_PIN`
- `KIOSK_COOKIE_SECRET`
- `MEMBER_PIN_PEPPER`

`SUPABASE_SERVICE_ROLE_KEY` is server-only and must never use a `NEXT_PUBLIC_` prefix.

## Database Notes

Apply production/staging schema migrations only after backup and review.

Do not apply `supabase/006_qa_seed_data.sql` to the live center database. It is QA/UAT-only.

After applying `supabase/008_security_qa_assertions.sql` to staging or live DB, run:

```bash
npm run security:db
```

## Route Checks

After a real URL exists:

```bash
UC_CHECK_PRODUCTION_URL=https://<center-domain> npm run security:routes
```

Confirm:

- `/dashboard` blocks unauthenticated users.
- `/kiosk` does not expose full phone numbers or member notes.
