# 🤖 AI Agent System - Quick Start Guide

**MiryAngos Web AI Agent System**
18개의 전문화된 AI Agent로 개발 프로세스를 자동화하세요.

---

## 📋 목차

1. [빠른 시작](#빠른-시작)
2. [Agent 목록 보기](#agent-목록-보기)
3. [단일 Agent 실행](#단일-agent-실행)
4. [Squad 실행](#squad-실행)
5. [Workflow 실행](#workflow-실행)
6. [고급 사용법](#고급-사용법)

---

## 빠른 시작

### 1. Agent 시스템 도움말 보기

```bash
npm run agent:help
```

### 2. 사용 가능한 모든 Agent 목록 보기

```bash
npm run agent:list
```

### 3. Squad 목록 보기

```bash
npm run agent:squads
```

### 4. 시스템 통계 확인

```bash
npm run agent:stats
```

---

## Agent 목록 보기

### 전체 Agent 목록 (18개)

```bash
npm run agent list agents
```

**출력 예시:**
```
📋 Available Agents (18):

Planning Squad (3):
  ✅ PM_Requirements - 요구사항 정의 전문가
  ✅ UI_UX_Designer - 화면 설계 전문가
  ✅ System_Architect - 기술 설계 전문가

Frontend Squad (3):
  ✅ FE_Structure - HTML/JSX 구조 전문가
  ✅ FE_Logic - Hooks & State 전문가
  ✅ FE_Styler - CSS/Tailwind 스타일링 전문가

Backend Squad (2):
  ✅ BE_API_Builder - API 구현 전문가
  ✅ BE_Database - DB & Query 전문가

...
```

### Squad별 목록 보기

```bash
npm run agent list squads
```

---

## 단일 Agent 실행

### 기본 사용법

```bash
npm run agent run <AgentRole> "<작업 내용>"
```

### 예제 1: 요구사항 정의

```bash
npm run agent run PM_Requirements "사용자가 할일을 추가/수정/삭제할 수 있는 TODO 앱 만들기"
```

### 예제 2: UI 설계

```bash
npm run agent run UI_UX_Designer "로그인 페이지 디자인 - 이메일/비밀번호 입력, 소셜 로그인 버튼 포함"
```

### 예제 3: API 구현

```bash
npm run agent run BE_API_Builder "사용자 인증 API 엔드포인트 구현 - 회원가입, 로그인, 로그아웃"
```

### 예제 4: 테스트 작성

```bash
npm run agent run Test_Unit_Pure "로그인 폼 검증 함수에 대한 단위 테스트 작성"
```

### Agent 상세 정보 보기

```bash
npm run agent show PM_Requirements
```

---

## Squad 실행

Squad는 3-4개의 관련 Agent가 순차적으로 작업을 수행합니다.

### 기본 사용법

```bash
npm run agent squad <SquadType> "<프로젝트 설명>"
```

### 예제 1: Planning Squad (기획)

```bash
npm run agent squad planning "전자상거래 플랫폼 구축"
```

**실행되는 Agent 순서:**
1. PM_Requirements → 요구사항 분석
2. UI_UX_Designer → UI/UX 설계
3. System_Architect → 아키텍처 설계

### 예제 2: Frontend Squad (프론트엔드)

```bash
npm run agent squad frontend "상품 목록 페이지 구현"
```

**실행되는 Agent 순서:**
1. FE_Structure → HTML/JSX 구조
2. FE_Logic → 비즈니스 로직
3. FE_Styler → CSS 스타일링

### 예제 3: Test Squad (테스팅)

```bash
npm run agent squad test "사용자 인증 시스템"
```

**실행되는 Agent 순서:**
1. Test_Unit_Pure → 단위 테스트
2. Test_Integration_Mock → 통합 테스트
3. Test_E2E_Flow → E2E 테스트
4. Test_Edge_Crusher → 엣지 케이스 테스트

### 사용 가능한 Squad 목록

- `planning` - 기획 및 아키텍처 (3 agents)
- `frontend` - 프론트엔드 개발 (3 agents)
- `backend` - 백엔드 개발 (2 agents)
- `test` - 테스팅 (4 agents)
- `debug` - 디버깅 (4 agents)
- `ops` - 배포 및 문서화 (2 agents)

---

## Workflow 실행

Workflow는 여러 Squad를 조합하여 전체 개발 사이클을 자동화합니다.

### 기본 사용법

```bash
npm run agent workflow <WorkflowName> "<프로젝트 설명>"
```

### Workflow 1: fullDevelopment (전체 개발)

전체 개발 프로세스를 자동화 (기획 → 개발 → 테스트 → 배포)

```bash
npm run agent workflow fullDevelopment "사용자 관리 시스템"
```

**실행 단계:**
1. **Planning Squad** (기획)
   - PM_Requirements
   - UI_UX_Designer
   - System_Architect

2. **Frontend Squad** (프론트엔드)
   - FE_Structure
   - FE_Logic
   - FE_Styler

3. **Backend Squad** (백엔드)
   - BE_API_Builder
   - BE_Database

4. **Test Squad** (테스팅)
   - Test_Unit_Pure
   - Test_Integration_Mock
   - Test_E2E_Flow
   - Test_Edge_Crusher

5. **Ops Squad** (배포)
   - DevOps_Pipeline
   - Docs_Writer

### Workflow 2: quickFix (빠른 수정)

버그 수정 및 개선 작업을 위한 간소화된 워크플로우

```bash
npm run agent workflow quickFix "로그인 버튼 클릭 시 오류 수정"
```

**실행 단계:**
1. Debug_Runtime → 런타임 오류 분석
2. Debug_Logic → 로직 오류 수정
3. Test_Unit_Pure → 단위 테스트
4. Test_E2E_Flow → E2E 테스트

### Workflow 3: deployment (배포)

배포 준비 및 문서화

```bash
npm run agent workflow deployment "v1.0.0 프로덕션 배포"
```

**실행 단계:**
1. Test_E2E_Flow → 최종 테스트
2. DevOps_Pipeline → 배포 설정
3. Docs_Writer → 문서 업데이트

---

## 고급 사용법

### 프로그래밍 방식으로 사용하기

TypeScript/JavaScript 코드에서 Agent 시스템을 직접 사용할 수 있습니다.

#### 1. Agent 시스템 Import

```typescript
import {
  commands,
  orchestrator,
  workflows,
  getAgentByRole,
  getAgentsBySquad
} from '@/agents';
```

#### 2. 단일 Agent 실행

```typescript
const result = await commands.runAgent(
  'PM_Requirements',
  '할일 관리 앱 요구사항 작성'
);

if (result.success) {
  console.log('✅ Success:', result.data);
} else {
  console.error('❌ Error:', result.error);
}
```

#### 3. Squad 실행

```typescript
const squadResult = await commands.runSquad(
  'planning',
  '전자상거래 플랫폼'
);

console.log(squadResult.data);
```

#### 4. Workflow 실행

```typescript
const workflowResult = await commands.runWorkflow(
  'fullDevelopment',
  '사용자 인증 시스템'
);

console.log(workflowResult.data);
```

#### 5. 커스텀 Workflow 생성

```typescript
import { orchestrator, Workflow } from '@/agents';

const customWorkflow: Workflow = {
  id: 'ui-development',
  name: 'UI Development',
  description: 'UI 개발 전용 워크플로우',
  steps: [
    {
      agentRole: 'UI_UX_Designer',
      input: '대시보드 페이지 디자인',
      parallel: false
    },
    {
      agentRole: 'FE_Structure',
      input: (prev) => `${prev.data}를 기반으로 구조 생성`,
      parallel: false
    },
    {
      agentRole: 'FE_Styler',
      input: (prev) => `${prev.data}에 스타일 적용`,
      parallel: false
    }
  ]
};

const result = await orchestrator.executeWorkflow(customWorkflow);
```

#### 6. 병렬 실행

여러 Agent를 동시에 실행할 수 있습니다.

```typescript
const customWorkflow: Workflow = {
  id: 'parallel-test',
  name: 'Parallel Testing',
  steps: [
    {
      agentRole: 'Test_Unit_Pure',
      input: '단위 테스트',
      parallel: true
    },
    {
      agentRole: 'Test_Integration_Mock',
      input: '통합 테스트',
      parallel: true
    },
    {
      agentRole: 'Test_E2E_Flow',
      input: 'E2E 테스트',
      parallel: true
    }
  ]
};

const result = await orchestrator.executeWorkflow(customWorkflow);
```

### Agent 정보 조회

```typescript
// Agent 상세 정보 가져오기
const agent = getAgentByRole('PM_Requirements');
console.log(agent.systemPrompt);
console.log(agent.capabilities);

// Squad의 모든 Agent 가져오기
const planningAgents = getAgentsBySquad('planning');
planningAgents.forEach(agent => {
  console.log(`${agent.name} (${agent.nickname})`);
});
```

### 실행 히스토리 및 통계

```typescript
// 실행 히스토리 보기
const history = commands.showHistory();
console.log(history);

// 시스템 통계 보기
const stats = commands.showStats();
console.log(stats);
```

---

## 실전 예제

### 예제 1: TODO 앱 전체 개발

```bash
# 1단계: 기획
npm run agent squad planning "할일 관리 앱 - CRUD 기능, 우선순위 설정, 마감일 관리"

# 2단계: 프론트엔드 개발
npm run agent squad frontend "할일 목록 페이지"

# 3단계: 백엔드 개발
npm run agent squad backend "할일 CRUD API"

# 4단계: 테스팅
npm run agent squad test "할일 관리 시스템"

# 5단계: 배포 준비
npm run agent squad ops "v1.0.0 릴리즈"
```

또는 한 번에:

```bash
npm run agent workflow fullDevelopment "할일 관리 앱"
```

### 예제 2: 버그 수정

```bash
# 빠른 수정 워크플로우 사용
npm run agent workflow quickFix "로그인 후 대시보드 리다이렉트 오류"
```

### 예제 3: 새로운 기능 추가

```bash
# 1. 요구사항 정의
npm run agent run PM_Requirements "소셜 로그인 기능 추가 - Google, Facebook"

# 2. UI 설계
npm run agent run UI_UX_Designer "소셜 로그인 버튼 디자인"

# 3. API 구현
npm run agent run BE_API_Builder "OAuth 인증 엔드포인트 구현"

# 4. 프론트엔드 구현
npm run agent squad frontend "소셜 로그인 UI"

# 5. 테스트
npm run agent squad test "소셜 로그인"
```

---

## 문제 해결

### Agent가 실행되지 않을 때

```bash
# 1. TypeScript 컴파일 확인
npm run build

# 2. Agent 목록 확인
npm run agent:list

# 3. 시스템 통계 확인
npm run agent:stats
```

### 도움말 보기

```bash
npm run agent:help
```

---

## 다음 단계

1. **매뉴얼 읽기**: `docs/agents/README.md`
2. **Agent별 상세 매뉴얼**: `docs/agents/team1-planning/`, `team2-frontend/` 등
3. **코드 예제**: `src/agents/examples.ts`
4. **시스템 문서**: `src/agents/README.md`

---

**Happy Coding with AI Agents! 🚀**
