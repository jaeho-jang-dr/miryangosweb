import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // 린트 대상에서 제외할 경로
  globalIgnores([
    // Next.js 빌드 아티팩트
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // 외부 도구
    "antigravity-claude-proxy/**",
    // 서브앱 빌드 아티팩트 및 의존성
    "apps/**/.next/**",
    "apps/**/node_modules/**",
    // 커버리지 리포트
    "coverage/**",
    // 배포/운영 스크립트 (TypeScript 미사용)
    "scripts/**",
    // 레거시 코드
    "legacy/**",
  ]),
  {
    rules: {
      // 미사용 변수: _로 시작하는 변수는 허용 (의도적 미사용 명시 패턴)
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // any 타입: 외부 라이브러리 연동 시 불가피한 경우 경고로 완화
      "@typescript-eslint/no-explicit-any": "warn",
      // console 사용: error/warn은 허용, log는 경고
      "no-console": ["warn", { allow: ["error", "warn", "info"] }],
      // React import: Next.js + React 17+는 자동 JSX transform 사용
      "react/react-in-jsx-scope": "off",
      // 빈 함수: 테스트 목 등에서 허용
      "@typescript-eslint/no-empty-function": "warn",
    },
  },
]);

export default eslintConfig;
