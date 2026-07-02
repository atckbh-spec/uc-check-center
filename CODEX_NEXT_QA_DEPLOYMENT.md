# Codex 작업 지시서 — UC Check QA / Deployment Pack 적용

첨부한 QA 패키지를 현재 UC Check 프로젝트에 적용해줘.

이번 작업의 목표는 새 기능 개발이 아니라, 실제 Urban Conditioning 현장 QA와 운영 배포 판단을 할 수 있게 만드는 것이다.

## 적용할 파일

```text
docs/qa/FIELD_QA_CHECKLIST.md
docs/qa/UAT_SCENARIOS.md
docs/qa/DEPLOYMENT_READINESS_CHECKLIST.md
docs/qa/ROLLBACK_AND_INCIDENT_RUNBOOK.md
docs/qa/STAFF_TRAINING_GUIDE.md
supabase/006_qa_seed_data.sql
scripts/verify-build-output.mjs
scripts/qa-smoke.mjs
README_QA.md
package.json scripts 추가
```

## package.json scripts 추가

```json
{
  "qa:build-output": "node scripts/verify-build-output.mjs",
  "qa:smoke": "node scripts/qa-smoke.mjs"
}
```

## 확인할 것

1. `pnpm typecheck`가 통과하는지 확인한다.
2. `pnpm lint`가 통과하는지 확인한다.
3. `pnpm build`가 통과하는지 확인한다.
4. `pnpm qa:build-output`가 통과하는지 확인한다.
5. `pnpm dev` 실행 후 `pnpm qa:smoke`가 통과하는지 확인한다.
6. `supabase/006_qa_seed_data.sql`은 운영 DB가 아니라 QA DB에서만 사용하도록 README에 명확히 남긴다.
7. `006_qa_seed_data.sql` 실행 전 `v_owner_auth_user_id`를 실제 Supabase Auth user id로 교체해야 한다는 점을 주석과 문서에 명확히 둔다.

## Smoke test 기대값

비로그인 상태에서 다음 라우트는 직접 내용을 보여주면 안 된다.

```text
/dashboard
/members/new
/settings/staff
/attendance/today
```

허용되는 결과:

```text
/login으로 redirect
401
403
```

실패 조건:

```text
200 OK로 관리자 화면 HTML이 바로 표시됨
Demo Admin 또는 회원 데이터가 static HTML에 들어 있음
```

## QA seed 데이터 검증

`006_qa_seed_data.sql` 적용 후 다음 테스트 회원이 보여야 한다.

```text
김민수: 오늘 이미 출석됨
박서연: 전화번호 끝 1234, 재등록 대상, 키오스크 정상 체크인용
박성훈: 전화번호 끝 1234, 동일 후보 테스트용
이정훈: 장기 미방문 + 노쇼 주의
최유진: 잔여 0회 출석 차단
오민재: 방문 이력 없음
정하늘: 만료일 지난 회원권
문가온: paused 회원
```

## 최종 산출

작업 완료 후 아래 결과를 알려줘.

1. 변경 파일 목록
2. 검증 명령 결과
3. build output에서 protected route static HTML이 없는지 여부
4. QA seed 적용 방법
5. 현장 QA 시작 가능 여부
