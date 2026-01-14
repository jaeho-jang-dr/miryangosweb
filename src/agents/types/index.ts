/**
 * Agent Types and Interfaces
 * Claude Code Agent System
 */

export type AgentRole =
  // Planning Squad
  | 'PM_Requirements'
  | 'UI_UX_Designer'
  | 'System_Architect'
  // Frontend Squad
  | 'FE_Structure'
  | 'FE_Logic'
  | 'FE_Styler'
  // Backend Squad
  | 'BE_API_Builder'
  | 'BE_Database'
  // Test Squad
  | 'Test_Unit_Pure'
  | 'Test_Integration_Mock'
  | 'Test_E2E_Flow'
  | 'Test_Edge_Crusher'
  // Debug Squad
  | 'Debug_Syntax'
  | 'Debug_Runtime'
  | 'Debug_Logic'
  | 'Debug_Dependency'
  // Ops Squad
  | 'DevOps_Pipeline'
  | 'Docs_Writer';

export type SquadType =
  | 'planning'
  | 'frontend'
  | 'backend'
  | 'test'
  | 'debug'
  | 'ops';

export interface Agent {
  id: string;
  role: AgentRole;
  squad: SquadType;
  name: string;
  nickname: string;        // 별명 (예: "Product Manager & User Story Writer")
  purpose: string;         // 목적 (간단한 한 줄 설명)
  description: string;
  systemPrompt: string;
  capabilities: string[];
  tools: string[];
  active: boolean;
  createdAt: Date;
  lastUsed?: Date;
}

export interface AgentTask {
  id: string;
  agentId: string;
  agentRole: AgentRole;
  input: string;
  output?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  metadata?: Record<string, any>;
}

export interface AgentConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface SquadConfig {
  type: SquadType;
  name: string;
  description: string;
  agents: AgentRole[];
  defaultWorkflow?: string[];
}

export interface AgentResponse {
  success: boolean;
  data?: any;
  error?: string;
  agent: AgentRole;
  timestamp: Date;
  tokensUsed?: number;
}
