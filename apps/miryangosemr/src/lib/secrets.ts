/**
 * 시크릿 접근 유틸리티
 * CI/CD 빌드 시점에 환경변수로 주입된 시크릿을 안전하게 로드합니다.
 */

/** 필수 서버 사이드 시크릿 목록 */
const REQUIRED_SECRETS = [
  'FIREBASE_SERVICE_ACCOUNT_KEY',
  'ENCRYPTION_MASTER_KEY',
] as const;

/** 선택적 시크릿 (없어도 경고만) */
const OPTIONAL_SECRETS = [
  'HIRA_API_KEY',
  'GEMINI_API_KEY',
  'GPTOSS_API_KEY',
  'GOOGLE_SPEECH_API_KEY',
] as const;

type RequiredSecret = typeof REQUIRED_SECRETS[number];
type OptionalSecret = typeof OPTIONAL_SECRETS[number];
type SecretKey = RequiredSecret | OptionalSecret;

/**
 * 환경변수에서 시크릿을 로드합니다.
 * @throws Error - 필수 시크릿이 없을 경우
 */
export function getSecret(key: SecretKey): string {
  const value = process.env[key];
  if (!value) {
    const isRequired = (REQUIRED_SECRETS as readonly string[]).includes(key);
    if (isRequired) {
      throw new Error(
        `[Security] Missing required secret: ${key}. ` +
        `CI/CD 파이프라인에서 환경변수로 주입되어야 합니다.`
      );
    }
    // 선택적 시크릿은 빈 문자열 반환
    return '';
  }
  return value;
}

/**
 * 앱 시작 시 필수 시크릿 존재 여부를 검증합니다.
 * 서버 시작 시 한 번 호출하세요.
 */
export function validateSecrets(): void {
  const missing: string[] = [];

  for (const key of REQUIRED_SECRETS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  for (const key of OPTIONAL_SECRETS) {
    if (!process.env[key]) {
      console.warn(`[Security] Optional secret not set: ${key}`);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `[Security] Missing required secrets: ${missing.join(', ')}. ` +
      `배포 전 CI/CD 환경변수를 확인하세요.`
    );
  }

  console.log('[Security] All required secrets validated successfully.');
}
