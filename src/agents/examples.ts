/**
 * Agent System Usage Examples
 * Demonstrates how to use the Agent System
 */

import {
  commands,
  orchestrator,
  workflows,
  getAgentByRole,
  getAgentsBySquad
} from './index';

// Example 1: Display welcome and list all agents
export async function example1_ListAgents() {
  console.log(commands.welcome());
  console.log(commands.listAgents());
}

// Example 2: Show specific agent details
export async function example2_ShowAgent() {
  console.log(commands.showAgent('PM_Requirements'));
  console.log(commands.showAgent('FE_Structure'));
}

// Example 3: Run a single agent
export async function example3_RunSingleAgent() {
  const result = await commands.runAgent(
    'PM_Requirements',
    'Create a todo application with user authentication'
  );
  console.log(result);
}

// Example 4: Run a squad workflow
export async function example4_RunSquad() {
  const result = await commands.runSquad(
    'planning',
    'Build an e-commerce platform'
  );
  console.log(result);
}

// Example 5: Run predefined workflow
export async function example5_RunWorkflow() {
  const result = await commands.runWorkflow(
    'fullDevelopment',
    'User management system with roles and permissions'
  );
  console.log(result);
}

// Example 6: Custom workflow with orchestrator
export async function example6_CustomWorkflow() {
  const customWorkflow = {
    id: 'custom-001',
    name: 'Custom UI Development',
    description: 'Design and implement a custom UI component',
    steps: [
      {
        agentRole: 'UI_UX_Designer' as const,
        input: 'Design a modern dashboard layout'
      },
      {
        agentRole: 'FE_Structure' as const,
        input: (prev?: string) => `Create structure for: ${prev}`,
        dependencies: ['UI_UX_Designer' as const]
      },
      {
        agentRole: 'FE_Styler' as const,
        input: (prev?: string) => `Style the dashboard: ${prev}`,
        dependencies: ['FE_Structure' as const]
      },
      {
        agentRole: 'Test_E2E_Flow' as const,
        input: (prev?: string) => `Test the dashboard: ${prev}`,
        dependencies: ['FE_Styler' as const]
      }
    ]
  };

  const result = await orchestrator.executeWorkflow(customWorkflow);
  console.log('Custom workflow result:', result);
}

// Example 7: Quick fix workflow for debugging
export async function example7_QuickFix() {
  const result = await commands.runWorkflow(
    'quickFix',
    'TypeError: Cannot read property "map" of undefined in UserList.tsx'
  );
  console.log(result);
}

// Example 8: View statistics
export async function example8_ViewStats() {
  // Run some tasks first
  await commands.runAgent('Debug_Syntax', 'Fix TypeScript errors');
  await commands.runAgent('Test_Unit_Pure', 'Test authentication logic');

  // Show stats
  console.log(commands.showStats());
  console.log(commands.showHistory(5));
}

// Example 9: List squads and their agents
export async function example9_SquadInfo() {
  console.log(commands.listSquads());

  // Get specific squad agents
  const testAgents = getAgentsBySquad('test');
  console.log('Test Squad Agents:');
  testAgents.forEach(agent => {
    console.log(`  - ${agent.role}: ${agent.purpose}`);
  });
}

// Example 10: Parallel execution with custom workflow
export async function example10_ParallelExecution() {
  const parallelWorkflow = {
    id: 'parallel-001',
    name: 'Parallel Testing',
    description: 'Run all test types in parallel',
    parallel: true,
    steps: [
      {
        agentRole: 'Test_Unit_Pure' as const,
        input: 'Test utility functions'
      },
      {
        agentRole: 'Test_Integration_Mock' as const,
        input: 'Test API integration'
      },
      {
        agentRole: 'Test_E2E_Flow' as const,
        input: 'Test user workflows'
      },
      {
        agentRole: 'Test_Edge_Crusher' as const,
        input: 'Test edge cases'
      }
    ]
  };

  const result = await orchestrator.executeWorkflow(parallelWorkflow);
  console.log('Parallel execution result:', result);
}

// Example 11: Deployment workflow
export async function example11_Deployment() {
  const result = await commands.runWorkflow(
    'deployment',
    'Shopping cart feature with payment integration'
  );
  console.log(result);
}

// Example 12: Complete development cycle
export async function example12_FullCycle() {
  console.log('Starting full development cycle...\n');

  // Step 1: Planning
  console.log('Phase 1: Planning');
  const planningResult = await commands.runSquad(
    'planning',
    'Build a blog platform with Markdown support'
  );
  console.log(planningResult);

  // Step 2: Frontend
  console.log('\nPhase 2: Frontend Development');
  const frontendResult = await commands.runSquad(
    'frontend',
    'Implement blog post editor and viewer'
  );
  console.log(frontendResult);

  // Step 3: Backend
  console.log('\nPhase 3: Backend Development');
  const backendResult = await commands.runSquad(
    'backend',
    'Create blog post API and database schema'
  );
  console.log(backendResult);

  // Step 4: Testing
  console.log('\nPhase 4: Testing');
  const testResult = await commands.runSquad(
    'test',
    'Test blog functionality'
  );
  console.log(testResult);

  // Step 5: Deployment
  console.log('\nPhase 5: Deployment');
  const deployResult = await commands.runSquad(
    'ops',
    'Deploy blog platform'
  );
  console.log(deployResult);

  console.log('\n✅ Full development cycle completed!');
}

// Example 13: Error handling and retry
export async function example13_ErrorHandling() {
  const workflowWithRetry = {
    id: 'retry-001',
    name: 'Resilient Workflow',
    description: 'Workflow with retry on failure',
    retryOnFailure: true,
    maxRetries: 3,
    steps: [
      {
        agentRole: 'Debug_Syntax' as const,
        input: 'Fix critical syntax errors'
      },
      {
        agentRole: 'Debug_Runtime' as const,
        input: 'Resolve runtime issues',
        dependencies: ['Debug_Syntax' as const]
      },
      {
        agentRole: 'Test_Unit_Pure' as const,
        input: 'Verify fixes with unit tests',
        dependencies: ['Debug_Runtime' as const]
      }
    ]
  };

  const result = await orchestrator.executeWorkflow(workflowWithRetry);
  console.log('Resilient workflow result:', result);
}

// Main demo function
export async function runAllExamples() {
  console.log('=== Agent System Examples ===\n');

  try {
    await example1_ListAgents();
    console.log('\n' + '='.repeat(60) + '\n');

    await example3_RunSingleAgent();
    console.log('\n' + '='.repeat(60) + '\n');

    await example7_QuickFix();
    console.log('\n' + '='.repeat(60) + '\n');

    await example8_ViewStats();
    console.log('\n' + '='.repeat(60) + '\n');

    console.log('All examples completed successfully!');
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Export all examples
export const examples = {
  listAgents: example1_ListAgents,
  showAgent: example2_ShowAgent,
  runSingleAgent: example3_RunSingleAgent,
  runSquad: example4_RunSquad,
  runWorkflow: example5_RunWorkflow,
  customWorkflow: example6_CustomWorkflow,
  quickFix: example7_QuickFix,
  viewStats: example8_ViewStats,
  squadInfo: example9_SquadInfo,
  parallelExecution: example10_ParallelExecution,
  deployment: example11_Deployment,
  fullCycle: example12_FullCycle,
  errorHandling: example13_ErrorHandling,
  runAll: runAllExamples
};
