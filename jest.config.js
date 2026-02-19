const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '**/__tests__/**/*.(test|spec).[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/_*.{js,jsx,ts,tsx}',
    '!src/app/**/layout.tsx',
    '!src/app/**/error.tsx',
    '!src/app/**/loading.tsx',
    '!src/app/**/not-found.tsx',
    // Route Handler(API)는 서버 전용이므로 단위 테스트 커버리지 제외
    '!src/app/api/**',
    // 타입 정의 전용 파일 제외
    '!src/types/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 80,
      statements: 80,
    },
  },
  coverageReporters: ['text', 'lcov', 'html'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/antigravity-claude-proxy/',
    '<rootDir>/e2e/',
    '<rootDir>/apps/',
    '<rootDir>/scripts/',
  ],
  // react-markdown 및 관련 remark/rehype/unified 계열도 ESM 전용
  // next.config.ts transpilePackages 설정과 일치
  transformIgnorePatterns: [
    'node_modules/(?!(three|@react-three|@google/generative-ai|react-markdown|remark|rehype|unified|bail|is-plain-obj|trough|vfile|micromark|mdast|hast|unist|character-entities|decode-named-character-reference|ccount|comma-separated-tokens|property-information|space-separated-tokens|web-namespaces)/)',
  ],
  moduleDirectories: ['node_modules', '<rootDir>'],
  testTimeout: 15000,
  // CI 환경에서는 maxWorkers 고정, 로컬에서는 CPU 50% 활용
  maxWorkers: process.env.CI ? 2 : '50%',
};

module.exports = createJestConfig(customJestConfig);
