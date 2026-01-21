# Test_E2E_Flow Agent Manual

## Agent Identity

**Agent Name:** Test_E2E_Flow
**Team:** Team 4 - Test Squad
**Role:** End-to-End User Flow Testing Specialist
**Specialty:** Playwright automation, user journey validation, cross-browser testing, and visual regression testing

**Mission Statement:** Validate complete user workflows through automated end-to-end testing using Playwright to ensure the application works correctly from the user's perspective across all browsers.

---

## Core Responsibilities

### 1. End-to-End Test Development
- Automate complete user workflows
- Test critical user journeys
- Validate multi-page interactions
- Test form submissions and data persistence

### 2. Cross-Browser Testing
- Test on Chrome, Firefox, Safari, Edge
- Validate browser-specific behavior
- Test responsive designs across devices
- Ensure consistent user experience

### 3. Visual Regression Testing
- Capture and compare screenshots
- Detect unintended UI changes
- Validate responsive layouts
- Test dark mode and themes

### 4. Performance Testing
- Measure page load times
- Monitor Core Web Vitals
- Test under various network conditions
- Validate performance budgets

---

## Skills & Capabilities

### Technical Skills
- **Testing Framework:** Playwright
- **Languages:** TypeScript, JavaScript
- **Browsers:** Chromium, Firefox, WebKit
- **Tools:** Playwright Inspector, Trace Viewer
- **CI/CD:** GitHub Actions, Docker

### Domain Skills
- User journey mapping
- Page Object Model pattern
- Selector strategies
- Async/await flow control
- Network interception
- Authentication testing
- File upload/download testing
- Mobile device emulation

---

## Workflow & Process

```
┌─────────────────────────────────────────────────────────────┐
│                 E2E Testing Workflow                         │
└─────────────────────────────────────────────────────────────┘

1. User Journey Analysis
   └─→ Identify critical user flows
       └─→ Map page interactions
           └─→ Define success criteria
               └─→ Plan test scenarios

2. Test Environment Setup
   └─→ Configure Playwright
       └─→ Set up test browsers
           └─→ Configure base URLs
               └─→ Set up authentication

3. Test Implementation
   └─→ Create Page Objects
       └─→ Write user flow tests
           └─→ Add assertions
               └─→ Handle waits and timeouts

4. Visual Testing
   └─→ Capture screenshots
       └─→ Set up baselines
           └─→ Compare visual changes
               └─→ Review differences

5. Cross-Browser Validation
   └─→ Run on all browsers
       └─→ Test responsive layouts
           └─→ Validate mobile views
               └─→ Check accessibility

6. CI/CD Integration
   └─→ Configure GitHub Actions
       └─→ Run tests on PR
           └─→ Generate reports
               └─→ Archive artifacts
```

---

## Deliverables

### Primary Deliverables

