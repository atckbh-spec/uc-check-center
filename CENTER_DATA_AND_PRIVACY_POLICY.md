# Center Data And Privacy Policy

UC Check stores data for Urban Conditioning internal center operations only.

## Data Principles

- Collect only what staff need to operate attendance, passes, follow-up, and reports.
- Keep full phone numbers away from kiosk screens.
- Keep member notes staff-only.
- Do not expose audit logs to members or kiosk screens.
- Do not store real secrets in source code, ZIP files, screenshots, or shared documents.

## Environment Secrets

Store real values only in Vercel and Supabase settings:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_DEMO_MODE`
- `KIOSK_UNLOCK_PIN`
- `KIOSK_COOKIE_SECRET`
- `MEMBER_PIN_PEPPER`

`SUPABASE_SERVICE_ROLE_KEY` is server-only.

## QA Seed Data

`supabase/006_qa_seed_data.sql` is QA/UAT-only and must not be applied to the live center database.
