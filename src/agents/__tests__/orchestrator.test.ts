/**
 * @jest-environment node
 *
 * Tests for the AgentOrchestrator, commands, and workflows.
 */

import {
  AgentOrchestrator,
  orchestrator,
  commands,
  workflows,
  WorkflowConfig,
} from '../orchestrator';

describe('AgentOrchestrator', () => {
  let orch: AgentOrchestrator;

  beforeEach(() => {
    orch = new AgentOrchestrator();
    // Speed up tests by making the internal delay resolve immediately
    (orch as any).delay = jest.fn().mockResolvedValue(undefined);
  });

  describe('executeAgent', () => {
    it('should return an error response for a non-existent agent role', async () => {
      // @ts-expect-error - testing invalid role
      const result = await orch.executeAgent('NonExistent_Agent', 'test input');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
      expect(result.agent).toBe('NonExistent_Agent');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should execute a valid agent and return success', async () => {
      const result = await orch.executeAgent('PM_Requirements', 'Create a user login feature');

      expect(result.success).toBe(true);
      expect(result.agent).toBe('PM_Requirements');
      expect(result.data).toBeDefined();
      expect(typeof result.data).toBe('string');
      expect(result.data).toContain('PM_Requirements');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should record the task in history after execution', async () => {
      await orch.executeAgent('FE_Structure', 'Build a navigation bar');

      const history = orch.getTaskHistory();
      expect(history.length).toBe(1);
      expect(history[0].agentRole).toBe('FE_Structure');
      expect(history[0].status).toBe('completed');
      expect(history[0].output).toBeDefined();
    });

    it('should set activeTask to null after completion', async () => {
      await orch.executeAgent('BE_API_Builder', 'Create REST API');

      const status = orch.getQueueStatus();
      expect(status.activeTask).toBeNull();
    });

    it('should return inactive agent error when agent is not active', async () => {
      // Temporarily deactivate an agent for this test
      const { getAgentByRole } = require('../index');
      const agent = getAgentByRole('PM_Requirements');
      const originalActive = agent.active;
      agent.active = false;

      try {
        const result = await orch.executeAgent('PM_Requirements', 'test');
        expect(result.success).toBe(false);
        expect(result.error).toContain('not active');
      } finally {
        agent.active = originalActive;
      }
    });

    it('should handle errors during agent execution', async () => {
      // Force the simulateAgentWork to throw
      (orch as any).simulateAgentWork = jest.fn().mockRejectedValue(new Error('Execution failed'));

      const result = await orch.executeAgent('Debug_Syntax', 'test');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Execution failed');
    });

    it('should include metadata in the task when provided', async () => {
      await orch.executeAgent('Test_Unit_Pure', 'Run tests', { priority: 'high' });

      const history = orch.getTaskHistory();
      expect(history[0].metadata).toEqual({ priority: 'high' });
    });
  });

  describe('getQueueStatus', () => {
    it('should return correct initial queue status', () => {
      const status = orch.getQueueStatus();
      expect(status.queueLength).toBe(0);
      expect(status.activeTask).toBeNull();
      expect(status.historyLength).toBe(0);
    });

    it('should reflect history length after tasks complete', async () => {
      await orch.executeAgent('Debug_Syntax', 'Fix errors');
      await orch.executeAgent('Debug_Runtime', 'Fix crash');

      const status = orch.getQueueStatus();
      expect(status.historyLength).toBe(2);
    });
  });

  describe('getTaskHistory', () => {
    it('should return empty array when no tasks have been run', () => {
      expect(orch.getTaskHistory()).toEqual([]);
    });

    it('should limit returned history when limit is specified', async () => {
      for (const role of ['Debug_Syntax', 'Debug_Runtime', 'Debug_Logic'] as const) {
        await orch.executeAgent(role, 'test');
      }

      const limited = orch.getTaskHistory(2);
      expect(limited.length).toBe(2);
      // Should return the last 2 tasks (most recent)
      expect(limited[0].agentRole).toBe('Debug_Runtime');
      expect(limited[1].agentRole).toBe('Debug_Logic');
    });

    it('should return all tasks when no limit specified', async () => {
      await orch.executeAgent('Debug_Syntax', 'test');
      await orch.executeAgent('Debug_Runtime', 'test');

      const all = orch.getTaskHistory();
      expect(all.length).toBe(2);
    });
  });

  describe('clearHistory', () => {
    it('should clear all task history', async () => {
      await orch.executeAgent('Test_Unit_Pure', 'Test utils');

      expect(orch.getTaskHistory().length).toBe(1);
      orch.clearHistory();
      expect(orch.getTaskHistory().length).toBe(0);
    });
  });

  describe('getStatistics', () => {
    it('should return zero stats when no tasks have been run', () => {
      const stats = orch.getStatistics();
      expect(stats.totalTasks).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.agentUsage).toEqual({});
    });

    it('should track completed tasks correctly', async () => {
      await orch.executeAgent('PM_Requirements', 'test1');
      await orch.executeAgent('PM_Requirements', 'test2');

      const stats = orch.getStatistics();
      expect(stats.totalTasks).toBe(2);
      expect(stats.completed).toBe(2);
      expect(stats.failed).toBe(0);
      expect(stats.successRate).toBe(100);
      expect(stats.agentUsage['PM_Requirements']).toBe(2);
    });

    it('should track failed tasks correctly', async () => {
      (orch as any).simulateAgentWork = jest.fn().mockRejectedValue(new Error('fail'));
      await orch.executeAgent('Debug_Syntax', 'test');

      const stats = orch.getStatistics();
      expect(stats.totalTasks).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.successRate).toBe(0);
    });

    it('should calculate correct success rate', async () => {
      // 2 successes then 1 failure
      await orch.executeAgent('PM_Requirements', 'test1');
      await orch.executeAgent('PM_Requirements', 'test2');

      (orch as any).simulateAgentWork = jest.fn().mockRejectedValue(new Error('fail'));
      await orch.executeAgent('Debug_Syntax', 'test3');

      const stats = orch.getStatistics();
      expect(stats.totalTasks).toBe(3);
      expect(stats.completed).toBe(2);
      expect(stats.failed).toBe(1);
      expect(stats.successRate).toBeCloseTo(66.67, 0);
    });
  });

  describe('executeWorkflow', () => {
    it('should execute a simple sequential workflow', async () => {
      const config: WorkflowConfig = {
        id: 'test-wf-001',
        name: 'Test Workflow',
        description: 'A simple test',
        steps: [
          { agentRole: 'Debug_Syntax', input: 'Fix errors' },
          { agentRole: 'Test_Unit_Pure', input: 'Run tests' },
        ],
      };

      const result = await orch.executeWorkflow(config);

      expect(result.workflowId).toBe('test-wf-001');
      expect(result.success).toBe(true);
      expect(result.startedAt).toBeInstanceOf(Date);
      expect(result.completedAt).toBeInstanceOf(Date);
      expect(result.totalDuration).toBeGreaterThanOrEqual(0);
      expect(result.errors).toBeUndefined();
    });

    it('should execute parallel workflow when no dependencies exist', async () => {
      const config: WorkflowConfig = {
        id: 'parallel-test-001',
        name: 'Parallel Test',
        description: 'Test parallel execution',
        parallel: true,
        steps: [
          { agentRole: 'Test_Unit_Pure', input: 'Unit tests' },
          { agentRole: 'Test_Edge_Crusher', input: 'Edge case tests' },
        ],
      };

      const result = await orch.executeWorkflow(config);
      expect(result.success).toBe(true);
    });

    it('should handle workflow with function-based input', async () => {
      const config: WorkflowConfig = {
        id: 'func-input-001',
        name: 'Function Input Test',
        description: 'Test function inputs',
        steps: [
          { agentRole: 'PM_Requirements', input: 'Initial requirement' },
          {
            agentRole: 'UI_UX_Designer',
            input: (prev?: string) => `Design for: ${prev || 'default'}`,
          },
        ],
      };

      const result = await orch.executeWorkflow(config);
      expect(result.success).toBe(true);
    });

    it('should report errors for workflows with unmet dependencies', async () => {
      const config: WorkflowConfig = {
        id: 'dep-fail-001',
        name: 'Dependency Failure Test',
        description: 'Test unmet dependency handling',
        steps: [
          {
            agentRole: 'FE_Logic',
            input: 'Build logic',
            dependencies: ['FE_Structure'], // FE_Structure has not been run
          },
        ],
      };

      const result = await orch.executeWorkflow(config);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
      expect(result.errors![0]).toContain('Unmet dependencies');
    });

    it('should continue workflow when optional steps fail', async () => {
      const config: WorkflowConfig = {
        id: 'optional-001',
        name: 'Optional Step Test',
        description: 'Test optional step handling',
        steps: [
          {
            agentRole: 'Debug_Runtime',
            input: 'Fix runtime issue',
            dependencies: ['Debug_Syntax'], // unmet dependency
            optional: true,
          },
          { agentRole: 'Test_Unit_Pure', input: 'Run tests' },
        ],
      };

      const result = await orch.executeWorkflow(config);

      // Workflow should report errors from the optional step
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });

  describe('executeSquad', () => {
    it('should throw error for non-existent squad', async () => {
      // @ts-expect-error - testing invalid squad
      await expect(orch.executeSquad('nonexistent_squad', 'test'))
        .rejects.toThrow('not found');
    });

    it('should execute a valid squad workflow', async () => {
      const result = await orch.executeSquad('planning', 'Build a dashboard');

      expect(result.success).toBeDefined();
      expect(result.workflowId).toBeDefined();
      expect(result.startedAt).toBeInstanceOf(Date);
      expect(result.completedAt).toBeInstanceOf(Date);
    });

    it('should accept a custom workflow ordering', async () => {
      const result = await orch.executeSquad(
        'planning',
        'test input',
        ['System_Architect', 'PM_Requirements']
      );

      expect(result.success).toBeDefined();
    });
  });
});

