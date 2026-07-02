# Kiosk Security QA

키오스크는 센터 입구 태블릿에서 공개적으로 노출되는 화면이다. 따라서 스태프 화면보다 더 엄격하게 개인정보 노출과 오입력 방지를 확인한다.

## 반드시 지켜야 하는 원칙

- 로그인 없는 회원 화면에서는 출석 체크 외 기능을 제공하지 않는다.
- 전체 전화번호를 보여주지 않는다.
- 회원 메모, 결제 메모, audit log를 보여주지 않는다.
- 관리자 링크를 노출하지 않는다.
- 출석 완료 후 자동 초기화한다.
- 잘못된 PIN/검색 시도는 kiosk_attempt_logs에 남긴다.

## QA 시나리오

### 1. Unlock 전 접근 차단

```text
/kiosk 접속
→ /kiosk/unlock으로 이동해야 함
```

### 2. 잘못된 Unlock PIN

```text
/kiosk/unlock
→ 잘못된 PIN 입력
→ unlock 실패
→ /kiosk 접근 불가
```

### 3. 전화번호 뒷자리 후보 조회

```text
/kiosk
→ 1234 입력
→ 후보 회원 카드 표시
```

후보 카드에 허용되는 정보:

- 마스킹된 이름
- 마스킹된 전화번호
- 활성 회원권명
- 잔여 횟수
- 출석 가능 상태

금지 정보:

- 전체 전화번호
- 회원 메모
- 결제 메모
- 담당 코치 내부 메모
- audit log
- 직원 관리 링크

### 4. PIN 실패

```text
후보 선택
→ 잘못된 개인 PIN 입력
→ 출석 실패
→ kiosk_attempt_logs.result = pin_failed 기록
```

### 5. 정상 출석

```text
후보 선택
→ 올바른 개인 PIN 입력
→ 출석 완료
→ 잔여횟수 -1
→ kiosk_attempt_logs.result = checked_in 기록
→ 5초 후 /kiosk 초기화
```

### 6. 중복 출석

```text
같은 회원/같은 회원권/같은 날짜 재시도
→ 중복 출석 차단
→ 잔여횟수 추가 차감 없음
```

### 7. 잔여 0회

```text
잔여 0회 회원 시도
→ 출석 차단
→ 스태프 문의 안내
```

## 자동 확인

운영 URL 배포 후 실행한다.

```bash
UC_CHECK_PRODUCTION_URL=https://<production-domain> pnpm security:routes
```

키오스크 로그/DB 권한 확인:

```bash
pnpm security:db
```

## No-Go

- unlock 없이 `/kiosk` 접근 가능
- 키오스크에서 전체 전화번호 노출
- 키오스크에서 회원 메모 노출
- PIN 실패가 기록되지 않음
- 중복 출석이 차단되지 않음
- 잔여횟수 0회 회원 출석 가능
