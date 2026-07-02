# UC Check 배포 전 점검표

배포 판단: 아래 `Blocker` 항목은 하나라도 실패하면 운영 배포를 보류한다.

---

## 1. Build / CI

| 등급 | 항목 | 확인 |
|---|---|---|
| Blocker | `pnpm install` 성공 | [ ] |
| Blocker | `pnpm typecheck` 성공 | [ ] |
| Blocker | `pnpm lint` 성공 | [ ] |
| Blocker | `pnpm build` 성공 | [ ] |
| Blocker | `pnpm qa:build-output` 성공 | [ ] |
| Major | `npm audit --omit=dev` 결과 검토 | [ ] |
| Major | `next build` 결과에서 staff 페이지가 Static이 아님 | [ ] |

검증 명령:

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm build
pnpm qa:build-output
```

---

## 2. Environment Variables

| 등급 | 환경변수 | 설명 | 확인 |
|---|---|---|---|
| Blocker | `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | [ ] |
| Blocker | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | [ ] |
| Blocker | `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 service role key | [ ] |
| Blocker | `NEXT_PUBLIC_DEMO_MODE=false` | 운영에서는 반드시 false | [ ] |
| Blocker | `MEMBER_PIN_PEPPER` | 긴 랜덤 문자열 | [ ] |
| Major | `KIOSK_STAFF_PIN` 또는 관련 PIN 설정 | 키오스크 unlock용 | [ ] |

주의:

- `SUPABASE_SERVICE_ROLE_KEY`는 클라이언트에 절대 노출되면 안 된다.
- `NEXT_PUBLIC_DEMO_MODE=true` 상태로 운영 배포하면 안 된다.
- `MEMBER_PIN_PEPPER`는 중간에 변경하면 기존 PIN hash 검증 정책을 확인해야 한다.

---

## 3. Supabase Migration

적용 순서:

```text
001_schema.sql
002_security_hardening.sql
003_member_registration_fields.sql
004_operational_hardening.sql
005_operations_ui_support.sql
006_qa_seed_data.sql, QA 환경에서만
20260629_staff_command_dashboard_indexes.sql, 필요 시
```

| 등급 | 항목 | 확인 |
|---|---|---|
| Blocker | 모든 migration 적용 성공 | [ ] |
| Blocker | `check_in_member` 최신 버전 유지 | [ ] |
| Blocker | kiosk check-in은 서버 액션/service role 경유 | [ ] |
| Blocker | broad `for all manage` RLS 제거 | [ ] |
| Blocker | `CREATE POLICY IF NOT EXISTS` 사용 없음 | [ ] |
| Major | deprecated migration은 실행하지 않음 | [ ] |
| Major | QA seed는 운영 DB에 적용하지 않음 | [ ] |

---

## 4. Auth / Authorization

| 등급 | 항목 | 확인 |
|---|---|---|
| Blocker | 비로그인 `/dashboard` 접근 차단 | [ ] |
| Blocker | 비로그인 `/members/new` 접근 차단 | [ ] |
| Blocker | 비로그인 `/settings/staff` 접근 차단 | [ ] |
| Blocker | coach가 잔여횟수 조정 불가 | [ ] |
| Blocker | coach가 출석 취소 불가 | [ ] |
| Major | front_desk 권한 정책 확인 | [ ] |
| Major | 마지막 owner 비활성화 방지 | [ ] |

---

## 5. Kiosk Privacy / Safety

| 등급 | 항목 | 확인 |
|---|---|---|
| Blocker | 전체 전화번호 미노출 | [ ] |
| Blocker | 회원 메모 미노출 | [ ] |
| Blocker | 결제/관리자 정보 미노출 | [ ] |
| Blocker | 후보 없음/잔여 0회 시 스태프 문의 안내 | [ ] |
| Blocker | 출석 완료 후 자동 초기화 | [ ] |
| Major | PIN 실패 로그 저장 | [ ] |
| Major | 후보 과다 로그 저장 | [ ] |
| Major | 태블릿 화면 자동잠금 정책 확인 | [ ] |

---

## 6. Data Integrity

| 등급 | 항목 | 확인 |
|---|---|---|
| Blocker | 같은 날짜 같은 회원권 중복 출석 방지 | [ ] |
| Blocker | 출석 체크 시 잔여횟수 -1 | [ ] |
| Blocker | 출석 취소 시 잔여횟수 +1 | [ ] |
| Blocker | 잔여 0회 출석 차단 | [ ] |
| Blocker | 노쇼는 deducted_sessions = 0 | [ ] |
| Blocker | 같은 날짜 중복 노쇼 방지 | [ ] |
| Major | audit_logs 기록 확인 | [ ] |
| Major | member_passes.status 자동 변경 확인 | [ ] |

---

## 7. 현장 운영 준비

| 등급 | 항목 | 확인 |
|---|---|---|
| Major | 태블릿 충전/거치 위치 확인 | [ ] |
| Major | Wi-Fi 불안정 시 대응 절차 확인 | [ ] |
| Major | 스태프 2명 이상 사용법 교육 | [ ] |
| Major | 테스트 회원 데이터 삭제/분리 | [ ] |
| Major | 출석 오입력 복구 절차 교육 | [ ] |
| Major | 개인정보 문의 대응 문구 준비 | [ ] |

---

## 8. Go / No-Go 결정

운영 배포 가능 조건:

- Blocker 항목 100% 통과
- Major 항목 90% 이상 통과
- 키오스크 태블릿 실기 테스트 완료
- 스태프가 출석 취소/잔여횟수 조정 절차를 이해함

결정:

- [ ] Go
- [ ] No-Go
- [ ] 제한적 현장 테스트만 진행

승인자:

- 이름:
- 일시:
- 메모:
