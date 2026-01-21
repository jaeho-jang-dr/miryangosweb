/**
 * Comprehensive Agent Validation Tests
 * 모든 에이전트의 속성을 전수 조사
 */

import { Agent, AgentRole, SquadType } from '../types';
import { planningSquad } from '../planning';
import { frontendSquad } from '../frontend';
import { backendSquad } from '../backend';
import { testSquad } from '../test';
import { debugSquad } from '../debug';
import { opsSquad } from '../ops';

// 필수 속성 목록
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

// 타입 검증 헬퍼
const typeCheckers = {
  string: (value: any) => typeof value === 'string' && value.length > 0,
  array: (value: any) => Array.isArray(value) && value.length > 0,
  boolean: (value: any) => typeof value === 'boolean',
  date: (value: any) => value instanceof Date,
};

// 에이전트 검증 함수
function validateAgent(agent: Agent, expectedSquad: SquadType) {
  return {
    hasAllProperties: REQUIRED_PROPERTIES.every(prop => prop in agent),
    validTypes: {
      id: typeCheckers.string(agent.id),
      role: typeCheckers.string(agent.role),
      squad: agent.squad === expectedSquad,
      name: typeCheckers.string(agent.name),
      nickname: typeCheckers.string(agent.nickname),
      purpose: typeCheckers.string(agent.purpose),
      description: typeCheckers.string(agent.description),
      systemPrompt: typeCheckers.string(agent.systemPrompt),
      capabilities: typeCheckers.array(agent.capabilities),
      tools: typeCheckers.array(agent.tools),
      active: typeCheckers.boolean(agent.active),
      createdAt: typeCheckers.date(agent.createdAt),
    },
    contentValidation: {
      idFormat: /^[a-z]+-[a-z]+-\d{3}$/.test(agent.id),
      systemPromptLength: agent.systemPrompt.length >= 100,
      capabilitiesNotEmpty: agent.capabilities.every(c => c.length > 0),
      toolsNotEmpty: agent.tools.every(t => t.length > 0),
    },
  };
}

