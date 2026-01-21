/**
 * Agent CLI Interface
 * 대화형 에이전트 선택 및 실행 인터페이스
 */

import {
  Agent,
  AgentRole,
  SquadType,
  AgentTask
} from '../types';
import {
  getAgentByRole,
  getAgentsBySquad,
  getSquadConfig,
  squadConfigs,
  allAgents
} from '../index';
import {
  orchestrator,
  WorkflowConfig,
  workflows
} from '../orchestrator';

export interface CLIOptions {
  interactive?: boolean;
  verbose?: boolean;
  outputFormat?: 'json' | 'text' | 'markdown';
}

export class AgentCLI {
  private options: CLIOptions;

  constructor(options: CLIOptions = {}) {
    this.options = {
      interactive: true,
      verbose: false,
      outputFormat: 'text',
      ...options
    };
  }

  /**
   * Display welcome message and system info
   */
  displayWelcome(): string {
    const stats = this.getSystemStats();

    return `
╔═══════════════════════════════════════════════════════════════╗
║                  Agent System v1.0.0                          ║
║                  Claude Code Agent System                     ║
╚═══════════════════════════════════════════════════════════════╝

📊 System Statistics:
   • Total Agents: ${stats.totalAgents}
   • Active Agents: ${stats.activeAgents}
   • Squads: ${stats.totalSquads}

Available Commands:
   • list-agents      - List all available agents
   • list-squads      - List all squads
   • run-agent        - Execute a single agent
   • run-squad        - Execute a squad workflow
   • run-workflow     - Execute a predefined workflow
   • show-agent       - Show agent details
   • show-history     - Show task history
   • show-stats       - Show execution statistics
   • help             - Show this help message
   • exit             - Exit the CLI

Type 'help <command>' for more information about a specific command.
`;
  }

  /**
   * List all available agents
   */
  listAgents(squadFilter?: SquadType): string {
    const agents = squadFilter
      ? getAgentsBySquad(squadFilter)
      : allAgents;

    if (this.options.outputFormat === 'json') {
      return JSON.stringify(agents, null, 2);
    }

    let output = '\n📋 Available Agents:\n\n';

    squadConfigs.forEach(squad => {
      const squadAgents = agents.filter(a => a.squad === squad.type);
      if (squadAgents.length === 0) return;

      output += `\n🏢 ${squad.name} (${squad.type})\n`;
      output += `   ${squad.description}\n\n`;

      squadAgents.forEach(agent => {
        const status = agent.active ? '✅' : '❌';
        output += `   ${status} ${agent.role}\n`;
        output += `      ${agent.nickname}\n`;
        output += `      ${agent.purpose}\n`;
        if (this.options.verbose) {
          output += `      Capabilities: ${agent.capabilities.join(', ')}\n`;
          output += `      Tools: ${agent.tools.join(', ')}\n`;
        }
        output += '\n';
      });
    });

    return output;
  }

  /**
   * List all squads
   */
  listSquads(): string {
    if (this.options.outputFormat === 'json') {
      return JSON.stringify(squadConfigs, null, 2);
    }

    let output = '\n🏢 Available Squads:\n\n';

    squadConfigs.forEach((squad, index) => {
      output += `${index + 1}. ${squad.name} (${squad.type})\n`;
      output += `   ${squad.description}\n`;
      output += `   Agents: ${squad.agents.length}\n`;
      output += `   Members: ${squad.agents.join(', ')}\n`;
      if (squad.defaultWorkflow) {
        output += `   Default Workflow: ${squad.defaultWorkflow.join(' → ')}\n`;
      }
      output += '\n';
    });

    return output;
  }

  /**
   * Show detailed agent information
   */
  showAgent(role: AgentRole): string {
    const agent = getAgentByRole(role);

    if (!agent) {
      return `❌ Agent '${role}' not found`;
    }

    if (this.options.outputFormat === 'json') {
      return JSON.stringify(agent, null, 2);
    }

    return `
╔═══════════════════════════════════════════════════════════════╗
║  Agent Details: ${agent.name.padEnd(45)}║
╚═══════════════════════════════════════════════════════════════╝

📛 Role: ${agent.role}
🏷️  Nickname: ${agent.nickname}
🏢 Squad: ${agent.squad}
🎯 Purpose: ${agent.purpose}

📝 Description:
   ${agent.description}

💪 Capabilities:
${agent.capabilities.map(c => `   • ${c}`).join('\n')}

🛠️  Tools:
${agent.tools.map(t => `   • ${t}`).join('\n')}

📊 Status: ${agent.active ? '✅ Active' : '❌ Inactive'}
📅 Created: ${agent.createdAt.toISOString()}
${agent.lastUsed ? `🕐 Last Used: ${agent.lastUsed.toISOString()}` : ''}

${this.options.verbose ? `\n📜 System Prompt:\n${agent.systemPrompt}\n` : ''}
`;
  }

