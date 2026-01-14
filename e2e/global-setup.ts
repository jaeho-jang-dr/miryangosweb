/**
 * Playwright Global Setup
 * E2E 테스트 전역 설정 - Firebase mock 주입
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;

  // Start browser for setup
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to base URL
    await page.goto(baseURL || 'http://localhost:3000');

    // Inject Firebase mock
    await page.addInitScript(() => {
      // Mock environment variables
      // @ts-ignore
      window.process = window.process || {};
      // @ts-ignore
      window.process.env = {
        NEXT_PUBLIC_FIREBASE_API_KEY: 'mock-api-key',
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'mock-project.firebaseapp.com',
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'mock-project',
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'mock-project.appspot.com',
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123456789',
        NEXT_PUBLIC_FIREBASE_APP_ID: '1:123456789:web:mockmockmock',
      };

      // Mark Firebase as mocked
      // @ts-ignore
      window.__FIREBASE_MOCKED__ = true;
    });

    console.log('✅ Firebase mock injected for E2E tests');
  } catch (error) {
    console.error('❌ Failed to inject Firebase mock:', error);
  } finally {
    await context.close();
    await browser.close();
  }
}

export default globalSetup;
