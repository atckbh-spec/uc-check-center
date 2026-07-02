# UC Check Security Go / No-Go

## Go 조건

아래 조건이 모두 충족되면 제한적 현장 운영 테스트를 시작할 수 있다.

```bash
pnpm typecheck
pnpm lint
pnpm build
pnpm qa:build-output
pnpm deploy:preflight
pnpm security:static
pnpm security:db
UC_CHECK_PRODUCTION_URL=https://<production-domain> pnpm security:routes
```

모든 명령이 통과해야 한다.

## No-Go 조건

아래 중 하나라도 해당하면 배포 또는 현장 테스트를 중단한다.

### 인증/라우팅

- 비로그인 사용자가 `/dashboard` 내용을 볼 수 있음
- `/members/new`, `/settings/staff`, `/attendance/today` static HTML 생성
- kiosk unlock 없이 `/kiosk` 접근 가능

### 데이터/RLS

- 주요 테이블 RLS 비활성화
- legacy `staff can manage ... for all` policy 존재
- `check_in_member`, `cancel_attendance`, `adjust_remaining_sessions`가 anon/PUBLIC에 열림
- `current_staff_*` helper가 `SECURITY DEFINER`가 아님
- kiosk check-in이 service role path를 요구하지 않음

### 개인정보

- 키오스크에 전체 전화번호 노출
- 키오스크에 회원 메모 노출
- public page에 service role/secret 문자열 노출

### 운영 기능

- 중복 출석 방지 실패
- 출석 취소 시 잔여횟수 복구 실패
- Coach 또는 Front Desk가 잔여횟수 조정 가능
- audit log 저장 실패가 조용히 무시됨

## 승인 기록

운영 전 아래 항목을 기록한다.

| 항목 | 값 |
|---|---|
| 배포 URL |  |
| Supabase project |  |
| Vercel deployment id |  |
| QA 실행일 |  |
| QA 담당자 |  |
| 승인자 |  |
| Go / No-Go |  |
| 비고 |  |
