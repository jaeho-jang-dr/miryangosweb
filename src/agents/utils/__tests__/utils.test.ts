
import {
    createAgentPrompt,
    suggestAgent,
    createSquadWorkflow,
    createAgentTask
} from '../index';
import { AgentRole } from '../../types';

describe('Agent Utilities', () => {
    describe('createAgentPrompt', () => {
        it('should generate a prompt for a valid agent', () => {
            const role: AgentRole = 'PM_Requirements';
            const input = 'Test input';
            const prompt = createAgentPrompt(role, input);

            expect(prompt).toContain('PM_Requirements');
            expect(prompt).toContain(input);
            expect(prompt).toContain('사용자 요청');
        });

        it('should throw error for invalid agent role', () => {
            // @ts-ignore
            expect(() => createAgentPrompt('Invalid_Role', 'input')).toThrow();
        });
    });

    describe('suggestAgent', () => {
        it('should suggest PM_Requirements for requirements related input', () => {
            const suggestions = suggestAgent('요구사항을 정리하고 싶어');
            expect(suggestions).toContain('PM_Requirements');
        });

        it('should suggest FE_Structure for html related input', () => {
            const suggestions = suggestAgent('HTML 구조를 잡고 싶어');
            expect(suggestions).toContain('FE_Structure');
        });

        it('should return empty array for unrelated input', () => {
            const suggestions = suggestAgent('zzzzzzzz');
            expect(suggestions).toEqual([]);
        });
    });

    describe('createSquadWorkflow', () => {
        it('should generate workflow prompt for valid squad', () => {
            const prompt = createSquadWorkflow('planning', 'New feature');
            expect(prompt).toContain('PLANNING Squad 워크플로우');
            expect(prompt).toContain('PM_Requirements');
            expect(prompt).toContain('New feature');
        });

        it('should throw error for invalid squad', () => {
            // @ts-ignore
            expect(() => createSquadWorkflow('invalid_squad', 'input')).toThrow();
        });
    });

    describe('createAgentTask', () => {
        it('should create a task object correctly', () => {
            const role: AgentRole = 'Test_Unit_Pure';
            const input = 'Write tests';
            const task = createAgentTask(role, input, { priority: 'high' });

            expect(task.agentRole).toBe(role);
            expect(task.input).toBe(input);
            expect(task.status).toBe('pending');
            expect(task.id).toContain('task-');
            expect(task.metadata).toEqual({ priority: 'high' });
        });
    });
});
