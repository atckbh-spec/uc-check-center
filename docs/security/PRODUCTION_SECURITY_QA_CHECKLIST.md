# UC Check Production Security QA Checklist

이 문서는 실제 Urban Conditioning 운영 배포 전 마지막 보안/권한 점검표입니다.

## 1. Go / No-Go 기준

아래 항목 중 하나라도 실패하면 production 배포를 보류합니다.

```text
비로그인 사용자가 /dashboard, /members, /settings/staff에 접근 가능
보호 페이지가 next build 결과에서 static HTML로 생성됨
NEXT_PUBLIC_DEMO_MODE=true로 production 배포됨
서비스 롤 키가 NEXT_PUBLIC_* 환경변수로 노출됨
키오스크 잠금 해제 없이 /kiosk 출석 화면 접근 가능
회원 메모 또는 전체 전화번호가 /kiosk에 노출됨
anon/public이 check_in_member, cancel_attendance, adjust_remaining_sessions 실행 가능
coach/front_desk가 audit_logs 데이터를 직접 조회 가능
잔여횟수 조정 또는 출석 취소가 audit_logs 없이 처리됨
```

## 2. 필수 명령

로컬 또는 CI에서 순서대로 실행합니다.

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm build
pnpm qa:build-output
pnpm deploy:preflight
pnpm security:static
```

실제 배포 URL이 생긴 뒤 실행합니다.

```bash
UC_CHECK_PRODUCTION_URL=https://<production-domain> pnpm deploy:smoke
UC_CHECK_PRODUCTION_URL=https://<production-domain> pnpm security:live
```

Supabase 역할 테스트 계정이 준비된 경우 실행합니다.

```bash
pnpm security:roles
```

## 3. 관리자 페이지 보호 확인

비로그인 브라우저 또는 시크릿 창에서 아래 URL을 직접 입력합니다.

```text
/dashboard
/attendance/today
/members
/members/new
/reports/monthly
/settings/staff
```

기대 결과:

```text
/login으로 이동하거나 로그인 화면만 보여야 함
대시보드, 회원명, 전화번호, 직원 목록, 출석 기록이 보이면 실패
```

## 4. 키오스크 보호 확인

브라우저 쿠키를 삭제하거나 시크릿 창에서 확인합니다.

```text
/kiosk
/kiosk/search
/kiosk/confirm
/kiosk/admin
```

기대 결과:

```text
/kiosk/unlock으로 이동하거나 잠금 해제 안내가 보여야 함
전화번호 뒷 4자리 입력 화면이 바로 보이면 실패
```

## 5. 개인정보 노출 확인

키오스크에서 보이면 안 되는 정보:

```text
전체 전화번호
회원 메모
결제 관련 메모
직원 내부 메모
audit log
다른 회원 상세 정보
Supabase error stack trace
```

키오스크에서 허용되는 정보:

```text
마스킹된 이름
마스킹된 전화번호
활성 회원권명
잔여횟수
출석 가능/불가 상태
```

## 6. Supabase RPC 권한 확인

아래 RPC는 anon/public에게 열려 있으면 안 됩니다.

```text
check_in_member
cancel_attendance
adjust_remaining_sessions
```

키오스크 출석은 반드시 서버 액션에서 service role로만 처리되어야 합니다.

## 7. 역할별 권한 요약

| 기능 | Owner | Admin | Coach | Front Desk |
|---|---:|---:|---:|---:|
| 대시보드 조회 | O | O | O | O |
| 회원 조회 | O | O | O | O |
| 회원 생성 | O | O | X | O |
| 회원 수정 | O | O | X 또는 제한 | O |
| 회원권 생성 | O | O | X | O |
| 잔여횟수 조정 | O | O | X | X |
| 출석 체크 | O | O | O | O |
| 출석 취소 | O | O | X | X |
| 노쇼 기록 | O | O | O | O |
| 직원 관리 | O | 제한 | X | X |
| 감사 로그 조회 | O | O | X | X |

## 8. 배포 승인 조건

배포 승인 전 아래를 모두 체크합니다.

```text
[ ] pnpm build 통과
[ ] pnpm qa:build-output 통과
[ ] pnpm deploy:preflight 통과
[ ] pnpm security:static 통과
[ ] production URL에서 security:live 통과
[ ] Owner 로그인 성공
[ ] Staff 초대/비활성화 테스트 성공
[ ] 키오스크 잠금 해제 성공
[ ] 키오스크 체크인 성공
[ ] 중복 출석 방지 성공
[ ] 출석 취소 후 잔여횟수 복구 성공
[ ] 회원 메모가 키오스크에 노출되지 않음
```
