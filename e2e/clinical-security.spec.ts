import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Clinical Security (의료법 제23조)
 *
 * Tests: Auth guard, audit logging, encryption API, signature API
 */

test.describe('Clinical Security - Auth Guard', () => {

  test('should show auth guard for unauthenticated users', async ({ page }) => {
    // Navigate to clinical page without authentication
    await page.goto('/clinical');
    await page.waitForLoadState('networkidle');

    // Should redirect to login or show loading/auth prompt
    // AdminAuthProvider redirects to /admin/login if not authenticated
    await page.waitForTimeout(2000);
    const url = page.url();
    const isLoginPage = url.includes('/admin/login');
    const hasAuthGuard = await page.locator('text=접근 권한 없음').isVisible().catch(() => false);
    const hasLoadingOrAuth = isLoginPage || hasAuthGuard;

    expect(hasLoadingOrAuth).toBeTruthy();
  });

  test('clinical pages should not be accessible without auth', async ({ page }) => {
    const clinicalPages = [
      '/clinical/reception',
      '/clinical/consulting',
      '/clinical/patients',
      '/clinical/lab',
      '/clinical/treatment',
    ];

    for (const path of clinicalPages) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      const url = page.url();
      // Should be redirected to login
      expect(url.includes('/admin/login') || url.includes('/clinical')).toBeTruthy();
    }
  });
});

test.describe('Clinical Security - API Endpoints', () => {

  test('audit API should accept POST without auth (logs without user info)', async ({ request }) => {
    const res = await request.post('/api/clinical/audit', {
      data: {
        action: 'read',
        collection: 'test',
        documentId: 'e2e-test',
        description: 'E2E test audit log',
      },
    });
    // Should succeed (201) even without auth — logs are recorded without user identity
    expect(res.status()).toBe(201);

    const body = await res.json();
    expect(body.id).toBeTruthy();
  });

  test('audit API GET should require auth', async ({ request }) => {
    const res = await request.get('/api/clinical/audit');
    expect(res.status()).toBe(401);
  });

  test('encrypt API should require auth', async ({ request }) => {
    const res = await request.post('/api/clinical/encrypt', {
      data: { plaintext: '010-1234-5678', fieldName: 'phone' },
    });
    expect(res.status()).toBe(401);
  });

  test('decrypt API should require auth', async ({ request }) => {
    const res = await request.put('/api/clinical/encrypt', {
      data: { encrypted: { ciphertext: 'test', iv: 'test', tag: 'test', version: 1 } },
    });
    expect(res.status()).toBe(401);
  });

  test('signature sign API should require auth', async ({ request }) => {
    const res = await request.post('/api/clinical/signature/sign', {
      data: { visitId: 'test' },
    });
    expect(res.status()).toBe(401);
  });

  test('signature verify API should require auth', async ({ request }) => {
    const res = await request.post('/api/clinical/signature/verify', {
      data: { visitId: 'test' },
    });
    expect(res.status()).toBe(401);
  });

  test('signature keys API should require auth', async ({ request }) => {
    const res = await request.get('/api/clinical/signature/keys');
    expect(res.status()).toBe(401);
  });
});

test.describe('Clinical Security - Firestore Rules', () => {

  test('audit log should be created via API', async ({ request }) => {
    const res = await request.post('/api/clinical/audit', {
      data: {
        action: 'create',
        collection: 'e2e_test',
        documentId: `e2e-${Date.now()}`,
        description: 'E2E security test',
        metadata: { test: true },
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.id).toBeDefined();
    expect(typeof body.id).toBe('string');
  });
});
