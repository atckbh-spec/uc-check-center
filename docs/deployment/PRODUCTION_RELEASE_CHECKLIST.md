# UC Check Production Release Checklist

## Release 정보

```text
Release date:
Release owner:
Git commit:
Vercel deployment URL:
Supabase project ref:
Rollback deployment URL:
```

---

## 1. 코드 검증

- [ ] `pnpm install` 통과
- [ ] `pnpm typecheck` 통과
- [ ] `pnpm lint` 통과
- [ ] `pnpm build` 통과
- [ ] `pnpm qa:build-output` 통과
- [ ] `pnpm deploy:preflight` 통과
- [ ] 보호 페이지 static HTML 미생성 확인
- [ ] `.env*` 파일이 Git에 commit되지 않았는지 확인

---

## 2. Supabase 검증

- [ ] 운영 Supabase project 생성
- [ ] QA DB와 production DB 분리
- [ ] `001_schema.sql` 적용
- [ ] `002_security_hardening.sql` 적용
- [ ] `003_member_registration_fields.sql` 적용
- [ ] `004_operational_hardening.sql` 적용
- [ ] `20260629_staff_command_dashboard_indexes.sql` 적용
- [ ] `005_operations_ui_support.sql` 적용
- [ ] `006_qa_seed_data.sql` 미적용 확인
- [ ] 최초 owner staff 연결 완료
- [ ] RLS 활성화 확인
- [ ] RPC 권한 확인

---

## 3. Vercel 검증

- [ ] GitHub repo 연결
- [ ] Production branch 확인
- [ ] Environment Variables Production scope 설정
- [ ] Preview environment는 QA Supabase 사용
- [ ] `NEXT_PUBLIC_DEMO_MODE=false`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`가 client에 노출되지 않음
- [ ] Production domain 연결
- [ ] `NEXT_PUBLIC_APP_URL`이 production domain과 일치

---

## 4. 배포 후 Smoke Test

```bash
UC_CHECK_PRODUCTION_URL=https://<production-domain> pnpm deploy:smoke
```

- [ ] `/` 응답
- [ ] `/login` 응답
- [ ] `/dashboard` 비로그인 차단
- [ ] `/members/new` 비로그인 차단
- [ ] `/settings/staff` 비로그인 차단
- [ ] `/attendance/today` 비로그인 차단
- [ ] `/kiosk` unlock 전 차단 또는 unlock redirect

---

## 5. 현장 테스트

- [ ] Owner 로그인
- [ ] 신규 회원 등록
- [ ] 회원권 등록
- [ ] 스태프 직접 출석 체크
- [ ] 키오스크 unlock
- [ ] 전화번호 끝 4자리 후보 검색
- [ ] 키오스크 출석 완료
- [ ] 중복 출석 차단
- [ ] 출석 취소 후 잔여횟수 복구
- [ ] 노쇼 기록
- [ ] 잔여횟수 수동 조정
- [ ] 회원 메모 작성
- [ ] 키오스크에서 메모/전체 전화번호 미노출 확인

---

## 6. Go / No-Go

No-Go 조건:

- [ ] 비로그인 상태로 staff page 접근 가능
- [ ] `/dashboard.html` 같은 보호 static HTML 생성
- [ ] 키오스크에서 전체 전화번호 노출
- [ ] 키오스크에서 회원 메모 노출
- [ ] 출석 중복 차감 발생
- [ ] 출석 취소 후 잔여횟수 복구 실패
- [ ] owner 로그인 불가
- [ ] Supabase RPC 오류 반복

위 항목 중 하나라도 체크되면 production 운영을 시작하지 않습니다.
