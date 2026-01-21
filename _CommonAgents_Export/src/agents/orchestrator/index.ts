/**
 * Agent Orchestrator System
 * 에이전트 워크플로우 실행 엔진
 */

import { Agent, AgentRole, AgentTask, SquadType, AgentResponse } from '../types';
import {
  getAgentByRole,
  getAgentsBySquad,
  getSquadConfig,
  allAgents
} from '../index';

export interface WorkflowStep {
  agentRole: AgentRole;
  input: string | ((previousOutput?: string) => string);
  dependencies?: AgentRole[];
  optional?: boolean;
}

export interface WorkflowConfig {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  parallel?: boolean;
  retryOnFailure?: boolean;
  maxRetries?: number;
}

export interface WorkflowResult {
  workflowId: string;
  success: boolean;
  steps: AgentTask[];
  startedAt: Date;
  completedAt: Date;
  totalDuration: number;
  errors?: string[];
}

export class AgentOrchestrator {
  private taskQueue: AgentTask[] = [];
  private activeTask: AgentTask | null = null;
  private taskHistory: AgentTask[] = [];

  /**
   * Execute a single agent task
   */
  async executeAgent(
    agentRole: AgentRole,
    input: string,
    metadata?: Record<string, any>
  ): Promise<AgentResponse> {
    const agent = getAgentByRole(agentRole);

    if (!agent) {
      return {
        success: false,
        error: `Agent ${agentRole} not found`,
        agent: agentRole,
        timestamp: new Date()
      };
    }

    if (!agent.active) {
      return {
        success: false,
        error: `Agent ${agentRole} is not active`,
        agent: agentRole,
        timestamp: new Date()
      };
    }

    const task: AgentTask = {
      id: this.generateTaskId(),
      agentId: agent.id,
      agentRole: agent.role,
      input,
      status: 'running',
      startedAt: new Date(),
      metadata
    };

    this.activeTask = task;

    try {
      // Simulate agent execution
      // In real implementation, this would call the actual AI model with the agent's systemPrompt
      const output = await this.simulateAgentWork(agent, input);

      task.output = output;
      task.status = 'completed';
      task.completedAt = new Date();

      this.taskHistory.push(task);
      this.activeTask = null;

      return {
        success: true,
        data: output,
        agent: agentRole,
        timestamp: new Date()
      };
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : String(error);
      task.completedAt = new Date();

      this.taskHistory.push(task);
      this.activeTask = null;

      return {
        success: false,
        error: task.error,
        agent: agentRole,
        timestamp: new Date()
      };
    }
  }

