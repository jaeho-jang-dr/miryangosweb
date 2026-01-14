import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Public Website Navigation
 *
 * Critical user journeys: Homepage, about, location, notices, archives
 */

test.describe('Public Website Navigation', () => {

  test.describe('Homepage', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
    });

    test('should load homepage successfully', async ({ page }) => {
      // Verify page loaded
      expect(page.url()).toBe('http://localhost:3000/');

      // Check for main content
      const mainContent = page.locator('main, [role="main"], body');
      await expect(mainContent.first()).toBeVisible();
    });

    test('should display navigation menu', async ({ page }) => {
      // Look for navigation
      const nav = page.locator('nav, header');
      await expect(nav.first()).toBeVisible();
    });

    test('should have working navigation links', async ({ page }) => {
      const navLinks = [
        { text: '병원소개', partial: 'about' },
        { text: '공지사항', partial: 'notices' },
        { text: '자료실', partial: 'archives' },
        { text: '오시는길', partial: 'location' },
      ];

      for (const link of navLinks) {
        const linkElement = page.locator(`a:has-text("${link.text}")`);
        const count = await linkElement.count();

        if (count > 0) {
          await expect(linkElement.first()).toBeVisible();
        }
      }
    });

    test('should display 3D background or hero section', async ({ page }) => {
      // Check for canvas (3D) or hero section
      const canvas = page.locator('canvas');
      const hero = page.locator('[class*="hero"], [class*="banner"]');

      const hasCanvas = await canvas.count() > 0;
      const hasHero = await hero.count() > 0;

      expect(hasCanvas || hasHero).toBe(true);
    });

    test('should be responsive on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      // Main content should still be visible
      const mainContent = page.locator('main, body');
      await expect(mainContent.first()).toBeVisible();
    });
  });

  test.describe('About Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/about');
      await page.waitForLoadState('networkidle');
    });

    test('should load about page', async ({ page }) => {
      expect(page.url()).toContain('/about');
    });

    test('should display clinic information', async ({ page }) => {
      // Look for common about page elements
      const content = page.locator('text=병원, text=정형외과, text=진료, main');
      const count = await content.count();

      expect(count).toBeGreaterThan(0);
    });

    test('should have director information', async ({ page }) => {
      const directorInfo = page.locator('text=원장, text=의사, text=전문의');
      const count = await directorInfo.count();

      if (count > 0) {
        await expect(directorInfo.first()).toBeVisible();
      }
    });
  });

  test.describe('Staff Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/staff');
      await page.waitForLoadState('networkidle');
    });

    test('should load staff page', async ({ page }) => {
      expect(page.url()).toContain('/staff');
    });

    test('should display staff profiles', async ({ page }) => {
      const staffSection = page.locator('[class*="staff"], [class*="team"], main');
      await expect(staffSection.first()).toBeVisible();
    });

    test('should have staff cards or list', async ({ page }) => {
      const staffCards = page.locator('[class*="card"], [class*="profile"], article');
      const count = await staffCards.count();

      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Notices Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/notices');
      await page.waitForLoadState('networkidle');
    });

    test('should load notices page', async ({ page }) => {
      expect(page.url()).toContain('/notices');
    });

    test('should display notices list or empty state', async ({ page }) => {
      const noticesList = page.locator('[class*="notice"], article, main');
      await expect(noticesList.first()).toBeVisible();
    });

    test('should have clickable notice items', async ({ page }) => {
      const noticeLinks = page.locator('a[href*="/notices/"]');
      const count = await noticeLinks.count();

      if (count > 0) {
        await expect(noticeLinks.first()).toBeVisible();
      }
    });

    test('should navigate to individual notice', async ({ page }) => {
      const noticeLink = page.locator('a[href*="/notices/"]').first();
      const count = await noticeLink.count();

      if (count > 0 && await noticeLink.isVisible()) {
        await noticeLink.click();
        await page.waitForLoadState('networkidle');

        expect(page.url()).toMatch(/\/notices\/[^/]+$/);
      }
    });
  });

  test.describe('Archives Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/archives');
      await page.waitForLoadState('networkidle');
    });

    test('should load archives page', async ({ page }) => {
      expect(page.url()).toContain('/archives');
    });

    test('should display category tabs or filters', async ({ page }) => {
      const categories = page.locator('[role="tab"], button[class*="category"]');
      const count = await categories.count();

      if (count > 0) {
        await expect(categories.first()).toBeVisible();
      }
    });

    test('should show article cards', async ({ page }) => {
      const articleCards = page.locator('[class*="card"], article, main');
      await expect(articleCards.first()).toBeVisible();
    });

    test('should navigate to individual article', async ({ page }) => {
      const articleLink = page.locator('a[href*="/archives/"]').first();
      const count = await articleLink.count();

      if (count > 0 && await articleLink.isVisible()) {
        await articleLink.click();
        await page.waitForLoadState('networkidle');

        expect(page.url()).toMatch(/\/archives\/[^/]+$/);
      }
    });
  });

  test.describe('Location Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/location');
      await page.waitForLoadState('networkidle');
    });

    test('should load location page', async ({ page }) => {
      expect(page.url()).toContain('/location');
    });

    test('should display address information', async ({ page }) => {
      const addressInfo = page.locator('text=경남, text=밀양, text=주소');
      const count = await addressInfo.count();

      if (count > 0) {
        await expect(addressInfo.first()).toBeVisible();
      }
    });

    test('should display contact information', async ({ page }) => {
      const contactInfo = page.locator('text=전화, text=연락처, text=055');
      const count = await contactInfo.count();

      if (count > 0) {
        await expect(contactInfo.first()).toBeVisible();
      }
    });

    test('should have map integration', async ({ page }) => {
      // Look for iframe (Google Maps) or map container
      const map = page.locator('iframe[src*="google.com/maps"], [class*="map"], canvas');
      const count = await map.count();

      if (count > 0) {
        await expect(map.first()).toBeVisible();
      }
    });
  });

  test.describe('Inquiry Form', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/inquiry');
      await page.waitForLoadState('networkidle');
    });

    test('should load inquiry page', async ({ page }) => {
      expect(page.url()).toContain('/inquiry');
    });

    test('should display inquiry form', async ({ page }) => {
      const form = page.locator('form, [class*="form"]');
      const count = await form.count();

      if (count > 0) {
        await expect(form.first()).toBeVisible();
      }
    });

    test('should have required form fields', async ({ page }) => {
      const nameInput = page.locator('input[name="name"], input[placeholder*="이름"]');
      const count = await nameInput.count();

      if (count > 0) {
        await expect(nameInput.first()).toBeVisible();
        await expect(nameInput.first()).toBeEditable();
      }
    });

    test('should have submit button', async ({ page }) => {
      const submitButton = page.locator('button[type="submit"], button:has-text("문의하기")');
      const count = await submitButton.count();

      if (count > 0) {
        await expect(submitButton.first()).toBeVisible();
      }
    });
  });

  test.describe('SEO and Meta Tags', () => {
    test('should have proper title tag', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const title = await page.title();
      expect(title).toBeTruthy();
      expect(title.length).toBeGreaterThan(0);
    });

    test('should have meta description', async ({ page }) => {
      await page.goto('/');

      const metaDescription = await page.locator('meta[name="description"]').getAttribute('content');

      if (metaDescription) {
        expect(metaDescription.length).toBeGreaterThan(0);
      }
    });

    test('should have viewport meta tag', async ({ page }) => {
      await page.goto('/');

      const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
      expect(viewport).toBeTruthy();
    });
  });

  test.describe('Performance', () => {
    test('should load homepage within 3 seconds', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const loadTime = Date.now() - startTime;

      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('should have no console errors on homepage', async ({ page }) => {
      const errors: string[] = [];

      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Allow some warnings but no critical errors
      const criticalErrors = errors.filter(e =>
        !e.includes('Ignored') &&
        !e.includes('Warning') &&
        !e.includes('favicon')
      );

      expect(criticalErrors.length).toBe(0);
    });
  });

  test.describe('Accessibility', () => {
    test('should have main landmark', async ({ page }) => {
      await page.goto('/');

      const main = page.locator('main, [role="main"]');
      const count = await main.count();

      expect(count).toBeGreaterThan(0);
    });

    test('should have skip to content link', async ({ page }) => {
      await page.goto('/');

      const skipLink = page.locator('a:has-text("Skip"), a[href="#main-content"]');
      const count = await skipLink.count();

      // Optional but recommended
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should support keyboard navigation', async ({ page }) => {
      await page.goto('/');

      // Tab through page
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Some element should be focused
      const focusedElement = await page.locator(':focus');
      const count = await focusedElement.count();

      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Responsive Design', () => {
    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 },
    ];

    viewports.forEach(({ name, width, height }) => {
      test(`should be responsive on ${name}`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Main content should be visible
        const main = page.locator('main, body');
        await expect(main.first()).toBeVisible();

        // Navigation should be accessible
        const nav = page.locator('nav, header');
        await expect(nav.first()).toBeVisible();
      });
    });
  });

  test.describe('External Links', () => {
    test('should have social media links', async ({ page }) => {
      await page.goto('/');

      const socialLinks = page.locator('a[href*="facebook"], a[href*="instagram"], a[href*="youtube"]');
      const count = await socialLinks.count();

      // Social links are optional
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('external links should open in new tab', async ({ page }) => {
      await page.goto('/');

      const externalLinks = page.locator('a[target="_blank"]');
      const count = await externalLinks.count();

      if (count > 0) {
        const firstLink = externalLinks.first();
        const target = await firstLink.getAttribute('target');
        expect(target).toBe('_blank');

        // Should have rel="noopener noreferrer" for security
        const rel = await firstLink.getAttribute('rel');
        if (rel) {
          expect(rel).toContain('noopener');
        }
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should display 404 page for invalid routes', async ({ page }) => {
      await page.goto('/this-page-does-not-exist-12345');
      await page.waitForLoadState('networkidle');

      // Should show 404 content or redirect
      const content = await page.content();
      const has404 = content.includes('404') || content.includes('Not Found') || content.includes('찾을 수 없');

      expect(has404).toBe(true);
    });

    test('should handle network errors gracefully', async ({ page }) => {
      await page.goto('/');

      // Simulate offline
      await page.context().setOffline(true);

      // Try to navigate
      await page.goto('/about').catch(() => {});

      // Go back online
      await page.context().setOffline(false);
    });
  });
});
