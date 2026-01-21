# 에이전트 시스템 빠른 시작 가이드 (Quick Start Guide)

5분 만에 에이전트 시스템을 시작해보세요.

## 설치 (Installation)

에이전트 시스템은 이미 `src/agents/` 경로에 포함되어 있습니다.

## 기본 사용법 (Basic Usage)

### 1. 시스템 임포트

```typescript
import { commands, orchestrator, workflows } from '@/agents';
```

### 2. 사용 가능한 에이전트 목록 확인

```typescript
// 환영 메시지 표시
console.log(commands.welcome());

// 모든 에이전트 목록 표시
console.log(commands.listAgents());

// 팀(Squad)별 에이전트 목록 표시
console.log(commands.listAgents('frontend'));
```

### 3. 단일 에이전트 실행

```typescript
// PM 에이전트를 실행하여 요구사항 생성
const result = await commands.runAgent(
  'PM_Requirements',
  '사용자 인증 기능이 있는 투두 앱 만들기'
);

console.log(result);
```

### 4. 팀(Squad) 워크플로우 실행

```typescript
// 기획팀 전체 실행
const planningResult = await commands.runSquad(
  'planning',
  '전자상거래 플랫폼 구축'
);

// 프론트엔드팀 실행
const frontendResult = await commands.runSquad(
  'frontend',
  '상품 목록 페이지 구현'
);
```

### 5. 전체 개발 워크플로우 실행

```typescript
// 전체 개발: 기획 → 프론트엔드 → 백엔드 → 테스트
const result = await commands.runWorkflow(
  'fullDevelopment',
  '역할 및 권한이 있는 사용자 관리 시스템'
);

console.log(result);
```

## 주요 워크플로우 (Common Workflows)

### 새로운 기능 기획

```typescript
// 1단계: 요구사항 정의
await commands.runAgent(
  'PM_Requirements',
  '체크아웃 흐름이 포함된 장바구니'
);

// 2단계: 디자인
await commands.runAgent(
  'UI_UX_Designer',
  '장바구니 UI 컴포넌트 디자인'
);

// 3단계: 아키텍처
await commands.runAgent(
  'System_Architect',
  'Next.js와 Firebase를 사용한 장바구니 시스템 구조 설계'
);
```

### 페이지 구축

```typescript
// 프론트엔드팀 사용
await commands.runSquad(
  'frontend',
  '편집 기능이 있는 사용자 프로필 페이지 구축'
);

// 또는 단계별 실행
await commands.runAgent('FE_Structure', '프로필 페이지 HTML 구조');
await commands.runAgent('FE_Logic', '폼 검증이 포함된 프로필 편집 로직');
await commands.runAgent('FE_Styler', '프로필 페이지에 Tailwind CSS 스타일 적용');
```

### 이슈 디버깅

```typescript
// 빠른 수정 워크플로우
await commands.runWorkflow(
  'quickFix',
  'TypeError: Cannot read property "map" of undefined in UserList.tsx'
);

// 또는 특정 디버그 에이전트 사용
await commands.runAgent(
  'Debug_Syntax',
  'auth 모듈의 TypeScript 컴파일 오류 수정'
);

await commands.runAgent(
  'Debug_Runtime',
  '프로필 컴포넌트의 Null 포인터 예외 해결'
);
```

### 테스트

```typescript
// 모든 테스트 병렬 실행
const parallelTests = {
  id: 'all-tests',
  name: '전체 테스트 모음',
  parallel: true,
  steps: [
    { agentRole: 'Test_Unit_Pure', input: '유틸리티 함수 테스트' },
    { agentRole: 'Test_Integration_Mock', input: 'API 통합 테스트' },
    { agentRole: 'Test_E2E_Flow', input: '사용자 워크플로우 테스트' },
    { agentRole: 'Test_Edge_Crusher', input: '엣지 케이스 테스트' }
  ]
};

await orchestrator.executeWorkflow(parallelTests);
```

### 배포

```typescript
// 배포 워크플로우
await commands.runWorkflow(
  'deployment',
  'Stripe 연동이 포함된 장바구니 기능'
);

// 또는 단계별 실행
await commands.runAgent('Test_E2E_Flow', '체크아웃 흐름 테스트');
await commands.runAgent('DevOps_Pipeline', 'Vercel 프로덕션 배포');
await commands.runAgent('Docs_Writer', '새로운 기능으로 README 업데이트');
```

## 커스텀 워크플로우

### 나만의 워크플로우 만들기

```typescript
import { orchestrator } from '@/agents';

const myWorkflow = {
  id: 'custom-feature',
  name: '커스텀 기능 개발',
  description: '디자인부터 배포까지 커스텀 기능 구축',
  steps: [
    // 디자인 단계
    {
      agentRole: 'UI_UX_Designer',
      input: '기능 UI 디자인'
    },
    // 구현 단계
    {
      agentRole: 'FE_Structure',
      input: (prev) => `구조 구현: ${prev}`,
      dependencies: ['UI_UX_Designer']
    },
    {
      agentRole: 'FE_Logic',
      input: (prev) => `로직 추가: ${prev}`,
      dependencies: ['FE_Structure']
    },
    {
      agentRole: 'BE_API_Builder',
      input: '기능을 위한 API 엔드포인트 구축',
      dependencies: ['FE_Logic']
    },
    // 테스트 단계
    {
      agentRole: 'Test_E2E_Flow',
      input: '전체 기능 테스트',
      dependencies: ['FE_Logic', 'BE_API_Builder']
    }
  ]
};

const result = await orchestrator.executeWorkflow(myWorkflow);
```

