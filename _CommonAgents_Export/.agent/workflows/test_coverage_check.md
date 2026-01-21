---
description: 전체 테스트 커버리지 분석을 실행합니다.
---
# 테스트 커버리지 리포트 (Test Coverage Report) (2026-01-21)

## 현재 상태 (Current Status)

- **구문 (Statements)**: 6.7%
- **분기 (Branches)**: 7.91%
- **함수 (Functions)**: 6.59%
- **라인 (Lines)**: 6.16%

## 중요 경로 커버리지 (Critical Path Coverage)

- `clinical/reception`: 100% 통과 (Passed)
- `lib/kcd-search-v2`: 100% 통과 (Passed)
- `agents/validation`: 100% 통과 (Passed)

## 다음 단계 (우선순위) (Next Steps (Priority))

1. **API 라우트**: `/api/clinical/*`에 대한 테스트 작성
2. **핵심 컴포넌트**: `src/components/ui/*` 테스트
3. **유틸리티**: `src/lib/utils.ts` 테스트

// turbo
npm run test:coverage
