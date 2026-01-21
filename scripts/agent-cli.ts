#!/usr/bin/env node

/**
 * Agent CLI Launcher
 * Interactive command-line interface for the AI Agent System
 *
 * Usage:
 *   npm run agent              # Interactive mode
 *   npm run agent list         # List all agents
 *   npm run agent run PM_Requirements "Create todo app"
 *   npm run agent workflow fullDevelopment "E-commerce platform"
 */

import { commands } from '../src/agents';

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  console.log('\n🤖 AI Agent System - MiryAngos Web\n');

  if (!command || command === 'help') {
    showHelp();
    return;
  }

  try {
    switch (command) {
      case 'list':
        handleList(args[1]);
        break;

      case 'show':
        handleShow(args[1]);
        break;

      case 'run':
        await handleRun(args[1], args.slice(2).join(' '));
        break;

      case 'squad':
        await handleSquad(args[1], args.slice(2).join(' '));
        break;

      case 'workflow':
        await handleWorkflow(args[1], args.slice(2).join(' '));
        break;

      case 'stats':
        handleStats();
        break;

      case 'history':
        handleHistory();
        break;

      case 'interactive':
        await interactive();
        break;

      default:
        console.error(`❌ Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error: any) {
    console.error('\n❌ Error:', error.message || String(error));
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
📖 Available Commands:

  list [type]                    List agents, squads, or workflows
    - list agents                List all agents
    - list squads                List all squads
    - list workflows             List available workflows

  show <agent>                   Show agent details
    - show PM_Requirements       Show PM_Requirements agent info

  run <agent> <task>             Run a single agent
    - run PM_Requirements "Create todo app"

  squad <squad> <task>           Run an entire squad
    - squad planning "Build e-commerce platform"

  workflow <name> <task>         Execute a predefined workflow
    - workflow fullDevelopment "User management system"

  stats                          Show system statistics
  history                        Show execution history
  interactive                    Enter interactive mode
  help                           Show this help message

Examples:

  # List all agents
  npm run agent list agents

  # Run single agent
  npm run agent run PM_Requirements "Create a todo application"

  # Run planning squad
  npm run agent squad planning "E-commerce platform"

  # Run full development workflow
  npm run agent workflow fullDevelopment "User authentication"

  # Interactive mode
  npm run agent interactive
`);
}

function handleList(type?: string) {
  switch (type) {
    case 'agents':
      console.log(commands.listAgents());
      break;
    case 'squads':
      console.log(commands.listSquads());
      break;
    case 'workflows':
      console.log('📋 Available Workflows:\n');
      console.log('  - fullDevelopment: Complete development cycle');
      console.log('  - quickFix: Rapid bug fixing');
      console.log('  - deployment: Deployment preparation');
      break;
    default:
      console.log(commands.listAgents());
  }
}

function handleShow(agentRole?: string) {
  if (!agentRole) {
    console.error('❌ Please specify an agent role');
    console.log('Usage: npm run agent show <agent>');
    return;
  }

  const result = commands.showAgent(agentRole as any);
  console.log(result);
}

async function handleRun(agentRole?: string, task?: string) {
  if (!agentRole || !task) {
    console.error('❌ Please specify agent and task');
    console.log('Usage: npm run agent run <agent> "<task>"');
    return;
  }

  console.log(`\n🚀 Running ${agentRole}...`);
  console.log(`📝 Task: ${task}\n`);

  const result = await commands.runAgent(agentRole as any, task);

  if (result.success) {
    console.log('\n✅ Success!\n');
    console.log(result.data);
  } else {
    console.log('\n❌ Failed!\n');
    console.error(result.error);
  }
}

async function handleSquad(squadType?: string, task?: string) {
  if (!squadType || !task) {
    console.error('❌ Please specify squad and task');
    console.log('Usage: npm run agent squad <squad> "<task>"');
    return;
  }

  console.log(`\n🚀 Running ${squadType} squad...`);
  console.log(`📝 Task: ${task}\n`);

  const result = await commands.runSquad(squadType as any, task);

  if (result.success) {
    console.log('\n✅ Squad execution completed!\n');
    console.log(JSON.stringify(result.steps, null, 2));
  } else {
    console.log('\n❌ Squad execution failed!\n');
    console.error(result.errors?.join('\n') || 'Unknown error');
  }
}

async function handleWorkflow(workflowName?: string, task?: string) {
  if (!workflowName || !task) {
    console.error('❌ Please specify workflow and task');
    console.log('Usage: npm run agent workflow <workflow> "<task>"');
    return;
  }

  console.log(`\n🚀 Executing ${workflowName} workflow...`);
  console.log(`📝 Task: ${task}\n`);

  const result = await commands.runWorkflow(workflowName as any, task);

  if (result.success) {
    console.log('\n✅ Workflow completed!\n');
    console.log(JSON.stringify(result.steps, null, 2));
  } else {
    console.log('\n❌ Workflow failed!\n');
    console.error(result.errors?.join('\n') || 'Unknown error');
  }
}

function handleStats() {
  const stats = commands.showStats();
  console.log(stats);
}

function handleHistory() {
  const history = commands.showHistory();
  console.log(history);
}

async function interactive() {
  console.log('🎮 Interactive Mode - Coming Soon!');
  console.log('\nFor now, use command-line arguments:');
  console.log('  npm run agent help');
}

// Run main function
main().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
