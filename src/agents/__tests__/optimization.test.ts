/**
 * @jest-environment node
 *
 * Tests for the Optimization Squad agent definitions.
 */

import {
  Opt_Architect,
  Opt_Performance,
  Opt_Cleaner,
  Opt_Security,
  optimizationSquad,
} from '../optimization';
import { Agent } from '../types';

const REQUIRED_PROPERTIES = [
  'id',
  'role',
  'squad',
  'name',
  'nickname',
  'purpose',
  'description',
  'systemPrompt',
  'capabilities',
  'tools',
  'active',
  'createdAt',
];

function validateOptAgent(agent: Agent) {
  describe(`${agent.role}`, () => {
    it('should have all required properties', () => {
      REQUIRED_PROPERTIES.forEach(prop => {
        expect(agent).toHaveProperty(prop);
      });
    });

    it('should belong to the optimization squad', () => {
      expect(agent.squad).toBe('optimization');
    });

    it('should have a valid non-empty ID', () => {
      expect(typeof agent.id).toBe('string');
      expect(agent.id.length).toBeGreaterThan(0);
      expect(agent.id).toMatch(/^opt-/);
    });

    it('should have a Korean name', () => {
      expect(agent.name).toMatch(/[가-힣]/);
    });

    it('should have an English nickname', () => {
      expect(agent.nickname.length).toBeGreaterThan(0);
      expect(agent.nickname).toMatch(/^[A-Za-z0-9\s&/()]+$/);
    });

    it('should have a Korean purpose', () => {
      expect(agent.purpose).toMatch(/[가-힣]/);
    });

    it('should have a substantial system prompt mentioning its role', () => {
      expect(agent.systemPrompt.length).toBeGreaterThan(100);
      expect(agent.systemPrompt).toContain(agent.role);
    });

    it('should have at least 3 capabilities', () => {
      expect(agent.capabilities.length).toBeGreaterThanOrEqual(3);
      agent.capabilities.forEach(cap => {
        expect(typeof cap).toBe('string');
        expect(cap.length).toBeGreaterThan(0);
      });
    });

    it('should have at least 1 tool', () => {
      expect(agent.tools.length).toBeGreaterThanOrEqual(1);
      agent.tools.forEach(tool => {
        expect(typeof tool).toBe('string');
        expect(tool.length).toBeGreaterThan(0);
      });
    });

    it('should be active', () => {
      expect(agent.active).toBe(true);
    });

    it('should have a valid createdAt date', () => {
      expect(agent.createdAt).toBeInstanceOf(Date);
      expect(agent.createdAt.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });
}

describe('Optimization Squad', () => {
  it('should have exactly 4 agents', () => {
    expect(optimizationSquad).toHaveLength(4);
  });

  it('should contain the correct agent roles', () => {
    const roles = optimizationSquad.map(a => a.role);
    expect(roles).toEqual([
      'Opt_Architect',
      'Opt_Performance',
      'Opt_Cleaner',
      'Opt_Security',
    ]);
  });

  it('should have unique IDs across all agents', () => {
    const ids = optimizationSquad.map(a => a.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should have unique roles across all agents', () => {
    const roles = optimizationSquad.map(a => a.role);
    const uniqueRoles = new Set(roles);
    expect(uniqueRoles.size).toBe(roles.length);
  });

  it('all agents should belong to optimization squad', () => {
    optimizationSquad.forEach(agent => {
      expect(agent.squad).toBe('optimization');
    });
  });

  // Validate each individual agent
  validateOptAgent(Opt_Architect);
  validateOptAgent(Opt_Performance);
  validateOptAgent(Opt_Cleaner);
  validateOptAgent(Opt_Security);

  describe('Opt_Architect specifics', () => {
    it('should focus on code structure and maintainability', () => {
      const prompt = Opt_Architect.systemPrompt.toLowerCase();
      const hasFocus =
        prompt.includes('구조') ||
        prompt.includes('structure') ||
        prompt.includes('모듈') ||
        prompt.includes('srp') ||
        prompt.includes('dry');
      expect(hasFocus).toBe(true);
    });

    it('should have refactoring capability', () => {
      const hasCapability = Opt_Architect.capabilities.some(
        c => c.includes('리팩토링') || c.includes('refactor')
      );
      expect(hasCapability).toBe(true);
    });
  });

  describe('Opt_Performance specifics', () => {
    it('should focus on performance optimization', () => {
      const prompt = Opt_Performance.systemPrompt.toLowerCase();
      const hasFocus =
        prompt.includes('성능') ||
        prompt.includes('performance') ||
        prompt.includes('최적화') ||
        prompt.includes('big o');
      expect(hasFocus).toBe(true);
    });

    it('should have algorithm optimization capability', () => {
      const hasCapability = Opt_Performance.capabilities.some(
        c => c.includes('알고리즘') || c.includes('algorithm')
      );
      expect(hasCapability).toBe(true);
    });
  });

  describe('Opt_Cleaner specifics', () => {
    it('should focus on code cleanup', () => {
      const prompt = Opt_Cleaner.systemPrompt.toLowerCase();
      const hasFocus =
        prompt.includes('청소') ||
        prompt.includes('dead code') ||
        prompt.includes('제거') ||
        prompt.includes('다이어트');
      expect(hasFocus).toBe(true);
    });

    it('should have dead code removal capability', () => {
      const hasCapability = Opt_Cleaner.capabilities.some(
        c => c.includes('죽은 코드') || c.includes('dead code')
      );
      expect(hasCapability).toBe(true);
    });
  });

  describe('Opt_Security specifics', () => {
    it('should focus on security', () => {
      const prompt = Opt_Security.systemPrompt.toLowerCase();
      const hasFocus =
        prompt.includes('보안') ||
        prompt.includes('security') ||
        prompt.includes('xss') ||
        prompt.includes('sql injection');
      expect(hasFocus).toBe(true);
    });

    it('should have security vulnerability scanning capability', () => {
      const hasCapability = Opt_Security.capabilities.some(
        c => c.includes('보안') || c.includes('security')
      );
      expect(hasCapability).toBe(true);
    });
  });
});