## 모니터링 및 통계

### 실행 기록 보기

```typescript
// 최근 10개 작업
console.log(commands.showHistory());

// 최근 20개 작업
console.log(commands.showHistory(20));
```

### 통계 보기

```typescript
// 전체 통계
console.log(commands.showStats());

// 오케스트레이터 상세 통계
const stats = orchestrator.getStatistics();
console.log('성공률:', stats.successRate);
console.log('총 작업 수:', stats.totalTasks);
console.log('에이전트 사용량:', stats.agentUsage);
```

### 대기열 상태

```typescript
const status = orchestrator.getQueueStatus();
console.log('대기열 길이:', status.queueLength);
console.log('활성 작업:', status.activeTask);
console.log('기록 길이:', status.historyLength);
```

## 팁 및 모범 사례

### 1. 올바른 에이전트 선택
- 기획 작업 → 기획팀 (Planning Squad)
- UI 구현 → 프론트엔드팀 (Frontend Squad)
- API/데이터베이스 → 백엔드팀 (Backend Squad)
- 테스트 → 테스팅팀 (Test Squad)
- 버그 → 디버깅팀 (Debug Squad)
- 배포 → 운영팀 (Ops Squad)

### 2. 복잡한 작업에는 워크플로우 사용
에이전트를 개별적으로 실행하는 대신, 다단계 프로세스에는 워크플로우를 사용하세요.

### 3. 에이전트 상세 정보 확인
에이전트를 사용하기 전에 능력을 확인하세요:

```typescript
console.log(commands.showAgent('PM_Requirements'));
```

### 4. 성능 모니터링
어떤 에이전트가 가장 많이 사용되는지 정기적으로 통계를 확인하세요:

```typescript
console.log(commands.showStats());
```

### 5. 에러 처리
중요한 워크플로우에는 재시도 로직을 사용하세요:

```typescript
const resilientWorkflow = {
  id: 'critical-task',
  name: '중요 작업',
  retryOnFailure: true,
  maxRetries: 3,
  steps: [/* 단계들 */]
};
```

## 예시 프로젝트 워크플로우

### 전체 기능 구축

```typescript
// 1. 기획
await commands.runSquad('planning', '사용자 인증 시스템');

// 2. 프론트엔드 개발
await commands.runSquad('frontend', '로그인 및 회원가입 폼');

// 3. 백엔드 개발
await commands.runSquad('backend', '인증 API 및 사용자 데이터베이스');

// 4. 테스트
await commands.runSquad('test', '인증 흐름 테스트');

// 5. 배포
await commands.runSquad('ops', '인증 기능 배포');
```

또는 미리 정의된 워크플로우 사용:

```typescript
await commands.runWorkflow('fullDevelopment', '사용자 인증 시스템');
```

## 다음 단계

1. 모든 에이전트 탐색: `commands.listAgents()`
2. 미리 정의된 워크플로우 시도: `workflows.fullDevelopment`, `workflows.quickFix`, `workflows.deployment`
3. 필요에 맞는 커스텀 워크플로우 생성
4. `src/agents/README.md`에서 전체 문서 확인
5. `src/agents/examples.ts`에서 예제 확인

## 공통 명령어 참조

```typescript
// 목록 조회
commands.listAgents()               // 모든 에이전트
commands.listAgents('frontend')     // 팀 에이전트
commands.listSquads()               // 모든 팀
commands.showAgent('PM_Requirements') // 에이전트 상세 정보

// 실행
commands.runAgent(role, input)      // 단일 에이전트
commands.runSquad(squad, input)     // 팀 워크플로우
commands.runWorkflow(name, input)   // 미리 정의된 워크플로우

// 정보
commands.showHistory([limit])       // 실행 기록
commands.showStats()                // 통계
commands.help([command])            // 도움말

// 오케스트레이터
orchestrator.executeAgent(role, input)
orchestrator.executeWorkflow(config)
orchestrator.executeSquad(squad, input)
orchestrator.getStatistics()
orchestrator.getTaskHistory()
```

## 트러블슈팅

### 문제: 에이전트를 찾을 수 없음
**해결**: `commands.listAgents()`로 사용 가능한 에이전트 확인

### 문제: 워크플로우 실패
**해결**: 재시도 로직 추가 또는 의존성 확인

### 문제: 실행 속도 느림
**해결**: 독립적인 작업에는 병렬 실행 사용

### 문제: 도움이 필요함
**해결**: `commands.help()` 또는 `commands.help('command-name')` 사용

## 지원

- 전체 문서: `src/agents/README.md`
- 예제: `src/agents/examples.ts`
- 타입 정의: `src/agents/types/index.ts`

에이전트 시스템과 함께 즐거운 코딩 되세요! 🚀
