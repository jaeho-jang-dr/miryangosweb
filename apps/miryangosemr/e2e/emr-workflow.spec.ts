import { test, expect } from '@playwright/test';

/**
 * EMR Core Workflow E2E Tests
 * 핵심 워크플로우: 접수 → 진료 → 처방 → 수납 → 청구
 */

test.describe('EMR Navigation & Auth', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    // Should redirect to login page or show login UI
    // Check URL contains login, OR check for a login-related element
    const currentUrl = page.url();
    const isLoginPage = currentUrl.includes('login');
    const hasEmailInput = await page.locator('input[type="email"], input[type="text"][placeholder*="doctor"], input[placeholder*="이메일"]').count();
    expect(isLoginPage || hasEmailInput > 0).toBeTruthy();
  });

  test('should load the root page', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(500);
  });

  test('should load login page', async ({ page }) => {
    const response = await page.goto('/login');
    expect(response?.status()).toBeLessThan(500);
    await expect(page).toHaveURL(/login/);
  });

  test('login page should have email and password fields', async ({ page }) => {
    await page.goto('/login');
    // Should have at minimum one input (email or text type)
    const emailInput = page.locator('input[type="email"], input[type="text"]').first();
    await expect(emailInput).toBeVisible({ timeout: 5000 });
  });
});

test.describe('EMR Page Accessibility', () => {
  const pages = [
    { path: '/dashboard', name: 'Dashboard' },
    { path: '/reception', name: 'Reception' },
    { path: '/billing', name: 'Billing' },
    { path: '/claims', name: 'Claims' },
    { path: '/prescription', name: 'Prescription' },
    { path: '/patients', name: 'Patients' },
    { path: '/chart', name: 'Chart' },
    { path: '/statistics', name: 'Statistics' },
    { path: '/master', name: 'Master Data' },
    { path: '/lab', name: 'Lab' },
    { path: '/treatment', name: 'Treatment' },
    { path: '/pharmacy', name: 'Pharmacy' },
    { path: '/appointments', name: 'Appointments' },
    { path: '/voice-chart', name: 'Voice Chart' },
  ];

  for (const { path, name } of pages) {
    test(`${name} page (${path}) should not return 500`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBeLessThan(500);
    });
  }
});

test.describe('EMR API Endpoints', () => {
  test('FHIR Patient endpoint should respond', async ({ request }) => {
    const response = await request.get('/api/fhir/Patient');
    // Should return 200 or 401 (if auth required), but not 500
    expect(response.status()).not.toBe(500);
  });

  test('FHIR Organization endpoint should respond', async ({ request }) => {
    const response = await request.get('/api/fhir/Organization');
    expect(response.status()).not.toBe(500);
  });

  test('Drug search endpoint should respond with results', async ({ request }) => {
    const response = await request.get('/api/clinical/drugs/search?q=로키');
    expect(response.status()).not.toBe(500);
    // If 200, should return an array
    if (response.status() === 200) {
      const body = await response.json();
      expect(Array.isArray(body)).toBeTruthy();
    }
  });

  test('Drug search with empty query returns empty array', async ({ request }) => {
    const response = await request.get('/api/clinical/drugs/search');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBeTruthy();
    expect(body.length).toBe(0);
  });

  test('Diagnosis search endpoint should respond', async ({ request }) => {
    const response = await request.get('/api/clinical/diagnosis/search?q=요추');
    expect(response.status()).not.toBe(500);
  });

  test('Billing calculate endpoint should respond to POST', async ({ request }) => {
    const response = await request.post('/api/billing/calculate', {
      data: {
        items: [
          { code: 'AA157', name: '초진진찰료', basePrice: 15000, quantity: 1, insuranceCovered: true }
        ],
        insuranceType: 'nhis'
      }
    });
    expect(response.status()).not.toBe(500);
    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toHaveProperty('totalAmount');
      expect(body).toHaveProperty('copayAmount');
    }
  });

  test('Claims submit should validate missing claimId', async ({ request }) => {
    const response = await request.post('/api/claims/submit', {
      data: {}
    });
    expect(response.status()).toBe(400);
  });
});

test.describe('EMR Security Headers', () => {
  test('should include security headers', async ({ page }) => {
    const response = await page.goto('/');
    const headers = response?.headers();

    expect(headers?.['x-content-type-options']).toBe('nosniff');
    expect(headers?.['x-frame-options']).toBe('DENY');
    expect(headers?.['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers?.['strict-transport-security']).toContain('max-age=');
  });

  test('should include CSP header', async ({ page }) => {
    const response = await page.goto('/');
    const csp = response?.headers()?.['content-security-policy'];
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain('firebaseapp.com');
  });
});

test.describe('EMR Static Pages', () => {
  test('billing sub-pages should load', async ({ page }) => {
    for (const sub of ['/billing/daily', '/billing/monthly', '/billing/fee-calc']) {
      const response = await page.goto(sub);
      expect(response?.status()).toBeLessThan(500);
    }
  });

  test('claims sub-pages should load', async ({ page }) => {
    for (const sub of ['/claims/new', '/claims/history', '/claims/review']) {
      const response = await page.goto(sub);
      expect(response?.status()).toBeLessThan(500);
    }
  });

  test('statistics sub-pages should load', async ({ page }) => {
    for (const sub of ['/statistics/daily', '/statistics/monthly', '/statistics/annual', '/statistics/custom']) {
      const response = await page.goto(sub);
      expect(response?.status()).toBeLessThan(500);
    }
  });

  test('master data sub-pages should load', async ({ page }) => {
    for (const sub of ['/master/drugs', '/master/fee-schedule', '/master/departments', '/master/doctors', '/master/materials', '/master/insurance']) {
      const response = await page.goto(sub);
      expect(response?.status()).toBeLessThan(500);
    }
  });
});

test.describe('EMR 404 Handling', () => {
  test('should handle non-existent routes gracefully', async ({ page }) => {
    const response = await page.goto('/nonexistent-page-xyz');
    // Next.js 404 or redirect to login (both are acceptable non-500 responses)
    expect(response?.status()).not.toBe(500);
  });
});