  /**
   * Execute a workflow with multiple agents
   */
  async executeWorkflow(config: WorkflowConfig): Promise<WorkflowResult> {
    const startTime = new Date();
    const tasks: AgentTask[] = [];
    const errors: string[] = [];

    if (config.parallel && !this.hasDependencies(config.steps)) {
      // Execute steps in parallel
      const results = await Promise.all(
        config.steps.map(step => this.executeStep(step, tasks))
      );

      results.forEach((result, index) => {
        if (!result.success) {
          errors.push(`Step ${index + 1} (${config.steps[index].agentRole}): ${result.error}`);
        }
      });
    } else {
      // Execute steps sequentially
      for (let i = 0; i < config.steps.length; i++) {
        const step = config.steps[i];
        const previousTask = tasks[i - 1];

        const result = await this.executeStep(step, tasks, previousTask?.output);

        if (!result.success) {
          const errorMsg = `Step ${i + 1} (${step.agentRole}): ${result.error}`;
          errors.push(errorMsg);

          if (!step.optional) {
            // Stop workflow if non-optional step fails
            if (config.retryOnFailure && (config.maxRetries || 1) > 1) {
              // Retry logic
              const retryResult = await this.retryStep(step, tasks, previousTask?.output, config.maxRetries || 1);
              if (!retryResult.success) {
                break;
              }
            } else {
              break;
            }
          }
        }
      }
    }

    const endTime = new Date();

    return {
      workflowId: config.id,
      success: errors.length === 0,
      steps: tasks,
      startedAt: startTime,
      completedAt: endTime,
      totalDuration: endTime.getTime() - startTime.getTime(),
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Execute a squad workflow
   */
  async executeSquad(
    squadType: SquadType,
    input: string,
    customWorkflow?: AgentRole[]
  ): Promise<WorkflowResult> {
    const squadConfig = getSquadConfig(squadType);

    if (!squadConfig) {
      throw new Error(`Squad ${squadType} not found`);
    }

    const workflow = customWorkflow || squadConfig.defaultWorkflow || squadConfig.agents;

    const workflowConfig: WorkflowConfig = {
      id: this.generateTaskId(),
      name: `${squadConfig.name} Workflow`,
      description: squadConfig.description,
      steps: workflow.map((role: AgentRole) => ({
        agentRole: role,
        input: (prevOutput?: string) => prevOutput || input
      }))
    };

    return this.executeWorkflow(workflowConfig);
  }

  /**
   * Get task queue status
   */
  getQueueStatus() {
    return {
      queueLength: this.taskQueue.length,
      activeTask: this.activeTask,
      historyLength: this.taskHistory.length
    };
  }

  /**
   * Get task history
   */
  getTaskHistory(limit?: number): AgentTask[] {
    return limit
      ? this.taskHistory.slice(-limit)
      : this.taskHistory;
  }

  /**
   * Clear task history
   */
  clearHistory() {
    this.taskHistory = [];
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const completed = this.taskHistory.filter(t => t.status === 'completed').length;
    const failed = this.taskHistory.filter(t => t.status === 'failed').length;

    const agentUsage = this.taskHistory.reduce((acc, task) => {
      acc[task.agentRole] = (acc[task.agentRole] || 0) + 1;
      return acc;
    }, {} as Record<AgentRole, number>);

    return {
      totalTasks: this.taskHistory.length,
      completed,
      failed,
      successRate: this.taskHistory.length > 0 ? (completed / this.taskHistory.length) * 100 : 0,
      agentUsage
    };
  }

  // Private helper methods

  private async executeStep(
    step: WorkflowStep,
    tasks: AgentTask[],
    previousOutput?: string
  ): Promise<AgentResponse> {
    const input = typeof step.input === 'function'
      ? step.input(previousOutput)
      : step.input;

    // Check dependencies
    if (step.dependencies && step.dependencies.length > 0) {
      const unmetDeps = step.dependencies.filter(dep =>
        !tasks.find(t => t.agentRole === dep && t.status === 'completed')
      );

      if (unmetDeps.length > 0) {
        return {
          success: false,
          error: `Unmet dependencies: ${unmetDeps.join(', ')}`,
          agent: step.agentRole,
          timestamp: new Date()
        };
      }
    }

    const result = await this.executeAgent(step.agentRole, input);

    if (result.success && this.activeTask) {
      tasks.push({ ...this.activeTask, status: 'completed' });
    } else if (this.activeTask) {
      tasks.push({ ...this.activeTask, status: 'failed' });
    }

    return result;
  }

  private async retryStep(
    step: WorkflowStep,
    tasks: AgentTask[],
    previousOutput: string | undefined,
    maxRetries: number
  ): Promise<AgentResponse> {
    let lastError: AgentResponse | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`Retrying step ${step.agentRole}, attempt ${attempt}/${maxRetries}`);

      const result = await this.executeStep(step, tasks, previousOutput);

      if (result.success) {
        return result;
      }

      lastError = result;

      // Exponential backoff
      if (attempt < maxRetries) {
        await this.delay(Math.pow(2, attempt) * 1000);
      }
    }

    return lastError!;
  }

