import {
    getAgentByRole,
    getAgentsBySquad,
    getAgentStats,
    allAgents,
    squadConfigs
} from '../index';
import { AgentRole } from '../types';

describe('Agent Registry', () => {
    describe('getAgentByRole', () => {
        it('should return the correct agent for a valid role', () => {
            const role: AgentRole = 'PM_Requirements';
            const agent = getAgentByRole(role);
            expect(agent).toBeDefined();
            expect(agent?.role).toBe(role);
        });

        it('should return undefined for an invalid role', () => {
            // @ts-ignore - Testing invalid input
            const agent = getAgentByRole('Invalid_Role');
            expect(agent).toBeUndefined();
        });
    });

    describe('getAgentsBySquad', () => {
        it('should return all agents for the planning squad', () => {
            const agents = getAgentsBySquad('planning');
            expect(agents.length).toBeGreaterThan(0);
            agents.forEach(agent => {
                expect(agent.squad).toBe('planning');
            });
        });

        it('should return empty array for invalid squad', () => {
            // @ts-ignore - Testing invalid input
            const agents = getAgentsBySquad('invalid_squad');
            expect(agents).toEqual([]);
        });
    });

    describe('getAgentStats', () => {
        it('should return correct statistics', () => {
            const stats = getAgentStats();
            expect(stats.total).toBe(allAgents.length);
            expect(stats.bySquad.length).toBe(squadConfigs.length);

            const planningStat = stats.bySquad.find(s => s.squad === '기획 및 아키텍처 팀');
            expect(planningStat).toBeDefined();
        });
    });

    describe('Integrity Checks', () => {
        it('all agents should have unique IDs', () => {
            const ids = allAgents.map(a => a.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length);
        });

        it('all agents should be assigned to a valid squad', () => {
            const validSquadTypes = squadConfigs.map(c => c.type);
            allAgents.forEach(agent => {
                expect(validSquadTypes).toContain(agent.squad);
            });
        });
    });
});