describe('commands wrapper', () => {
  it('should list all agents when no squad specified', () => {
    const allAgents = commands.listAgents();
    expect(Array.isArray(allAgents)).toBe(true);
    expect(allAgents.length).toBeGreaterThan(0);
  });

  it('should list agents for a specific squad', () => {
    const planningAgents = commands.listAgents('planning');
    expect(Array.isArray(planningAgents)).toBe(true);
    planningAgents.forEach(agent => {
      expect(agent.squad).toBe('planning');
    });
  });

  it('should list all squads', () => {
    const squads = commands.listSquads();
    expect(Array.isArray(squads)).toBe(true);
    expect(squads.length).toBeGreaterThan(0);
  });

  it('should show agent details for a valid role', () => {
    const agent = commands.showAgent('BE_API_Builder');
    expect(agent).toBeDefined();
    expect(agent?.role).toBe('BE_API_Builder');
  });

  it('should return undefined for invalid agent role', () => {
    // @ts-expect-error - testing invalid role
    const agent = commands.showAgent('Invalid_Role');
    expect(agent).toBeUndefined();
  });

  it('should return welcome message', () => {
    const msg = commands.welcome();
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });

  it('should return help message', () => {
    const msg = commands.help();
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });

  it('should return task history', () => {
    const history = commands.showHistory();
    expect(Array.isArray(history)).toBe(true);
  });

  it('should return statistics', () => {
    const stats = commands.showStats();
    expect(stats).toHaveProperty('totalTasks');
    expect(stats).toHaveProperty('completed');
    expect(stats).toHaveProperty('failed');
    expect(stats).toHaveProperty('successRate');
    expect(stats).toHaveProperty('agentUsage');
  });

  it('should throw for unknown workflow name', () => {
    expect(() => {
      // @ts-expect-error - testing invalid workflow
      commands.runWorkflow('nonExistentWorkflow', 'test');
    }).toThrow('not found');
  });
});

