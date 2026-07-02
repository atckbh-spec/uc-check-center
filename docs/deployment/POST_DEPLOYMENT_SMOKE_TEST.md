# 배포 후 Smoke Test

## 1. 자동 smoke test

```bash
UC_CHECK_PRODUCTION_URL=https://<production-domain> pnpm deploy:smoke
```

통과 기준:

```text
공개 페이지 응답
보호 staff 페이지 비로그인 차단
키오스크 unlock 전 접근 차단
```

## 2. 브라우저 수동 확인

비로그인 브라우저 또는 시크릿 창에서 확인합니다.

```text
/dashboard → /login redirect
/members/new → /login redirect
/settings/staff → /login redirect
/attendance/today → /login redirect
```

## 3. Owner 계정 확인

```text
/login
→ owner 이메일/비밀번호 입력
→ /dashboard 접근
→ /settings/staff 접근
```

## 4. 현장 키오스크 확인

```text
/kiosk
→ /kiosk/unlock redirect
→ PIN 입력
→ /kiosk 접근
→ 전화번호 끝 4자리 입력
→ 후보 선택
→ 출석 완료
→ 5초 후 초기화
```

## 5. 데이터 무결성 확인 SQL

```sql
select attendance_date, source, status, count(*)
from public.attendance_logs
where created_at >= now() - interval '1 day'
group by attendance_date, source, status
order by attendance_date desc;
```

```sql
select pass_name, total_sessions, used_sessions, remaining_sessions, status
from public.member_passes
where remaining_sessions < 0;
```

결과가 없어야 합니다.

## 6. 개인정보 노출 확인

키오스크에서 다음이 보이면 실패입니다.

```text
전체 전화번호
회원 메모
결제 메모
관리자 메모
다른 회원 상세정보
```
