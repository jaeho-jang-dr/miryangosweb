/**
 * Agent Utilities
 * 에이전트 실행 및 관리 유틸리티 함수
 */

import { Agent, AgentRole, AgentTask, AgentResponse } from '../types';
import { getAgentByRole, getAgentsBySquad } from '../index';

/**
 * 에이전트 프롬프트 생성
 */
export function createAgentPrompt(role: AgentRole, userInput: string): string {
  const agent = getAgentByRole(role);
  if (!agent) {
    throw new Error(`Agent not found: ${role}`);
  }

  return `${agent.systemPrompt}

---

**사용자 요청:**
${userInput}

**지시사항:**
위의 역할 정의에 따라 사용자 요청을 처리하고, 명확하고 실행 가능한 결과를 제공하세요.`;
}

/**
 * Squad 워크플로우 프롬프트 생성
 */
export function createSquadWorkflow(squad: string, userInput: string): string {
  const squadName = squad as any;
  const agents = getAgentsBySquad(squadName);

  if (agents.length === 0) {
    throw new Error(`No agents found for squad: ${squad}`);
  }

  const agentList = agents.map((agent, index) =>
    `${index + 1}. **${agent.name}** (${agent.role}): ${agent.description}`
  ).join('\n');

  return `# ${squad.toUpperCase()} Squad 워크플로우

다음 에이전트들이 순차적으로 작업을 진행합니다:

${agentList}

---

**사용자 요청:**
${userInput}

---

**작업 지시:**
각 에이전트의 역할에 따라 순차적으로 작업을 수행하고, 최종 결과물을 생성하세요.`;
}

/**
 * Agent Task 생성
 */
export function createAgentTask(
  agentRole: AgentRole,
  input: string,
  metadata?: Record<string, any>
): AgentTask {
  return {
    id: generateTaskId(),
    agentId: getAgentByRole(agentRole)?.id || '',
    agentRole,
    input,
    status: 'pending',
    metadata
  };
}

/**
 * Task ID 생성
 */
function generateTaskId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Agent 선택 도우미
 */
export function suggestAgent(description: string): AgentRole[] {
  const suggestions: AgentRole[] = [];
  const lower = description.toLowerCase();

  // Planning
  if (lower.includes('요구사항') || lower.includes('기획') || lower.includes('prd')) {
    suggestions.push('PM_Requirements');
  }
  if (lower.includes('디자인') || lower.includes('ui') || lower.includes('ux') || lower.includes('화면')) {
    suggestions.push('UI_UX_Designer');
  }
  if (lower.includes('아키텍처') || lower.includes('설계') || lower.includes('구조')) {
    suggestions.push('System_Architect');
  }

  // Frontend
  if (lower.includes('html') || lower.includes('jsx') || lower.includes('구조') || lower.includes('마크업')) {
    suggestions.push('FE_Structure');
  }
  if (lower.includes('hook') || lower.includes('state') || lower.includes('로직') || lower.includes('useState')) {
    suggestions.push('FE_Logic');
  }
  if (lower.includes('css') || lower.includes('tailwind') || lower.includes('스타일') || lower.includes('디자인')) {
    suggestions.push('FE_Styler');
  }

  // Backend
  if (lower.includes('api') || lower.includes('endpoint') || lower.includes('rest') || lower.includes('graphql')) {
    suggestions.push('BE_API_Builder');
  }
  if (lower.includes('database') || lower.includes('db') || lower.includes('sql') || lower.includes('prisma')) {
    suggestions.push('BE_Database');
  }

  // Test
  if (lower.includes('unit test') || lower.includes('단위 테스트') || lower.includes('순수 함수')) {
    suggestions.push('Test_Unit_Pure');
  }
  if (lower.includes('integration') || lower.includes('mock') || lower.includes('통합')) {
    suggestions.push('Test_Integration_Mock');
  }
  if (lower.includes('e2e') || lower.includes('playwright') || lower.includes('cypress')) {
    suggestions.push('Test_E2E_Flow');
  }
  if (lower.includes('edge') || lower.includes('극한') || lower.includes('fuzzing')) {
    suggestions.push('Test_Edge_Crusher');
  }

  // Debug
  if (lower.includes('타입') || lower.includes('typescript') || lower.includes('문법')) {
    suggestions.push('Debug_Syntax');
  }
  if (lower.includes('런타임') || lower.includes('crash') || lower.includes('null')) {
    suggestions.push('Debug_Runtime');
  }
  if (lower.includes('논리') || lower.includes('결과') || lower.includes('계산')) {
    suggestions.push('Debug_Logic');
  }
  if (lower.includes('의존성') || lower.includes('버전') || lower.includes('패키지')) {
    suggestions.push('Debug_Dependency');
  }

  // Ops
  if (lower.includes('배포') || lower.includes('docker') || lower.includes('ci/cd')) {
    suggestions.push('DevOps_Pipeline');
  }
  if (lower.includes('문서') || lower.includes('readme') || lower.includes('가이드')) {
    suggestions.push('Docs_Writer');
  }

  return suggestions;
}

/**
 * Agent 정보 포맷팅
 */
export function formatAgentInfo(role: AgentRole): string {
  const agent = getAgentByRole(role);
  if (!agent) return 'Agent not found';

  return `
## ${agent.name} (${agent.role})

**별명:** ${agent.nickname}
**Squad:** ${agent.squad}
**상태:** ${agent.active ? '활성' : '비활성'}

### 목적
${agent.purpose}

### 설명
${agent.description}

### 역량
${agent.capabilities.map(cap => `- ${cap}`).join('\n')}

### 사용 가능한 도구
${agent.tools.map(tool => `- ${tool}`).join('\n')}

### 시스템 프롬프트
\`\`\`
${agent.systemPrompt.substring(0, 500)}...
\`\`\`
`.trim();
}

/**
 * 전체 에이전트 목록 포맷팅
 */
export function formatAllAgents(): string {
  const { total, active, bySquad } = require('../index').getAgentStats();

  const squadInfo = bySquad.map((s: any) =>
    `- **${s.squad}**: ${s.count}개`
  ).join('\n');

  return `
# Claude Code Agent System

## 통계
- 총 에이전트: ${total}개
- 활성 에이전트: ${active}개

## Squad별 에이전트 수
${squadInfo}

## 사용 방법

\`\`\`typescript
import { createAgentPrompt, suggestAgent } from '@/agents/utils';

// 1. 에이전트 제안받기
const suggestions = suggestAgent('API를 만들고 싶어요');
// => ['BE_API_Builder']

// 2. 프롬프트 생성
const prompt = createAgentPrompt('BE_API_Builder', '사용자 CRUD API 만들기');

// 3. Claude에게 전달
const response = await callClaude(prompt);
\`\`\`
`.trim();
}