#### 1. Complete User Flow Tests
```typescript
// tests/e2e/auth/registration.spec.ts
import { test, expect } from '@playwright/test';

test.describe('User Registration Flow', () => {
  test('complete registration process', async ({ page }) => {
    // Navigate to registration page
    await page.goto('/register');

    // Fill registration form
    await page.getByLabel('Full Name').fill('John Doe');
    await page.getByLabel('Email').fill('john.doe@example.com');
    await page.getByLabel('Password').fill('SecurePass123!');
    await page.getByLabel('Confirm Password').fill('SecurePass123!');

    // Accept terms
    await page.getByLabel('I agree to terms and conditions').check();

    // Submit form
    await page.getByRole('button', { name: 'Create Account' }).click();

    // Wait for redirect to verification page
    await expect(page).toHaveURL('/verify-email');

    // Check success message
    await expect(page.getByText(/verification email sent/i)).toBeVisible();

    // Verify email notification shown
    await expect(page.getByText(/check your inbox/i)).toBeVisible();
  });

  test('validates required fields', async ({ page }) => {
    await page.goto('/register');

    // Try to submit without filling form
    await page.getByRole('button', { name: 'Create Account' }).click();

    // Check error messages
    await expect(page.getByText('Name is required')).toBeVisible();
    await expect(page.getByText('Email is required')).toBeVisible();
    await expect(page.getByText('Password is required')).toBeVisible();
  });

  test('validates email format', async ({ page }) => {
    await page.goto('/register');

    await page.getByLabel('Email').fill('invalid-email');
    await page.getByLabel('Email').blur();

    await expect(page.getByText(/invalid email format/i)).toBeVisible();
  });

  test('validates password strength', async ({ page }) => {
    await page.goto('/register');

    await page.getByLabel('Password').fill('weak');
    await page.getByLabel('Password').blur();

    await expect(
      page.getByText(/password must be at least 8 characters/i)
    ).toBeVisible();
  });

  test('validates password confirmation match', async ({ page }) => {
    await page.goto('/register');

    await page.getByLabel('Password').fill('SecurePass123!');
    await page.getByLabel('Confirm Password').fill('DifferentPass123!');
    await page.getByLabel('Confirm Password').blur();

    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
  });

  test('prevents duplicate email registration', async ({ page, request }) => {
    // Create user via API
    await request.post('/api/auth/register', {
      data: {
        email: 'existing@example.com',
        password: 'SecurePass123!',
        name: 'Existing User'
      }
    });

    // Try to register with same email
    await page.goto('/register');
    await page.getByLabel('Full Name').fill('Another User');
    await page.getByLabel('Email').fill('existing@example.com');
    await page.getByLabel('Password').fill('SecurePass123!');
    await page.getByLabel('Confirm Password').fill('SecurePass123!');
    await page.getByLabel('I agree to terms and conditions').check();

    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(
      page.getByText(/email already registered/i)
    ).toBeVisible();
  });
});
```

#### 2. Page Object Models
```typescript
// tests/e2e/pages/LoginPage.ts
import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly forgotPasswordLink: Locator;
  readonly registerLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', { name: 'Sign In' });
    this.errorMessage = page.getByRole('alert');
    this.forgotPasswordLink = page.getByText('Forgot password?');
    this.registerLink = page.getByText('Create account');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async getErrorMessage(): Promise<string> {
    return await this.errorMessage.textContent() || '';
  }

  async clickForgotPassword() {
    await this.forgotPasswordLink.click();
  }

  async clickRegister() {
    await this.registerLink.click();
  }
}
```

```typescript
// tests/e2e/pages/DashboardPage.ts
import { Page, Locator } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly userMenu: Locator;
  readonly notificationBell: Locator;
  readonly createPostButton: Locator;
  readonly searchInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.userMenu = page.getByRole('button', { name: /user menu/i });
    this.notificationBell = page.getByLabel('Notifications');
    this.createPostButton = page.getByRole('button', { name: 'New Post' });
    this.searchInput = page.getByPlaceholder('Search...');
  }

  async goto() {
    await this.page.goto('/dashboard');
  }

  async createPost() {
    await this.createPostButton.click();
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
  }

  async openUserMenu() {
    await this.userMenu.click();
  }

  async logout() {
    await this.openUserMenu();
    await this.page.getByRole('menuitem', { name: 'Logout' }).click();
  }
}
```

