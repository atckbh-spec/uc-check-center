# UC Check QA Pack

이 패키지는 UC Check를 실제 Urban Conditioning 현장에 투입하기 전, 기능/권한/태블릿 플로우를 검증하기 위한 QA 자료입니다.

## 포함 항목

```text
docs/qa/FIELD_QA_CHECKLIST.md
docs/qa/UAT_SCENARIOS.md
docs/qa/DEPLOYMENT_READINESS_CHECKLIST.md
docs/qa/ROLLBACK_AND_INCIDENT_RUNBOOK.md
docs/qa/STAFF_TRAINING_GUIDE.md
supabase/006_qa_seed_data.sql
scripts/verify-build-output.mjs
scripts/qa-smoke.mjs
```

## 적용 순서

1. QA 전용 Supabase 프로젝트 또는 개발 DB를 준비합니다.
2. 기존 migration을 적용합니다.

```text
001_schema.sql
002_security_hardening.sql
003_member_registration_fields.sql
004_operational_hardening.sql
005_operations_ui_support.sql
```

3. Supabase Auth에서 테스트 owner 계정을 만듭니다.
4. `supabase/006_qa_seed_data.sql` 안의 `v_owner_auth_user_id`를 실제 Auth User UUID로 교체합니다.
5. `006_qa_seed_data.sql`을 실행합니다.
6. 환경변수를 설정합니다.
7. 로컬 앱을 실행합니다.

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm build
pnpm qa:build-output
pnpm dev
```

8. 다른 터미널에서 smoke test를 실행합니다.

```bash
UC_CHECK_BASE_URL=http://localhost:3000 pnpm qa:smoke
```

## QA seed 테스트 회원

| 회원 | 전화번호 끝 4자리 | 목적 |
|---|---|---|
| 김민수 | 5678 | 오늘 이미 출석된 중복 방지 테스트 |
| 박서연 | 1234 | 키오스크 정상 체크인, 재등록 대상 |
| 박성훈 | 1234 | 동일 뒷자리 후보 테스트 |
| 이정훈 | 7777 | 장기 미방문, 노쇼 주의, 잔여 1회 |
| 최유진 | 9999 | 잔여 0회 출석 차단 |
| 오민재 | 8888 | 방문 이력 없음, 스태프 직접 출석 |
| 정하늘 | 1212 | 만료일 지난 회원권 테스트 |
| 문가온 | 0000 | paused 회원 검색 제외 테스트 |

PIN 정책:

- seed 데이터는 `pin_hash = null`로 둡니다.
- 현재 앱은 `pin_hash`가 없으면 전화번호 끝 4자리를 PIN으로 허용합니다.
- 운영에서는 별도 개인 PIN과 `MEMBER_PIN_PEPPER`를 사용하는 것을 권장합니다.

## Go/No-Go 기준

운영 배포 가능 조건:

- `DEPLOYMENT_READINESS_CHECKLIST.md`의 Blocker 항목 100% 통과
- `/dashboard`, `/members/new`, `/settings/staff`, `/attendance/today`가 비로그인 상태에서 노출되지 않음
- 키오스크 개인정보 노출 없음
- 출석/취소/잔여횟수 조정/노쇼 기록 데이터 무결성 확인
- 스태프가 현장 수기 대체 절차를 이해함