  /**
   * Execute a single agent
   */
  async runAgent(
    role: AgentRole,
    input: string
  ): Promise<string> {
    const agent = getAgentByRole(role);

    if (!agent) {
      return `❌ Agent '${role}' not found`;
    }

    const output = `\n🚀 Executing Agent: ${agent.name}\n`;
    const startTime = Date.now();

    try {
      const result = await orchestrator.executeAgent(role, input);

      const duration = Date.now() - startTime;

      if (this.options.outputFormat === 'json') {
        return JSON.stringify({ ...result, duration }, null, 2);
      }

      if (result.success) {
        return output + `
✅ Success (${duration}ms)

📥 Input:
${this.formatInput(input)}

📤 Output:
${this.formatOutput(result.data)}
`;
      } else {
        return output + `
❌ Failed (${duration}ms)

📥 Input:
${this.formatInput(input)}

⚠️  Error:
${result.error}
`;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      return output + `
❌ Exception (${duration}ms)

📥 Input:
${this.formatInput(input)}

⚠️  Error:
${error instanceof Error ? error.message : String(error)}
`;
    }
  }

  /**
   * Execute a squad workflow
   */
  async runSquad(
    squadType: SquadType,
    input: string,
    customWorkflow?: AgentRole[]
  ): Promise<string> {
    const squadConfig = getSquadConfig(squadType);

    if (!squadConfig) {
      return `❌ Squad '${squadType}' not found`;
    }

    const output = `\n🏢 Executing Squad: ${squadConfig.name}\n`;
    const startTime = Date.now();

    try {
      const result = await orchestrator.executeSquad(squadType, input, customWorkflow);

      const duration = Date.now() - startTime;

      if (this.options.outputFormat === 'json') {
        return JSON.stringify({ ...result, duration }, null, 2);
      }

      return output + this.formatWorkflowResult(result);
    } catch (error) {
      const duration = Date.now() - startTime;
      return output + `
❌ Exception (${duration}ms)

⚠️  Error:
${error instanceof Error ? error.message : String(error)}
`;
    }
  }

  /**
   * Execute a predefined workflow
   */
  async runWorkflow(
    workflowName: keyof typeof workflows,
    input: string
  ): Promise<string> {
    const workflowFactory = workflows[workflowName];

    if (!workflowFactory) {
      return `❌ Workflow '${workflowName}' not found`;
    }

    const config = workflowFactory(input);
    const output = `\n⚙️  Executing Workflow: ${config.name}\n`;
    const startTime = Date.now();

    try {
      const result = await orchestrator.executeWorkflow(config);

      const duration = Date.now() - startTime;

      if (this.options.outputFormat === 'json') {
        return JSON.stringify({ ...result, duration }, null, 2);
      }

      return output + this.formatWorkflowResult(result);
    } catch (error) {
      const duration = Date.now() - startTime;
      return output + `
❌ Exception (${duration}ms)

⚠️  Error:
${error instanceof Error ? error.message : String(error)}
`;
    }
  }

  /**
   * Show task history
   */
  showHistory(limit: number = 10): string {
    const history = orchestrator.getTaskHistory(limit);

    if (this.options.outputFormat === 'json') {
      return JSON.stringify(history, null, 2);
    }

    if (history.length === 0) {
      return '\n📋 No task history available\n';
    }

    let output = `\n📋 Task History (Last ${Math.min(limit, history.length)} tasks):\n\n`;

    history.forEach((task, index) => {
      const statusIcon = task.status === 'completed' ? '✅' :
                        task.status === 'failed' ? '❌' :
                        task.status === 'running' ? '🔄' : '⏳';

      output += `${index + 1}. ${statusIcon} ${task.agentRole}\n`;
      output += `   Status: ${task.status}\n`;
      output += `   Started: ${task.startedAt?.toISOString()}\n`;
      if (task.completedAt) {
        const duration = task.completedAt.getTime() - (task.startedAt?.getTime() || 0);
        output += `   Duration: ${duration}ms\n`;
      }
      if (task.error) {
        output += `   Error: ${task.error}\n`;
      }
      if (this.options.verbose && task.output) {
        output += `   Output: ${task.output.substring(0, 100)}...\n`;
      }
      output += '\n';
    });

    return output;
  }

  /**
   * Show execution statistics
   */
  showStats(): string {
    const stats = orchestrator.getStatistics();

    if (this.options.outputFormat === 'json') {
      return JSON.stringify(stats, null, 2);
    }

    let output = `
📊 Execution Statistics:

📈 Overall:
   • Total Tasks: ${stats.totalTasks}
   • Completed: ${stats.completed}
   • Failed: ${stats.failed}
   • Success Rate: ${stats.successRate.toFixed(2)}%

📋 Agent Usage:
`;

    Object.entries(stats.agentUsage)
      .sort(([, a], [, b]) => b - a)
      .forEach(([role, count]) => {
        const percentage = ((count / stats.totalTasks) * 100).toFixed(1);
        output += `   • ${role}: ${count} (${percentage}%)\n`;
      });

    return output;
  }

  /**
   * Get help information
   */
  getHelp(command?: string): string {
    if (!command) {
      return this.displayWelcome();
    }

    const helpTexts: Record<string, string> = {
      'list-agents': `
list-agents [squad]

List all available agents, optionally filtered by squad.

Examples:
  list-agents           - List all agents
  list-agents planning  - List agents in planning squad
  list-agents frontend  - List agents in frontend squad
`,
      'list-squads': `
list-squads

List all available squads with their configurations.
`,
      'run-agent': `
run-agent <role> <input>

Execute a single agent with the given input.

Examples:
  run-agent PM_Requirements "Create a todo app"
  run-agent FE_Structure "Build login page"
  run-agent Debug_Syntax "Fix TypeScript errors"
`,
      'run-squad': `
run-squad <squad> <input> [workflow]

Execute all agents in a squad with the given input.

Examples:
  run-squad planning "Create a todo app"
  run-squad frontend "Build dashboard"
  run-squad test "Test user authentication"
`,
      'run-workflow': `
run-workflow <workflow-name> <input>

Execute a predefined workflow.

Available workflows:
  • fullDevelopment - Complete development cycle
  • quickFix        - Rapid debugging and testing
  • deployment      - Test, deploy, and document

Examples:
  run-workflow fullDevelopment "User management system"
  run-workflow quickFix "Cannot read property of undefined"
  run-workflow deployment "Shopping cart feature"
`,
      'show-agent': `
show-agent <role>

Show detailed information about a specific agent.

Examples:
  show-agent PM_Requirements
  show-agent FE_Structure
  show-agent Test_Unit_Pure
`,
      'show-history': `
show-history [limit]

Show recent task execution history.

Examples:
  show-history     - Show last 10 tasks
  show-history 20  - Show last 20 tasks
`,
      'show-stats': `
show-stats

Display execution statistics including success rate and agent usage.
`
    };

    return helpTexts[command] || `❌ No help available for command: ${command}`;
  }

  // Private helper methods

  private getSystemStats() {
    return {
      totalAgents: allAgents.length,
      activeAgents: allAgents.filter(a => a.active).length,
      totalSquads: squadConfigs.length
    };
  }

  private formatInput(input: string): string {
    const maxLength = 200;
    return input.length > maxLength
      ? input.substring(0, maxLength) + '...'
      : input;
  }

  private formatOutput(output: any): string {
    if (typeof output === 'string') {
      return output;
    }
    return JSON.stringify(output, null, 2);
  }

  private formatWorkflowResult(result: any): string {
    const status = result.success ? '✅ Success' : '❌ Failed';
    const duration = result.totalDuration || 0;

    let output = `
${status} (${duration}ms)

📊 Workflow Summary:
   • Steps Executed: ${result.steps?.length || 0}
   • Started: ${result.startedAt?.toISOString()}
   • Completed: ${result.completedAt?.toISOString()}

📋 Step Results:
`;

    if (result.steps && result.steps.length > 0) {
      result.steps.forEach((step: AgentTask, index: number) => {
        const stepStatus = step.status === 'completed' ? '✅' :
                          step.status === 'failed' ? '❌' :
                          step.status === 'running' ? '🔄' : '⏳';

        output += `   ${index + 1}. ${stepStatus} ${step.agentRole} (${step.status})\n`;

        if (step.error) {
          output += `      ⚠️  ${step.error}\n`;
        }

        if (this.options.verbose && step.output) {
          output += `      📤 ${step.output.substring(0, 100)}...\n`;
        }
      });
    }

    if (result.errors && result.errors.length > 0) {
      output += `\n⚠️  Errors:\n`;
      result.errors.forEach((error: string) => {
        output += `   • ${error}\n`;
      });
    }

    return output;
  }
}

// Export singleton instance
export const cli = new AgentCLI();

// Export command handlers for easy integration
export const commands = {
  welcome: () => cli.displayWelcome(),
  listAgents: (squad?: SquadType) => cli.listAgents(squad),
  listSquads: () => cli.listSquads(),
  showAgent: (role: AgentRole) => cli.showAgent(role),
  runAgent: (role: AgentRole, input: string) => cli.runAgent(role, input),
  runSquad: (squad: SquadType, input: string, workflow?: AgentRole[]) =>
    cli.runSquad(squad, input, workflow),
  runWorkflow: (name: keyof typeof workflows, input: string) =>
    cli.runWorkflow(name, input),
  showHistory: (limit?: number) => cli.showHistory(limit),
  showStats: () => cli.showStats(),
  help: (command?: string) => cli.getHelp(command)
};