describe('Agent System - Comprehensive Validation', () => {
  describe('Planning Squad (3 agents)', () => {
    it('should have exactly 3 agents', () => {
      expect(planningSquad).toHaveLength(3);
    });

    describe('PM_Requirements', () => {
      const agent = planningSquad[0];

      it('should have all required properties', () => {
        REQUIRED_PROPERTIES.forEach(prop => {
          expect(agent).toHaveProperty(prop);
        });
      });

      it('should have valid property types', () => {
        expect(typeof agent.id).toBe('string');
        expect(typeof agent.role).toBe('string');
        expect(agent.squad).toBe('planning');
        expect(typeof agent.name).toBe('string');
        expect(typeof agent.nickname).toBe('string');
        expect(typeof agent.purpose).toBe('string');
        expect(typeof agent.description).toBe('string');
        expect(typeof agent.systemPrompt).toBe('string');
        expect(Array.isArray(agent.capabilities)).toBe(true);
        expect(Array.isArray(agent.tools)).toBe(true);
        expect(typeof agent.active).toBe('boolean');
        expect(agent.createdAt).toBeInstanceOf(Date);
      });

      it('should have non-empty string values', () => {
        expect(agent.id.length).toBeGreaterThan(0);
        expect(agent.role).toBe('PM_Requirements');
        expect(agent.name.length).toBeGreaterThan(0);
        expect(agent.nickname.length).toBeGreaterThan(0);
        expect(agent.purpose.length).toBeGreaterThan(0);
        expect(agent.description.length).toBeGreaterThan(0);
        expect(agent.systemPrompt.length).toBeGreaterThan(100);
      });

      it('should have non-empty arrays', () => {
        expect(agent.capabilities.length).toBeGreaterThan(0);
        expect(agent.tools.length).toBeGreaterThan(0);
      });

      it('should have valid ID format', () => {
        expect(agent.id).toMatch(/^[a-z]+-[a-z]+-\d{3}$/);
      });
    });

    describe('UI_UX_Designer', () => {
      const agent = planningSquad[1];

      it('should have all required properties', () => {
        REQUIRED_PROPERTIES.forEach(prop => {
          expect(agent).toHaveProperty(prop);
        });
      });

      it('should have correct squad', () => {
        expect(agent.squad).toBe('planning');
        expect(agent.role).toBe('UI_UX_Designer');
      });

      it('should have valid content', () => {
        expect(agent.nickname.length).toBeGreaterThan(0);
        expect(agent.purpose.length).toBeGreaterThan(0);
        expect(agent.systemPrompt.length).toBeGreaterThan(100);
      });
    });

    describe('System_Architect', () => {
      const agent = planningSquad[2];

      it('should have all required properties', () => {
        REQUIRED_PROPERTIES.forEach(prop => {
          expect(agent).toHaveProperty(prop);
        });
      });

      it('should have correct squad', () => {
        expect(agent.squad).toBe('planning');
        expect(agent.role).toBe('System_Architect');
      });

      it('should have valid content', () => {
        expect(agent.nickname.length).toBeGreaterThan(0);
        expect(agent.purpose.length).toBeGreaterThan(0);
        expect(agent.systemPrompt.length).toBeGreaterThan(100);
      });
    });
  });

  describe('Frontend Squad (3 agents)', () => {
    it('should have exactly 3 agents', () => {
      expect(frontendSquad).toHaveLength(3);
    });

    const expectedRoles = ['FE_Structure', 'FE_Logic', 'FE_Styler'];

    frontendSquad.forEach((agent, index) => {
      describe(expectedRoles[index], () => {
        it('should have all required properties', () => {
          REQUIRED_PROPERTIES.forEach(prop => {
            expect(agent).toHaveProperty(prop);
          });
        });

        it('should have correct squad and role', () => {
          expect(agent.squad).toBe('frontend');
          expect(agent.role).toBe(expectedRoles[index]);
        });

        it('should have valid string content', () => {
          expect(agent.id.length).toBeGreaterThan(0);
          expect(agent.name.length).toBeGreaterThan(0);
          expect(agent.nickname.length).toBeGreaterThan(0);
          expect(agent.purpose.length).toBeGreaterThan(0);
          expect(agent.description.length).toBeGreaterThan(0);
          expect(agent.systemPrompt.length).toBeGreaterThan(100);
        });

        it('should have valid arrays', () => {
          expect(agent.capabilities.length).toBeGreaterThan(0);
          expect(agent.tools.length).toBeGreaterThan(0);
          expect(agent.capabilities.every(c => c.length > 0)).toBe(true);
          expect(agent.tools.every(t => t.length > 0)).toBe(true);
        });

        it('should be active', () => {
          expect(agent.active).toBe(true);
        });

        it('should have valid createdAt date', () => {
          expect(agent.createdAt).toBeInstanceOf(Date);
          expect(agent.createdAt.getTime()).toBeLessThanOrEqual(Date.now());
        });
      });
    });
  });

  describe('Backend Squad (2 agents)', () => {
    it('should have exactly 2 agents', () => {
      expect(backendSquad).toHaveLength(2);
    });

    const expectedRoles = ['BE_API_Builder', 'BE_Database'];

    backendSquad.forEach((agent, index) => {
      describe(expectedRoles[index], () => {
        it('should have all required properties', () => {
          REQUIRED_PROPERTIES.forEach(prop => {
            expect(agent).toHaveProperty(prop);
          });
        });

        it('should have correct squad and role', () => {
          expect(agent.squad).toBe('backend');
          expect(agent.role).toBe(expectedRoles[index]);
        });

        it('should have valid content', () => {
          const validation = validateAgent(agent, 'backend');
          expect(validation.hasAllProperties).toBe(true);
          expect(validation.contentValidation.systemPromptLength).toBe(true);
          expect(validation.contentValidation.capabilitiesNotEmpty).toBe(true);
          expect(validation.contentValidation.toolsNotEmpty).toBe(true);
        });
      });
    });
  });

  describe('Test Squad (4 agents)', () => {
    it('should have exactly 4 agents', () => {
      expect(testSquad).toHaveLength(4);
    });

    const expectedRoles = [
      'Test_Unit_Pure',
      'Test_Integration_Mock',
      'Test_E2E_Flow',
      'Test_Edge_Crusher',
    ];

    testSquad.forEach((agent, index) => {
      describe(expectedRoles[index], () => {
        it('should have all required properties', () => {
          REQUIRED_PROPERTIES.forEach(prop => {
            expect(agent).toHaveProperty(prop);
          });
        });

        it('should have correct squad and role', () => {
          expect(agent.squad).toBe('test');
          expect(agent.role).toBe(expectedRoles[index]);
        });

        it('should have valid content', () => {
          const validation = validateAgent(agent, 'test');
          expect(validation.hasAllProperties).toBe(true);
          Object.values(validation.validTypes).forEach(isValid => {
            expect(isValid).toBe(true);
          });
        });
      });
    });
  });

  describe('Debug Squad (4 agents)', () => {
    it('should have exactly 4 agents', () => {
      expect(debugSquad).toHaveLength(4);
    });

    const expectedRoles = [
      'Debug_Syntax',
      'Debug_Runtime',
      'Debug_Logic',
      'Debug_Dependency',
    ];

    debugSquad.forEach((agent, index) => {
      describe(expectedRoles[index], () => {
        it('should have all required properties', () => {
          REQUIRED_PROPERTIES.forEach(prop => {
            expect(agent).toHaveProperty(prop);
          });
        });

        it('should have correct squad and role', () => {
          expect(agent.squad).toBe('debug');
          expect(agent.role).toBe(expectedRoles[index]);
        });

        it('should have valid content', () => {
          const validation = validateAgent(agent, 'debug');
          expect(validation.hasAllProperties).toBe(true);
          expect(validation.contentValidation.systemPromptLength).toBe(true);
          expect(validation.contentValidation.capabilitiesNotEmpty).toBe(true);
          expect(validation.contentValidation.toolsNotEmpty).toBe(true);
        });
      });
    });
  });

  describe('Ops Squad (2 agents)', () => {
    it('should have exactly 2 agents', () => {
      expect(opsSquad).toHaveLength(2);
    });

    const expectedRoles = ['DevOps_Pipeline', 'Docs_Writer'];

    opsSquad.forEach((agent, index) => {
      describe(expectedRoles[index], () => {
        it('should have all required properties', () => {
          REQUIRED_PROPERTIES.forEach(prop => {
            expect(agent).toHaveProperty(prop);
          });
        });

        it('should have correct squad and role', () => {
          expect(agent.squad).toBe('ops');
          expect(agent.role).toBe(expectedRoles[index]);
        });

        it('should have valid content', () => {
          const validation = validateAgent(agent, 'ops');
          expect(validation.hasAllProperties).toBe(true);
          Object.values(validation.validTypes).forEach(isValid => {
            expect(isValid).toBe(true);
          });
        });
      });
    });
  });

  describe('Cross-Squad Validation', () => {
    const allSquads = [
      { name: 'planning', agents: planningSquad, expectedCount: 3 },
      { name: 'frontend', agents: frontendSquad, expectedCount: 3 },
      { name: 'backend', agents: backendSquad, expectedCount: 2 },
      { name: 'test', agents: testSquad, expectedCount: 4 },
      { name: 'debug', agents: debugSquad, expectedCount: 4 },
      { name: 'ops', agents: opsSquad, expectedCount: 2 },
    ];

    it('should have total of 18 agents', () => {
      const totalAgents = allSquads.reduce((sum, squad) => sum + squad.agents.length, 0);
      expect(totalAgents).toBe(18);
    });

    it('should have unique agent IDs', () => {
      const allIds = allSquads.flatMap(squad => squad.agents.map(a => a.id));
      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(allIds.length);
    });

    it('should have unique agent roles', () => {
      const allRoles = allSquads.flatMap(squad => squad.agents.map(a => a.role));
      const uniqueRoles = new Set(allRoles);
      expect(uniqueRoles.size).toBe(allRoles.length);
    });

    it('all agents should be active', () => {
      allSquads.forEach(squad => {
        squad.agents.forEach(agent => {
          expect(agent.active).toBe(true);
        });
      });
    });

    it('all agents should have valid createdAt dates', () => {
      allSquads.forEach(squad => {
        squad.agents.forEach(agent => {
          expect(agent.createdAt).toBeInstanceOf(Date);
          expect(agent.createdAt.getTime()).toBeLessThanOrEqual(Date.now());
        });
      });
    });

    it('all agents should have proper ID format', () => {
      // ID format: lowercase letters, numbers, hyphens, ending with -NNN
      const idRegex = /^[a-z0-9]+(-[a-z0-9]+)+-\d{3}$/;
      allSquads.forEach(squad => {
        squad.agents.forEach(agent => {
          expect(agent.id).toMatch(idRegex);
        });
      });
    });

    it('all agents should have substantial system prompts', () => {
      allSquads.forEach(squad => {
        squad.agents.forEach(agent => {
          expect(agent.systemPrompt.length).toBeGreaterThan(100);
          expect(agent.systemPrompt).toContain(agent.role);
        });
      });
    });

    it('all agents should have at least 3 capabilities', () => {
      allSquads.forEach(squad => {
        squad.agents.forEach(agent => {
          expect(agent.capabilities.length).toBeGreaterThanOrEqual(3);
        });
      });
    });

    it('all agents should have at least 1 tool', () => {
      allSquads.forEach(squad => {
        squad.agents.forEach(agent => {
          expect(agent.tools.length).toBeGreaterThanOrEqual(1);
        });
      });
    });

    it('all nicknames should be in English', () => {
      allSquads.forEach(squad => {
        squad.agents.forEach(agent => {
          // English characters, spaces, numbers, &, /, and () are allowed
          expect(agent.nickname).toMatch(/^[A-Za-z0-9\s&/()]+$/);
        });
      });
    });

    it('all purposes should be in Korean', () => {
      allSquads.forEach(squad => {
        squad.agents.forEach(agent => {
          // Should contain Korean characters
          expect(agent.purpose).toMatch(/[가-힣]/);
        });
      });
    });
  });

  describe('Data Consistency Checks', () => {
    it('squad field should match parent squad', () => {
      expect(planningSquad.every(a => a.squad === 'planning')).toBe(true);
      expect(frontendSquad.every(a => a.squad === 'frontend')).toBe(true);
      expect(backendSquad.every(a => a.squad === 'backend')).toBe(true);
      expect(testSquad.every(a => a.squad === 'test')).toBe(true);
      expect(debugSquad.every(a => a.squad === 'debug')).toBe(true);
      expect(opsSquad.every(a => a.squad === 'ops')).toBe(true);
    });

    it('role should be unique within each squad', () => {
      [planningSquad, frontendSquad, backendSquad, testSquad, debugSquad, opsSquad].forEach(
        squad => {
          const roles = squad.map(a => a.role);
          const uniqueRoles = new Set(roles);
          expect(uniqueRoles.size).toBe(roles.length);
        }
      );
    });

    it('all array elements should be non-empty strings', () => {
      [planningSquad, frontendSquad, backendSquad, testSquad, debugSquad, opsSquad]
        .flat()
        .forEach(agent => {
          agent.capabilities.forEach(cap => {
            expect(typeof cap).toBe('string');
            expect(cap.length).toBeGreaterThan(0);
          });
          agent.tools.forEach(tool => {
            expect(typeof tool).toBe('string');
            expect(tool.length).toBeGreaterThan(0);
          });
        });
    });
  });
});
