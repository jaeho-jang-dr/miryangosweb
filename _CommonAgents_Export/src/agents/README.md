# Claude Code Agent System

> 6개 팀, 18명의 전문 AI 에이전트로 구성된 개발 생산성 극대화 시스템

![Agents](https://img.shields.io/badge/agents-18-blue.svg)
![Squads](https://img.shields.io/badge/squads-6-green.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.0-blue.svg)

## 📋 목차

- [소개](#소개)
- [팀 구성](#팀-구성)
- [설치 및 사용](#설치-및-사용)
- [에이전트 목록](#에이전트-목록)
- [사용 예시](#사용-예시)
- [폴더 구조](#폴더-구조)

## 소개

Claude Code Agent System은 소프트웨어 개발의 모든 단계를 전문화된 AI 에이전트가 담당하는 혁신적인 시스템입니다. 각 에이전트는 특정 역할에 최적화된 프롬프트와 도구를 보유하고 있어, 기획부터 배포까지 전 과정을 체계적으로 지원합니다.

### 핵심 특징

- ✨ **18명의 전문 에이전트**: 각 개발 단계에 특화된 AI 에이전트
- 🚀 **6개 Squad 체계**: Planning, Frontend, Backend, Test, Debug, Ops
- 🔧 **TypeScript 기반**: 완벽한 타입 안정성
- 📝 **상세한 System Prompt**: 각 에이전트의 역할과 작업 지침 명확화
- 🎯 **워크플로우 자동화**: Squad 단위 협업 자동화

## 팀 구성

### 1. Planning Squad (기획 및 아키텍처)
- **PM_Requirements**: 요구사항 정의 및 PRD 작성
  - _별명_: Product Manager & User Story Writer
  - _목적_: 사용자의 모호한 아이디어를 구체적인 User Story와 기능 명세로 변환
- **UI_UX_Designer**: 화면 설계 및 디자인 시스템
  - _별명_: UI/UX Designer & Component Planner
  - _목적_: 텍스트로 된 명세를 시각적 컴포넌트 구조로 설계
- **System_Architect**: 기술 아키텍처 및 폴더 구조 설계
  - _별명_: Senior System Architect
  - _목적_: 확장성과 유지보수성을 고려한 최적의 기술 구조 설계

### 2. Frontend Squad (프론트엔드 개발)
- **FE_Structure**: HTML/JSX 구조 및 시맨틱 마크업
  - _별명_: Frontend Structure Specialist
  - _목적_: 시맨틱 태그를 사용하여 견고한 HTML/JSX 뼈대 구축
- **FE_Logic**: React Hooks 및 비즈니스 로직
  - _별명_: Frontend Logic Engineer
  - _목적_: 컴포넌트에 생명을 불어넣는 비즈니스 로직과 상태 관리 구현
- **FE_Styler**: CSS/Tailwind 스타일링
  - _별명_: CSS & Tailwind Specialist
  - _목적_: 구조화된 코드에 디자인 시스템을 적용하여 시각적 완성도 높이기

### 3. Backend Squad (백엔드 개발)
- **BE_API_Builder**: RESTful API 및 GraphQL 구현
  - _별명_: Backend API Developer
  - _목적_: 안정적이고 빠른 응답을 제공하는 API 엔드포인트 구현
- **BE_Database**: DB 스키마 설계 및 쿼리 최적화
  - _별명_: Database Engineer
  - _목적_: 효율적인 데이터 저장 구조와 최적화된 쿼리 작성

### 4. Test Squad (테스팅)
- **Test_Unit_Pure**: 순수 함수 단위 테스트
  - _별명_: Unit Tester (Pure Logic)
  - _목적_: 외부 의존성이 없는 순수 비즈니스 로직 함수 검증
- **Test_Integration_Mock**: 통합 테스트 및 Mock
  - _별명_: Integration Tester (Mocking)
  - _목적_: 실제 서버 없이 컴포넌트 간 상호작용 검증
- **Test_E2E_Flow**: Playwright/Cypress E2E 테스트
  - _별명_: E2E Automation Engineer
  - _목적_: 실제 브라우저 환경에서 사용자의 핵심 시나리오 자동화 검증
- **Test_Edge_Crusher**: 극한 상황 및 보안 테스트
  - _별명_: Chaos Tester (Edge Cases)
  - _목적_: 예상치 못한 입력값 주입으로 시스템 견고함 시험

### 5. Debug Squad (디버깅)
- **Debug_Syntax**: 문법 및 TypeScript 타입 오류
  - _별명_: Syntax & Type Fixer
  - _목적_: 코드가 실행되기도 전에 발생하는 정적 분석 오류 해결
- **Debug_Runtime**: 런타임 크래시 및 예외 처리
  - _별명_: Runtime Crash Investigator
  - _목적_: 실행 중에 발생하는 예외 및 크래시 원인 제거
- **Debug_Logic**: 논리 오류 및 계산 버그
  - _별명_: Business Logic Debugger
  - _목적_: 결과값이 의도와 다른 논리적 결함 수정
- **Debug_Dependency**: 패키지 버전 충돌 및 환경 설정
  - _별명_: Environment & Dependency Doctor
  - _목적_: '내 컴퓨터에서는 되는데...' 문제 해결

### 6. Ops Squad (배포 및 문서화)
- **DevOps_Pipeline**: Docker, CI/CD 파이프라인
  - _별명_: DevOps Engineer
  - _목적_: 개발된 코드를 클라우드 환경에 배포 가능하도록 패키징
- **Docs_Writer**: README 및 API 문서화
  - _별명_: Technical Writer
  - _목적_: 처음 보는 사람도 1분 안에 실행할 수 있도록 문서 작성

## 설치 및 사용

### TypeScript 프로젝트에서 사용

```typescript
import {
  createAgentPrompt,
  suggestAgent,
  getAgentByRole,
  formatAgentInfo
} from '@/agents';

// 1. 적합한 에이전트 찾기
const suggestions = suggestAgent('API를 만들고 싶어요');
console.log(suggestions); // ['BE_API_Builder']

// 2. 에이전트 프롬프트 생성
const prompt = createAgentPrompt(
  'BE_API_Builder',
  '사용자 CRUD API를 만들어주세요'
);

// 3. Claude에게 전달
// prompt를 Claude API 또는 Claude Code CLI에 전달
console.log(prompt);

// 4. 에이전트 정보 확인
const agentInfo = formatAgentInfo('BE_API_Builder');
console.log(agentInfo);
```

### Claude Code CLI에서 직접 사용

```bash
# Planning Squad 워크플로우
"지금부터 너는 PM_Requirements야. 사용자의 모호한 아이디어를 구체적인 'User Story'와 '기능 명세'로 변환하라..."

# Frontend 개발
"지금부터 너는 FE_Structure야. 시맨틱 태그를 사용하여 견고한 HTML/JSX 뼈대를 구축하라..."

# Backend API 개발
"지금부터 너는 BE_API_Builder야. 안정적이고 빠른 응답을 제공하는 API 엔드포인트를 구현하라..."
```

## 에이전트 목록

### Planning Squad

#### PM_Requirements
```typescript
const prompt = createAgentPrompt('PM_Requirements', `
  병원 예약 시스템을 만들고 싶어요.
  환자가 온라인으로 예약할 수 있었으면 좋겠어요.
`);
// ✅ 구체적인 User Story와 Acceptance Criteria 생성
```

#### UI_UX_Designer
```typescript
const prompt = createAgentPrompt('UI_UX_Designer', `
  예약 페이지의 화면 구조를 설계해주세요.
`);
// ✅ 컴포넌트 계층 구조 및 디자인 토큰 생성
```

#### System_Architect
```typescript
const prompt = createAgentPrompt('System_Architect', `
  Next.js 14 + Firebase로 시스템 아키텍처를 설계해주세요.
`);
// ✅ 폴더 구조, 데이터 흐름, 기술 스택 확정
```

### Frontend Squad

#### FE_Structure
```typescript
const prompt = createAgentPrompt('FE_Structure', `
  예약 폼 컴포넌트의 HTML 구조를 만들어주세요.
`);
// ✅ 접근성 높은 시맨틱 마크업 생성
```

#### FE_Logic
```typescript
const prompt = createAgentPrompt('FE_Logic', `
  예약 폼의 상태 관리 및 API 호출 로직을 추가해주세요.
`);
// ✅ Custom Hooks 및 비즈니스 로직 생성
```

#### FE_Styler
```typescript
const prompt = createAgentPrompt('FE_Styler', `
  예약 폼에 Tailwind CSS 스타일을 적용해주세요.
`);
// ✅ 반응형 디자인 및 스타일 적용
```

### Backend Squad

#### BE_API_Builder
```typescript
const prompt = createAgentPrompt('BE_API_Builder', `
  /api/appointments POST 엔드포인트를 만들어주세요.
`);
// ✅ RESTful API 및 유효성 검사 구현
```

#### BE_Database
```typescript
const prompt = createAgentPrompt('BE_Database', `
  예약 시스템의 Firestore 스키마를 설계해주세요.
`);
// ✅ 최적화된 DB 스키마 및 쿼리 생성
```

### Test Squad

#### Test_Unit_Pure
```typescript
const prompt = createAgentPrompt('Test_Unit_Pure', `
  calculateTotalPrice 함수의 단위 테스트를 작성해주세요.
`);
// ✅ 100% 커버리지 테스트 케이스 생성
```

#### Test_Integration_Mock
```typescript
const prompt = createAgentPrompt('Test_Integration_Mock', `
  예약 폼의 통합 테스트를 MSW로 작성해주세요.
`);
// ✅ Mock API와 React Testing Library 테스트
```

#### Test_E2E_Flow
```typescript
const prompt = createAgentPrompt('Test_E2E_Flow', `
  로그인 → 예약 → 결제 흐름의 E2E 테스트를 작성해주세요.
`);
// ✅ Playwright 사용자 시나리오 테스트
```

#### Test_Edge_Crusher
```typescript
const prompt = createAgentPrompt('Test_Edge_Crusher', `
  예약 폼에 악의적인 입력값을 주입하는 테스트를 작성해주세요.
`);
// ✅ SQL Injection, XSS 방어 검증
```

### Debug Squad

#### Debug_Syntax
```typescript
const prompt = createAgentPrompt('Debug_Syntax', `
  TypeScript 타입 오류를 모두 수정해주세요.
`);
// ✅ 컴파일 에러 0개로 수정
```

#### Debug_Runtime
```typescript
const prompt = createAgentPrompt('Debug_Runtime', `
  "Cannot read property 'name' of undefined" 오류를 해결해주세요.
`);
// ✅ Null 참조 및 비동기 오류 수정
```

#### Debug_Logic
```typescript
const prompt = createAgentPrompt('Debug_Logic', `
  할인 계산이 틀립니다. 100원의 10% 할인이 90원이 아니라 10원이 나와요.
`);
// ✅ 논리 오류 수정
```

#### Debug_Dependency
```typescript
const prompt = createAgentPrompt('Debug_Dependency', `
  npm install 시 peer dependency 충돌이 발생합니다.
`);
// ✅ 패키지 버전 충돌 해결
```

### Ops Squad

#### DevOps_Pipeline
```typescript
const prompt = createAgentPrompt('DevOps_Pipeline', `
  Vercel 자동 배포 파이프라인을 구축해주세요.
`);
// ✅ GitHub Actions CI/CD 설정
```

#### Docs_Writer
```typescript
const prompt = createAgentPrompt('Docs_Writer', `
  프로젝트 README.md를 작성해주세요.
`);
// ✅ 설치 가이드 및 API 문서 생성
```

## 사용 예시

### 전체 워크플로우 (Planning → Frontend → Backend)

```typescript
import { createSquadWorkflow } from '@/agents/utils';

// 1. Planning Squad
const planningPrompt = createSquadWorkflow('planning', `
  병원 예약 시스템을 만들고 싶습니다.
  온라인으로 예약하고, 결제까지 가능했으면 좋겠어요.
`);

// 2. Frontend Squad
const frontendPrompt = createSquadWorkflow('frontend', `
  Planning 결과를 바탕으로 예약 페이지를 구현해주세요.
`);

// 3. Backend Squad
const backendPrompt = createSquadWorkflow('backend', `
  예약 API와 DB를 구현해주세요.
`);

// 4. Test Squad
const testPrompt = createSquadWorkflow('test', `
  전체 시스템을 테스트해주세요.
`);
```

## 폴더 구조

```
src/agents/
├── types/
│   └── index.ts          # Agent, Squad, Task 타입 정의
├── planning/
│   └── index.ts          # PM, UI/UX Designer, Architect
├── frontend/
│   └── index.ts          # Structure, Logic, Styler
├── backend/
│   └── index.ts          # API Builder, Database
├── test/
│   └── index.ts          # Unit, Integration, E2E, Edge
├── debug/
│   └── index.ts          # Syntax, Runtime, Logic, Dependency
├── ops/
│   └── index.ts          # DevOps, Docs Writer
├── utils/
│   └── index.ts          # 유틸리티 함수
└── index.ts              # 메인 진입점
```

## API Reference

### createAgentPrompt(role, input)
특정 에이전트의 시스템 프롬프트와 사용자 입력을 결합합니다.

```typescript
const prompt = createAgentPrompt('PM_Requirements', '예약 시스템 만들기');
```

### suggestAgent(description)
설명에 적합한 에이전트를 제안합니다.

```typescript
const agents = suggestAgent('API를 만들고 싶어요');
// ['BE_API_Builder']
```

### getAgentByRole(role)
특정 역할의 에이전트 정보를 가져옵니다.

```typescript
const agent = getAgentByRole('FE_Structure');
console.log(agent.systemPrompt);
```

### getAgentsBySquad(squad)
특정 Squad의 모든 에이전트를 가져옵니다.

```typescript
const frontendAgents = getAgentsBySquad('frontend');
// [FE_Structure, FE_Logic, FE_Styler]
```

## 기여하기

새로운 에이전트를 추가하거나 기존 에이전트를 개선하고 싶으시다면:

1. Fork 후 새 Branch 생성
2. `src/agents/` 폴더에 새 에이전트 정의
3. `src/agents/types/index.ts`에 타입 추가
4. Pull Request 생성

## 라이센스

MIT License

---

**만든 이**: Claude Code Agent System
**버전**: 1.0.0
**마지막 업데이트**: 2024-01-14
