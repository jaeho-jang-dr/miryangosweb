/**
 * Agent System Quick Reference
 *
 * 모든 에이전트의 팀명, 별명, 목적을 한눈에 확인
 */

import { allAgents, squadConfigs } from './index';

console.log('='.repeat(80));
console.log('Claude Code Agent System - 전체 에이전트 목록');
console.log('='.repeat(80));
console.log();

squadConfigs.forEach((squad) => {
  console.log(`\n📁 ${squad.name} (${squad.type})`);
  console.log(`   ${squad.description}`);
  console.log('-'.repeat(80));

  const squadAgents = allAgents.filter(agent => agent.squad === squad.type);

  squadAgents.forEach((agent, index) => {
    console.log(`\n${index + 1}. ${agent.name} (${agent.role})`);
    console.log(`   별명: ${agent.nickname}`);
    console.log(`   목적: ${agent.purpose}`);
    console.log(`   도구: ${agent.tools.join(', ')}`);
  });

  console.log();
});

console.log('='.repeat(80));
console.log(`총 ${allAgents.length}명의 에이전트가 ${squadConfigs.length}개 팀으로 구성되어 있습니다.`);
console.log('='.repeat(80));

// 예제: 특정 에이전트 정보 출력
console.log('\n\n🔍 예제: BE_API_Builder 에이전트 상세 정보\n');
const apiBuilder = allAgents.find(a => a.role === 'BE_API_Builder');
if (apiBuilder) {
  console.log(`이름: ${apiBuilder.name}`);
  console.log(`별명: ${apiBuilder.nickname}`);
  console.log(`목적: ${apiBuilder.purpose}`);
  console.log(`설명: ${apiBuilder.description}`);
  console.log(`\n역량:`);
  apiBuilder.capabilities.forEach(cap => console.log(`  - ${cap}`));
}
