# 개인정보 노출 Audit Checklist

## 앱에서 저장하는 개인정보

UC Check에서 필요한 개인정보는 운영 목적상 최소한으로 제한한다.

- 이름
- 휴대폰 번호
- 전화번호 뒷 4자리
- 생년월일, 선택
- 회원권 정보
- 출석 이력
- 스태프 운영 메모

## 키오스크 노출 허용/금지

| 항목 | 키오스크 노출 |
|---|---:|
| 마스킹된 이름 | 허용 |
| 마스킹된 전화번호 | 허용 |
| 회원권명 | 허용 |
| 잔여횟수 | 허용 |
| 전체 전화번호 | 금지 |
| 생년월일 | 금지 |
| 회원 메모 | 금지 |
| 결제 메모 | 금지 |
| audit log | 금지 |
| 담당 코치 내부 메모 | 금지 |

## 스태프 화면 노출 기준

- 전체 전화번호는 Admin 이상 또는 운영상 필요한 화면에서만 노출한다.
- 리스트 화면은 마스킹을 기본으로 한다.
- 회원 메모는 스태프 전용이며 키오스크에는 절대 전달하지 않는다.
- audit log는 Owner/Admin만 조회한다.

## 코드 Audit 항목

```bash
pnpm security:static
```

위 명령은 다음을 확인한다.

- kiosk 코드에서 `member_notes` 접근 여부
- kiosk 코드에서 `audit_logs` 접근 여부
- kiosk 코드에서 `.select("*")` 사용 여부
- app/components에서 service role key 사용 여부
- `NEXT_PUBLIC_` service role 환경변수 노출 여부

## 수동 확인

운영 URL에서 브라우저 View Source 또는 개발자도구 Network를 열고 확인한다.

- `/kiosk` HTML/JSON 응답에 `member_notes` 문자열이 없는지
- `/kiosk/search` 응답에 전체 전화번호가 없는지
- `/kiosk/confirm` 응답에 메모, audit, staff internal data가 없는지
- `/login`, `/` 응답에 secret 이름/값이 없는지

## No-Go

- 키오스크 응답에 전체 전화번호 포함
- 키오스크 응답에 member_notes 포함
- public page에 `service_role`, `SUPABASE_SERVICE_ROLE_KEY`, `MEMBER_PIN_PEPPER` 문자열 포함
- 보호 페이지 static HTML에 회원명/전화번호 포함