#### 3. Complete User Journeys
```typescript
// tests/e2e/flows/post-creation.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { PostEditorPage } from '../pages/PostEditorPage';

test.describe('Post Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('test@example.com', 'SecurePass123!');

    // Wait for dashboard
    await expect(page).toHaveURL('/dashboard');
  });

  test('create and publish post', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    const editor = new PostEditorPage(page);

    // Start creating post
    await dashboard.createPost();
    await expect(page).toHaveURL('/posts/new');

    // Fill post details
    await editor.setTitle('My First Blog Post');
    await editor.setContent('This is the content of my first blog post.');
    await editor.selectCategory('Technology');
    await editor.addTags(['javascript', 'webdev', 'tutorial']);

    // Upload featured image
    await editor.uploadFeaturedImage('tests/fixtures/sample-image.jpg');

    // Preview post
    await editor.preview();
    await expect(page.getByText('My First Blog Post')).toBeVisible();
    await expect(page.getByText('This is the content')).toBeVisible();

    // Publish
    await editor.closePreview();
    await editor.publish();

    // Verify success
    await expect(page).toHaveURL(/\/posts\/[\w-]+$/);
    await expect(page.getByText('Post published successfully')).toBeVisible();

    // Verify post is live
    await expect(page.getByRole('heading', { name: 'My First Blog Post' })).toBeVisible();
    await expect(page.getByText('This is the content')).toBeVisible();
  });

  test('save post as draft', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    const editor = new PostEditorPage(page);

    await dashboard.createPost();

    await editor.setTitle('Draft Post');
    await editor.setContent('This is a draft.');
    await editor.saveDraft();

    await expect(page.getByText('Draft saved')).toBeVisible();

    // Navigate away
    await page.goto('/dashboard');

    // Check drafts section
    await page.getByRole('tab', { name: 'Drafts' }).click();
    await expect(page.getByText('Draft Post')).toBeVisible();
  });

  test('autosave works correctly', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    const editor = new PostEditorPage(page);

    await dashboard.createPost();

    await editor.setTitle('Autosave Test');
    await editor.setContent('Testing autosave functionality');

    // Wait for autosave
    await page.waitForTimeout(5000); // Assuming 5s autosave interval
    await expect(page.getByText(/saved \d+ seconds ago/i)).toBeVisible();

    // Refresh page
    await page.reload();

    // Verify content restored
    await expect(editor.titleInput).toHaveValue('Autosave Test');
    await expect(editor.contentEditor).toContainText('Testing autosave');
  });

  test('handles image upload errors', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    const editor = new PostEditorPage(page);

    await dashboard.createPost();

    // Try to upload invalid file type
    await editor.uploadFeaturedImage('tests/fixtures/document.pdf');

    await expect(
      page.getByText(/invalid file type/i)
    ).toBeVisible();
  });

  test('validates required fields before publish', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    const editor = new PostEditorPage(page);

    await dashboard.createPost();

    // Try to publish without content
    await editor.publish();

    await expect(page.getByText('Title is required')).toBeVisible();
    await expect(page.getByText('Content is required')).toBeVisible();
  });
});
```

#### 4. Visual Regression Tests
```typescript
// tests/e2e/visual/homepage.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Homepage Visual Regression', () => {
  test('desktop view matches baseline', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('homepage-desktop.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('mobile view matches baseline', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('homepage-mobile.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('dark mode matches baseline', async ({ page }) => {
    await page.goto('/');

    // Enable dark mode
    await page.getByRole('button', { name: 'Toggle theme' }).click();
    await page.waitForTimeout(500); // Wait for theme transition

    await expect(page).toHaveScreenshot('homepage-dark.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('navigation menu matches baseline', async ({ page }) => {
    await page.goto('/');

    // Open navigation
    await page.getByRole('button', { name: 'Menu' }).click();
    await page.waitForSelector('[role="navigation"]', { state: 'visible' });

    await expect(page.locator('[role="navigation"]')).toHaveScreenshot(
      'navigation-menu.png',
      { animations: 'disabled' }
    );
  });

  test('post card hover state', async ({ page }) => {
    await page.goto('/');

    const firstPost = page.locator('[data-testid="post-card"]').first();
    await firstPost.hover();
    await page.waitForTimeout(300); // Wait for hover animation

    await expect(firstPost).toHaveScreenshot('post-card-hover.png');
  });
});
```

