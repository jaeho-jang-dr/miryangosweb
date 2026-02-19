/**
 * @jest-environment node
 *
 * Tests for the Conductor agent definition.
 */

import { Conductor } from '../conductor';

describe('Conductor Agent', () => {
  it('should be defined and exported', () => {
    expect(Conductor).toBeDefined();
  });

  describe('identity properties', () => {
    it('should have the correct id', () => {
      expect(Conductor.id).toBe('conductor-001');
    });

    it('should have the Conductor role', () => {
      expect(Conductor.role).toBe('Conductor');
    });

    it('should belong to the orchestrator squad', () => {
      expect(Conductor.squad).toBe('orchestrator');
    });

    it('should have a Korean name', () => {
      expect(Conductor.name).toMatch(/[가-힣]/);
      expect(Conductor.name).toBe('프로젝트 지휘자');
    });

    it('should have an English nickname', () => {
      expect(Conductor.nickname).toBe('The Conductor');
    });
  });

  describe('purpose and description', () => {
    it('should have a non-empty purpose in Korean', () => {
      expect(Conductor.purpose.length).toBeGreaterThan(0);
      expect(Conductor.purpose).toMatch(/[가-힣]/);
    });

    it('should have a non-empty description', () => {
      expect(Conductor.description.length).toBeGreaterThan(0);
    });

    it('should mention product.md in the description', () => {
      expect(Conductor.description).toContain('product.md');
    });
  });

  describe('systemPrompt', () => {
    it('should have a substantial system prompt', () => {
      expect(Conductor.systemPrompt.length).toBeGreaterThan(100);
    });

    it('should reference product.md as the source of truth', () => {
      expect(Conductor.systemPrompt).toContain('product.md');
    });

    it('should reference plan.md for workflow management', () => {
      expect(Conductor.systemPrompt).toContain('plan.md');
    });

    it('should mention Squad delegation', () => {
      expect(Conductor.systemPrompt).toContain('Squad');
    });

    it('should mention the Conductor role in the system prompt', () => {
      expect(Conductor.systemPrompt).toContain('컨덕터');
    });
  });

  describe('capabilities', () => {
    it('should have at least 3 capabilities', () => {
      expect(Conductor.capabilities.length).toBeGreaterThanOrEqual(3);
    });

    it('should include context management capability', () => {
      const hasContextCapability = Conductor.capabilities.some(
        cap => cap.includes('컨텍스트') || cap.includes('context')
      );
      expect(hasContextCapability).toBe(true);
    });

    it('should include workflow coordination capability', () => {
      const hasWorkflowCapability = Conductor.capabilities.some(
        cap => cap.includes('워크플로우') || cap.includes('workflow')
      );
      expect(hasWorkflowCapability).toBe(true);
    });

    it('should have all non-empty capability strings', () => {
      Conductor.capabilities.forEach(cap => {
        expect(typeof cap).toBe('string');
        expect(cap.length).toBeGreaterThan(0);
      });
    });
  });

  describe('tools', () => {
    it('should have at least 1 tool', () => {
      expect(Conductor.tools.length).toBeGreaterThanOrEqual(1);
    });

    it('should have all non-empty tool strings', () => {
      Conductor.tools.forEach(tool => {
        expect(typeof tool).toBe('string');
        expect(tool.length).toBeGreaterThan(0);
      });
    });
  });

  describe('active status and dates', () => {
    it('should be active', () => {
      expect(Conductor.active).toBe(true);
    });

    it('should have a valid createdAt date', () => {
      expect(Conductor.createdAt).toBeInstanceOf(Date);
      expect(Conductor.createdAt.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });
});
