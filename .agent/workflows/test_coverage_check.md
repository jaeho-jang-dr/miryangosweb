---
description: Run the complete test coverage analysis
---
# Test Coverage Report (2026-01-21)

## Current Status

- **Statements**: 6.7%
- **Branches**: 7.91%
- **Functions**: 6.59%
- **Lines**: 6.16%

## Critical Path Coverage

- `clinical/reception`: 100% Passed
- `lib/kcd-search-v2`: 100% Passed
- `agents/validation`: 100% Passed

## Next Steps (Priority)

1. **API Routes**: Create tests for `/api/clinical/*`
2. **Core Components**: Test `src/components/ui/*`
3. **Utils**: Test `src/lib/utils.ts`

// turbo
npm run test:coverage