  private hasDependencies(steps: WorkflowStep[]): boolean {
    return steps.some(step => step.dependencies && step.dependencies.length > 0);
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Simulate agent work (placeholder for actual AI implementation)
   */
  private async simulateAgentWork(agent: Agent, input: string): Promise<string> {
    // Simulate processing time
    await this.delay(500 + Math.random() * 1000);

    // In real implementation, this would:
    // 1. Call AI model with agent.systemPrompt
    // 2. Include agent capabilities and tools in context
    // 3. Return the AI-generated output

    return `[${agent.role}] Processed: ${input.substring(0, 100)}...`;
  }
}

// Singleton instance
export const orchestrator = new AgentOrchestrator();

// Predefined workflows
export const workflows = {
  /**
   * Full development workflow: Planning → Frontend → Backend → Testing
   */
  fullDevelopment: (userStory: string): WorkflowConfig => ({
    id: 'full-dev-001',
    name: 'Full Development Workflow',
    description: 'Complete development cycle from planning to testing',
    steps: [
      // Planning phase
      { agentRole: 'PM_Requirements', input: userStory },
      {
        agentRole: 'UI_UX_Designer',
        input: (prev) => `Design UI for: ${prev}`,
        dependencies: ['PM_Requirements']
      },
      {
        agentRole: 'System_Architect',
        input: (prev) => `Create architecture for: ${prev}`,
        dependencies: ['PM_Requirements', 'UI_UX_Designer']
      },
      // Frontend development
      {
        agentRole: 'FE_Structure',
        input: (prev) => `Build structure based on: ${prev}`,
        dependencies: ['UI_UX_Designer']
      },
      {
        agentRole: 'FE_Logic',
        input: (prev) => `Implement logic for: ${prev}`,
        dependencies: ['FE_Structure']
      },
      {
        agentRole: 'FE_Styler',
        input: (prev) => `Style components: ${prev}`,
        dependencies: ['FE_Structure']
      },
      // Backend development
      {
        agentRole: 'BE_API_Builder',
        input: (prev) => `Build API based on: ${prev}`,
        dependencies: ['System_Architect']
      },
      {
        agentRole: 'BE_Database',
        input: (prev) => `Design database for: ${prev}`,
        dependencies: ['System_Architect']
      },
      // Testing
      {
        agentRole: 'Test_Unit_Pure',
        input: (prev) => `Create unit tests for: ${prev}`,
        dependencies: ['FE_Logic', 'BE_API_Builder']
      },
      {
        agentRole: 'Test_Integration_Mock',
        input: (prev) => `Create integration tests: ${prev}`,
        dependencies: ['FE_Logic', 'BE_API_Builder']
      },
      {
        agentRole: 'Test_E2E_Flow',
        input: (prev) => `Create E2E tests: ${prev}`,
        dependencies: ['FE_Styler', 'BE_API_Builder']
      }
    ]
  }),

  /**
   * Quick fix workflow: Debug → Test
   */
  quickFix: (issue: string): WorkflowConfig => ({
    id: 'quick-fix-001',
    name: 'Quick Fix Workflow',
    description: 'Rapid debugging and testing',
    steps: [
      { agentRole: 'Debug_Syntax', input: issue },
      { agentRole: 'Debug_Runtime', input: issue, optional: true },
      { agentRole: 'Debug_Logic', input: issue, optional: true },
      {
        agentRole: 'Test_Unit_Pure',
        input: (prev) => `Test fix: ${prev}`,
        dependencies: ['Debug_Syntax']
      }
    ],
    retryOnFailure: true,
    maxRetries: 2
  }),

  /**
   * Deployment workflow: Test → DevOps → Docs
   */
  deployment: (feature: string): WorkflowConfig => ({
    id: 'deployment-001',
    name: 'Deployment Workflow',
    description: 'Test, deploy, and document',
    steps: [
      { agentRole: 'Test_E2E_Flow', input: feature },
      {
        agentRole: 'DevOps_Pipeline',
        input: (prev) => `Deploy: ${prev}`,
        dependencies: ['Test_E2E_Flow']
      },
      {
        agentRole: 'Docs_Writer',
        input: (prev) => `Document: ${prev}`,
        dependencies: ['DevOps_Pipeline']
      }
    ]
  })
};
