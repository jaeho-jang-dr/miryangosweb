/**
 * @jest-environment node
 *
 * Tests for the AgentCLI class.
 */

import { AgentCLI, CLIOptions } from '../cli';
import { orchestrator } from '../orchestrator';

describe('AgentCLI', () => {
  let cli: AgentCLI;

  beforeEach(() => {
    cli = new AgentCLI();
    // Speed up tests by making the orchestrator delay resolve immediately
    (orchestrator as any).delay = jest.fn().mockResolvedValue(undefined);
  });

  describe('constructor', () => {
    it('should create an instance with default options', () => {
      const defaultCli = new AgentCLI();
      expect(defaultCli).toBeDefined();
    });

    it('should accept custom options', () => {
      const options: CLIOptions = {
        interactive: false,
        verbose: true,
        outputFormat: 'json',
      };
      const customCli = new AgentCLI(options);
      expect(customCli).toBeDefined();
    });
  });

  describe('displayWelcome', () => {
    it('should return a welcome string', () => {
      const welcome = cli.displayWelcome();
      expect(typeof welcome).toBe('string');
      expect(welcome.length).toBeGreaterThan(0);
    });

    it('should contain system title', () => {
      const welcome = cli.displayWelcome();
      expect(welcome).toContain('Agent System');
    });

    it('should contain system statistics', () => {
      const welcome = cli.displayWelcome();
      expect(welcome).toContain('Total Agents');
      expect(welcome).toContain('Active Agents');
      expect(welcome).toContain('Squads');
    });

    it('should list available commands', () => {
      const welcome = cli.displayWelcome();
      expect(welcome).toContain('list-agents');
      expect(welcome).toContain('run-agent');
      expect(welcome).toContain('run-squad');
      expect(welcome).toContain('show-history');
    });
  });

  describe('listAgents', () => {
    it('should return a string listing agents in text format', () => {
      const result = cli.listAgents();
      expect(typeof result).toBe('string');
      expect(result).toContain('Available Agents');
    });

    it('should filter by squad when squad type is provided', () => {
      const result = cli.listAgents('planning');
      expect(result).toContain('planning');
    });

    it('should return JSON when outputFormat is json', () => {
      const jsonCli = new AgentCLI({ outputFormat: 'json' });
      const result = jsonCli.listAgents();
      const parsed = JSON.parse(result);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);
    });

    it('should include verbose info when verbose option is true', () => {
      const verboseCli = new AgentCLI({ verbose: true });
      const result = verboseCli.listAgents();
      expect(result).toContain('Capabilities');
      expect(result).toContain('Tools');
    });
  });

  describe('listSquads', () => {
    it('should return a string listing squads', () => {
      const result = cli.listSquads();
      expect(typeof result).toBe('string');
      expect(result).toContain('Available Squads');
    });

    it('should contain squad names', () => {
      const result = cli.listSquads();
      expect(result).toContain('planning');
      expect(result).toContain('frontend');
      expect(result).toContain('backend');
    });

    it('should return JSON when outputFormat is json', () => {
      const jsonCli = new AgentCLI({ outputFormat: 'json' });
      const result = jsonCli.listSquads();
      const parsed = JSON.parse(result);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);
    });
  });

  describe('showAgent', () => {
    it('should show details for a valid agent role', () => {
      const result = cli.showAgent('PM_Requirements');
      expect(typeof result).toBe('string');
      expect(result).toContain('PM_Requirements');
      expect(result).toContain('planning');
    });

    it('should return error message for invalid agent role', () => {
      // @ts-expect-error - testing invalid role
      const result = cli.showAgent('NonExistent_Agent');
      expect(result).toContain('not found');
    });

    it('should include system prompt when verbose', () => {
      const verboseCli = new AgentCLI({ verbose: true });
      const result = verboseCli.showAgent('PM_Requirements');
      expect(result).toContain('System Prompt');
    });

    it('should return JSON when outputFormat is json', () => {
      const jsonCli = new AgentCLI({ outputFormat: 'json' });
      const result = jsonCli.showAgent('PM_Requirements');
      const parsed = JSON.parse(result);
      expect(parsed.role).toBe('PM_Requirements');
      expect(parsed.squad).toBe('planning');
    });
  });

  describe('runAgent', () => {
    it('should return error message for non-existent agent', async () => {
      // @ts-expect-error - testing invalid role
      const result = await cli.runAgent('NonExistent', 'test');
      expect(result).toContain('not found');
    });

    it('should execute a valid agent and return formatted result', async () => {
      const result = await cli.runAgent('Debug_Syntax', 'Fix TypeScript errors');

      expect(typeof result).toBe('string');
      expect(result).toContain('Executing Agent');
    });

    it('should return JSON when outputFormat is json', async () => {
      const jsonCli = new AgentCLI({ outputFormat: 'json' });
      const result = await jsonCli.runAgent('Test_Unit_Pure', 'Run all tests');

      const parsed = JSON.parse(result);
      expect(parsed).toHaveProperty('success');
      expect(parsed).toHaveProperty('duration');
    });

    it('should show success indicator for successful execution', async () => {
      const result = await cli.runAgent('PM_Requirements', 'Create a feature spec');

      expect(result).toContain('Success');
      expect(result).toContain('Input');
      expect(result).toContain('Output');
    });

    it('should truncate long input in output', async () => {
      const longInput = 'x'.repeat(300);
      const result = await cli.runAgent('PM_Requirements', longInput);

      // The formatInput should truncate to 200 chars + '...'
      expect(result).toContain('...');
    });
  });

  describe('showHistory', () => {
    it('should show empty history message when no tasks run', () => {
      // Clear the singleton orchestrator's history to ensure clean state
      orchestrator.clearHistory();
      const result = cli.showHistory();
      expect(result).toContain('No task history');
    });

    it('should return JSON when outputFormat is json', () => {
      const jsonCli = new AgentCLI({ outputFormat: 'json' });
      const result = jsonCli.showHistory();
      const parsed = JSON.parse(result);
      expect(Array.isArray(parsed)).toBe(true);
    });
  });

  describe('showStats', () => {
    it('should show execution statistics', () => {
      const result = cli.showStats();
      expect(typeof result).toBe('string');
      expect(result).toContain('Execution Statistics');
      expect(result).toContain('Total Tasks');
    });

    it('should return JSON when outputFormat is json', () => {
      const jsonCli = new AgentCLI({ outputFormat: 'json' });
      const result = jsonCli.showStats();
      const parsed = JSON.parse(result);
      expect(parsed).toHaveProperty('totalTasks');
      expect(parsed).toHaveProperty('completed');
      expect(parsed).toHaveProperty('failed');
      expect(parsed).toHaveProperty('successRate');
    });
  });

  describe('getHelp', () => {
    it('should return welcome message when no command specified', () => {
      const result = cli.getHelp();
      expect(result).toContain('Agent System');
    });

    it('should return help for list-agents command', () => {
      const result = cli.getHelp('list-agents');
      expect(result).toContain('list-agents');
      expect(result).toContain('Examples');
    });

    it('should return help for run-agent command', () => {
      const result = cli.getHelp('run-agent');
      expect(result).toContain('run-agent');
      expect(result).toContain('Execute a single agent');
    });

    it('should return help for run-workflow command', () => {
      const result = cli.getHelp('run-workflow');
      expect(result).toContain('run-workflow');
      expect(result).toContain('fullDevelopment');
      expect(result).toContain('quickFix');
      expect(result).toContain('deployment');
    });

    it('should return help for show-agent command', () => {
      const result = cli.getHelp('show-agent');
      expect(result).toContain('show-agent');
    });

    it('should return help for show-history command', () => {
      const result = cli.getHelp('show-history');
      expect(result).toContain('show-history');
    });

    it('should return help for show-stats command', () => {
      const result = cli.getHelp('show-stats');
      expect(result).toContain('show-stats');
    });

    it('should return error for unknown command', () => {
      const result = cli.getHelp('nonexistent-command');
      expect(result).toContain('No help available');
    });
  });

  describe('runWorkflow', () => {
    it('should return error for non-existent workflow', async () => {
      // @ts-expect-error - testing invalid workflow
      const result = await cli.runWorkflow('nonExistent', 'test');
      expect(result).toContain('not found');
    });

    it('should execute a valid workflow and return formatted result', async () => {
      const result = await cli.runWorkflow('quickFix', 'Fix a bug');
      expect(typeof result).toBe('string');
      expect(result).toContain('Executing Workflow');
    });
  });

  describe('runSquad', () => {
    it('should return error for non-existent squad', async () => {
      // @ts-expect-error - testing invalid squad
      const result = await cli.runSquad('nonExistent', 'test');
      expect(result).toContain('not found');
    });

    it('should execute a valid squad and return formatted result', async () => {
      const result = await cli.runSquad('backend', 'Build an API');
      expect(typeof result).toBe('string');
      expect(result).toContain('Executing Squad');
    });
  });
});
