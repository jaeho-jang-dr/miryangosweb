/**
 * Agent Registry - 모든 에이전트 통합 관리
 * Claude Code Agent System
 */

import { Agent, AgentRole, SquadType, SquadConfig } from './types';
import { planningSquad } from './planning';
import { frontendSquad } from './frontend';
import { backendSquad } from './backend';
import { testSquad } from './test';
import { debugSquad } from './debug';
import { opsSquad } from './ops';

// 모든 에이전트 배열
export const allAgents: Agent[] = [
  ...planningSquad,
  ...frontendSquad,
  ...backendSquad,
  ...testSquad,
  ...debugSquad,
  ...opsSquad
];

// Squad 설정
export const squadConfigs: SquadConfig[] = [
  {
    type: 'planning',
    name: '기획 및 아키텍처 팀',
    description: '요구사항 정의, UI/UX 설계, 시스템 아키텍처 설계',
    agents: ['PM_Requirements', 'UI_UX_Designer', 'System_Architect'],
    defaultWorkflow: ['PM_Requirements', 'UI_UX_Designer', 'System_Architect']
  },
  {
    type: 'frontend',
    name: '프론트엔드 개발 팀',
    description: 'HTML/JSX 구조, 비즈니스 로직, CSS 스타일링',
    agents: ['FE_Structure', 'FE_Logic', 'FE_Styler'],
    defaultWorkflow: ['FE_Structure', 'FE_Logic', 'FE_Styler']
  },
  {
    type: 'backend',
    name: '백엔드 개발 팀',
    description: 'API 구현, 데이터베이스 설계 및 쿼리 최적화',
    agents: ['BE_API_Builder', 'BE_Database']
  },
  {
    type: 'test',
    name: '테스팅 팀',
    description: '단위 테스트, 통합 테스트, E2E 테스트, 극한 상황 테스트',
    agents: ['Test_Unit_Pure', 'Test_Integration_Mock', 'Test_E2E_Flow', 'Test_Edge_Crusher']
  },
  {
    type: 'debug',
    name: '디버깅 팀',
    description: '문법 오류, 런타임 오류, 논리 오류, 의존성 오류 해결',
    agents: ['Debug_Syntax', 'Debug_Runtime', 'Debug_Logic', 'Debug_Dependency']
  },
  {
    type: 'ops',
    name: '배포 및 문서화 팀',
    description: 'CI/CD 파이프라인, Docker, 문서화',
    agents: ['DevOps_Pipeline', 'Docs_Writer']
  }
];

// Agent 조회 함수들
export function getAgentByRole(role: AgentRole): Agent | undefined {
  return allAgents.find(agent => agent.role === role);
}

export function getAgentsBySquad(squad: SquadType): Agent[] {
  return allAgents.filter(agent => agent.squad === squad);
}

export function getActiveAgents(): Agent[] {
  return allAgents.filter(agent => agent.active);
}

export function getSquadConfig(type: SquadType): SquadConfig | undefined {
  return squadConfigs.find(config => config.type === type);
}

// Agent 통계
export function getAgentStats() {
  return {
    total: allAgents.length,
    active: allAgents.filter(a => a.active).length,
    bySquad: squadConfigs.map(config => ({
      squad: config.name,
      count: getAgentsBySquad(config.type).length
    }))
  };
}

// 전체 Agent 목록 (Role 순)
export const agentRoles: AgentRole[] = [
  // Planning Squad (3)
  'PM_Requirements',
  'UI_UX_Designer',
  'System_Architect',
  // Frontend Squad (3)
  'FE_Structure',
  'FE_Logic',
  'FE_Styler',
  // Backend Squad (2)
  'BE_API_Builder',
  'BE_Database',
  // Test Squad (4)
  'Test_Unit_Pure',
  'Test_Integration_Mock',
  'Test_E2E_Flow',
  'Test_Edge_Crusher',
  // Debug Squad (4)
  'Debug_Syntax',
  'Debug_Runtime',
  'Debug_Logic',
  'Debug_Dependency',
  // Ops Squad (2)
  'DevOps_Pipeline',
  'Docs_Writer'
];

// Export all squads
export {
  planningSquad,
  frontendSquad,
  backendSquad,
  testSquad,
  debugSquad,
  opsSquad
};

// Export types
export type * from './types';
