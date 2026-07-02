# Center Update Roadmap

## v1 Locked Scope

v1 remains focused on stable center operations:

- 출석
- 회원권
- 키오스크
- 출석 취소
- 잔여횟수 조정
- 노쇼
- 메모
- 재등록 대상
- 장기 미방문
- 월간 리포트

## v1.1+ Candidates

The following are not part of v1 go-live:

- 예약
- 결제
- 카카오 알림
- 회원용 마이페이지
- SCL Signal 연동
- 복수 센터 운영

## Technical Update Strategy

- Keep Next.js on the latest safe patch within version 14 during v1 stabilization.
- Major framework upgrades, including Next 15 or later, are deferred to v1.1 unless a critical security patch requires earlier action.
- Run `npm run center:check` before each center update.
