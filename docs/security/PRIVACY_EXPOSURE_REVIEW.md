# Privacy Exposure Review

UC Check는 전화번호, 출석 이력, 회원권 정보, 메모를 다루므로 개인정보 최소 노출 원칙을 적용합니다.

## 1. 수집 최소화

저장 허용:

```text
이름
휴대폰 번호
전화번호 뒷 4자리
출석 PIN 해시
회원권 정보
출석 이력
운영 메모
담당 코치
```

저장 금지 또는 별도 동의 필요:

```text
주민등록번호
상세 주소
민감한 건강정보
질병/병력 상세
카드 원문 정보
불필요한 가족 정보
```

## 2. 화면별 노출 기준

### Kiosk

```text
전체 전화번호 금지
회원 메모 금지
마스킹된 이름/전화번호만 허용
```

### Staff Dashboard

```text
회원 운영 상태 표시 가능
전화번호는 기본 마스킹
필요 시 상세에서만 노출
```

### Member Detail

```text
스태프 전용
메모 표시 가능
권한별 수정 기능 제한
```

## 3. 로그 기준

로그에 남겨도 되는 것:

```text
actor_id
entity_type
entity_id
before/after 변경 요약
ip/user agent 일부
```

로그에 남기지 말아야 할 것:

```text
PIN 원문
서비스 롤 키
회원 비밀번호
전체 개인정보 dump
```

## 4. 배포 전 확인

```text
[ ] /kiosk에서 전체 전화번호가 보이지 않는다
[ ] /kiosk에서 메모가 보이지 않는다
[ ] static HTML에 Demo Admin 또는 QA 회원 전화번호가 없다
[ ] service role key가 client bundle에 없다
[ ] audit log에 PIN 원문이 없다
```