describe('workflows', () => {
  describe('fullDevelopment', () => {
    it('should create a valid workflow config', () => {
      const config = workflows.fullDevelopment('Build a todo app');
      expect(config.id).toBe('full-dev-001');
      expect(config.name).toBe('Full Development Workflow');
      expect(config.steps.length).toBeGreaterThan(5);
      expect(config.steps[0].agentRole).toBe('PM_Requirements');
      expect(config.steps[0].input).toBe('Build a todo app');
    });

    it('should have proper dependency chains', () => {
      const config = workflows.fullDevelopment('test');
      const architectStep = config.steps.find(s => s.agentRole === 'System_Architect');
      expect(architectStep?.dependencies).toContain('PM_Requirements');
      expect(architectStep?.dependencies).toContain('UI_UX_Designer');
    });

    it('should have function-based inputs for dependent steps', () => {
      const config = workflows.fullDevelopment('test');
      const designerStep = config.steps.find(s => s.agentRole === 'UI_UX_Designer');
      expect(typeof designerStep?.input).toBe('function');
      if (typeof designerStep?.input === 'function') {
        const result = designerStep.input('previous output');
        expect(result).toContain('previous output');
      }
    });

    it('should have all 11 steps in the full development workflow', () => {
      const config = workflows.fullDevelopment('test');
      expect(config.steps.length).toBe(11);
    });
  });

  describe('quickFix', () => {
    it('should create a valid quick fix workflow', () => {
      const config = workflows.quickFix('TypeError in UserList');
      expect(config.id).toBe('quick-fix-001');
      expect(config.name).toBe('Quick Fix Workflow');
      expect(config.retryOnFailure).toBe(true);
      expect(config.maxRetries).toBe(2);
      expect(config.steps[0].agentRole).toBe('Debug_Syntax');
    });

    it('should mark optional steps correctly', () => {
      const config = workflows.quickFix('test error');
      const runtimeStep = config.steps.find(s => s.agentRole === 'Debug_Runtime');
      expect(runtimeStep?.optional).toBe(true);
      const logicStep = config.steps.find(s => s.agentRole === 'Debug_Logic');
      expect(logicStep?.optional).toBe(true);
    });

    it('should have 4 steps total', () => {
      const config = workflows.quickFix('test');
      expect(config.steps.length).toBe(4);
    });
  });

  describe('deployment', () => {
    it('should create a valid deployment workflow', () => {
      const config = workflows.deployment('Release v1.0');
      expect(config.id).toBe('deployment-001');
      expect(config.name).toBe('Deployment Workflow');
      expect(config.steps.length).toBe(3);
      expect(config.steps[0].agentRole).toBe('Test_E2E_Flow');
      expect(config.steps[1].agentRole).toBe('DevOps_Pipeline');
      expect(config.steps[2].agentRole).toBe('Docs_Writer');
    });

    it('should have proper dependency ordering', () => {
      const config = workflows.deployment('test');
      const devopsStep = config.steps.find(s => s.agentRole === 'DevOps_Pipeline');
      expect(devopsStep?.dependencies).toContain('Test_E2E_Flow');
      const docsStep = config.steps.find(s => s.agentRole === 'Docs_Writer');
      expect(docsStep?.dependencies).toContain('DevOps_Pipeline');
    });
  });
});