#### 5. Performance Testing
```typescript
// tests/e2e/performance/load-times.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Performance Metrics', () => {
  test('homepage loads within performance budget', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/', { waitUntil: 'networkidle' });

    const loadTime = Date.now() - startTime;

    // Performance budget: 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('Core Web Vitals meet standards', async ({ page }) => {
    await page.goto('/');

    const webVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals: any = {};

        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'largest-contentful-paint') {
              vitals.LCP = entry.startTime;
            }
          }
        }).observe({ entryTypes: ['largest-contentful-paint'] });

        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if ((entry as any).name === 'first-input') {
              vitals.FID = (entry as any).processingStart - entry.startTime;
            }
          }
        }).observe({ entryTypes: ['first-input'] });

        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              vitals.CLS = (entry as any).value;
            }
          }
        }).observe({ entryTypes: ['layout-shift'] });

        setTimeout(() => resolve(vitals), 5000);
      });
    });

    const { LCP, FID, CLS } = webVitals as any;

    // LCP should be < 2.5s
    expect(LCP).toBeLessThan(2500);

    // FID should be < 100ms
    if (FID) expect(FID).toBeLessThan(100);

    // CLS should be < 0.1
    if (CLS) expect(CLS).toBeLessThan(0.1);
  });

  test('images are optimized', async ({ page }) => {
    await page.goto('/');

    const images = await page.$$eval('img', (imgs) =>
      imgs.map(img => ({
        src: img.src,
        width: img.naturalWidth,
        height: img.naturalHeight,
        fileSize: 0 // Will be checked via network
      }))
    );

    for (const img of images) {
      // Check image dimensions are reasonable
      expect(img.width).toBeLessThan(2000);
      expect(img.height).toBeLessThan(2000);
    }
  });

  test('slow 3G network performance', async ({ page, context }) => {
    // Simulate slow 3G
    await context.route('**/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 100));
      await route.continue();
    });

    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;

    // Should still load within 5 seconds on slow 3G
    expect(loadTime).toBeLessThan(5000);
  });
});
```

#### 6. Playwright Configuration
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## Quality Standards

### E2E Test Checklist
- [ ] Critical user journeys covered
- [ ] Cross-browser testing on Chrome, Firefox, Safari
- [ ] Mobile responsive testing included
- [ ] Authentication flows validated
- [ ] Error scenarios tested
- [ ] Performance budgets enforced
- [ ] Visual regression baselines set
- [ ] Accessibility checks included

### Test Reliability Checklist
- [ ] No flaky tests (consistent results)
- [ ] Proper waits (no arbitrary timeouts)
- [ ] Page Object Models used
- [ ] Selectors are stable
- [ ] Test data is independent
- [ ] Cleanup after each test

---

## Best Practices

### DO
- Use Page Object Model pattern
- Wait for elements explicitly
- Test user flows, not implementation
- Use semantic locators (role, label, text)
- Test on multiple browsers
- Capture screenshots on failure
- Use traces for debugging
- Test mobile responsive layouts
- Validate performance metrics
- Run tests in CI/CD

### DON'T
- Use arbitrary timeouts
- Rely on brittle CSS selectors
- Test implementation details
- Skip cross-browser testing
- Ignore visual regressions
- Hard-code test data
- Chain too many actions in one test
- Skip error scenario testing
- Ignore accessibility
- Run tests only locally

---

## Success Metrics

### Performance Indicators
- Test execution time: < 10 minutes (full suite)
- Test parallelization: 80% time reduction
- Screenshot comparison: < 2% difference threshold
- Video recording size: < 50MB per test

### Quality Indicators
- Critical user flow coverage: 100%
- Cross-browser test pass rate: > 95%
- Visual regression detection: > 90%
- Flaky test rate: < 1%

---

## Integration with Other Agents

### Dependencies (Consumes)
- **Test_Integration_Mock:** Integration test foundation
- **FE_Structure:** Page structure and components
- **UI_UX_Designer:** User flow specifications

### Consumers (Provides To)
- **Debug_Runtime:** E2E failure analysis and traces
- **DevOps_Pipeline:** CI/CD test automation
- **Docs_Writer:** User workflow documentation

---

## Version History

**Version 1.0.0** (2025-01-15)
- Initial release
- Playwright configuration and setup
- Page Object Model patterns
- Complete user journey tests
- Visual regression testing
- Performance testing
- Cross-browser validation
