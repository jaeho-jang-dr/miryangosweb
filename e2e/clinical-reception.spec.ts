import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Clinical Reception Workflow
 *
 * Critical user journey: Patient check-in, registration, and queue management
 */

test.describe('Clinical Reception Workflow', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to reception page
    await page.goto('/clinical/reception');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test.describe('Page Load and Navigation', () => {
    test('should load reception page successfully', async ({ page }) => {
      // Verify page title or main heading
      await expect(page.locator('text=접수/대기')).toBeVisible();
      await expect(page.locator('text=수납 대기')).toBeVisible();
      await expect(page.locator('text=제증명/완료')).toBeVisible();
    });

    test('should display all three tabs', async ({ page }) => {
      const tabs = page.locator('button[class*="text-lg font-bold"]');
      await expect(tabs).toHaveCount(3);
    });

    test('should default to reception tab', async ({ page }) => {
      const receptionTab = page.locator('text=접수/대기').first();
      await expect(receptionTab).toHaveClass(/text-slate-800/);
    });
  });

  test.describe('Tab Navigation', () => {
    test('should switch between tabs', async ({ page }) => {
      // Click payment tab
      await page.click('text=수납 대기');
      await expect(page.locator('text=수납 대기').first()).toHaveClass(/text-indigo-600/);

      // Click documents tab
      await page.click('text=제증명/완료');
      await expect(page.locator('text=제증명/완료').first()).toHaveClass(/text-emerald-600/);

      // Click back to reception
      await page.click('text=접수/대기');
      await expect(page.locator('text=접수/대기').first()).toHaveClass(/text-slate-800/);
    });

    test('should show correct content for each tab', async ({ page }) => {
      // Reception tab - should show search input
      await expect(page.locator('input[placeholder*="환자 이름 검색"]')).toBeVisible();

      // Payment tab
      await page.click('text=수납 대기');
      // Wait for content to change
      await page.waitForTimeout(500);

      // Documents tab
      await page.click('text=제증명/완료');
      await expect(page.locator('text=제증명 발급').or(page.locator('text=발급 가능한 내역이 없습니다'))).toBeVisible();
    });
  });

  test.describe('Patient Search', () => {
    test('should display search input', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="환자 이름 검색"]');
      await expect(searchInput).toBeVisible();
      await expect(searchInput).toBeEditable();
    });

    test('should not search with less than 2 characters', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="환자 이름 검색"]');

      // Type single character
      await searchInput.fill('홍');

      // Wait a bit to ensure no search is triggered
      await page.waitForTimeout(500);

      // Should not show results container
      const resultsContainer = page.locator('text=검색 결과가 없습니다');
      await expect(resultsContainer).not.toBeVisible();
    });

    test('should trigger search with 2+ characters', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="환자 이름 검색"]');

      // Type 2+ characters
      await searchInput.fill('홍길');

      // Wait for search to complete
      await page.waitForTimeout(1000);

      // Either results or "no results" message should appear
      const hasResults = await page.locator('text=접수하기').isVisible();
      const noResults = await page.locator('text=검색 결과가 없습니다').isVisible();

      expect(hasResults || noResults).toBe(true);
    });

    test('should show "no results" message when search returns empty', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="환자 이름 검색"]');

      // Search for non-existent patient
      await searchInput.fill('존재하지않는환자명XYZ123');

      await page.waitForTimeout(1000);

      // Should show no results message
      await expect(page.locator('text=검색 결과가 없습니다')).toBeVisible();

      // Should show new patient registration button
      await expect(page.locator('text=신규 환자 등록하기')).toBeVisible();
    });

    test('should clear search input', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="환자 이름 검색"]');

      // Type and then clear
      await searchInput.fill('테스트');
      await expect(searchInput).toHaveValue('테스트');

      await searchInput.clear();
      await expect(searchInput).toHaveValue('');
    });
  });

  test.describe('Waiting List Display', () => {
    test('should display waiting list panel', async ({ page }) => {
      await expect(page.locator('text=실시간 대기 현황')).toBeVisible();
    });

    test('should show patient count in waiting list', async ({ page }) => {
      const countElement = page.locator('text=실시간 대기 현황').locator('..').locator('span').last();
      await expect(countElement).toBeVisible();
    });

    test('should display empty state when no patients', async ({ page }) => {
      // Check if either patients are shown or empty state
      const hasPatients = await page.locator('button:has-text("호출")').count() > 0;
      const emptyState = await page.locator('text=대기 환자가 없습니다').isVisible();

      expect(hasPatients || emptyState).toBe(true);
    });
  });

  test.describe('Patient Status Management', () => {
    test('should show call button for reception status patients', async ({ page }) => {
      // Check if call button exists
      const callButtons = page.locator('button:has-text("호출")');
      const count = await callButtons.count();

      if (count > 0) {
        await expect(callButtons.first()).toBeVisible();
        await expect(callButtons.first()).toBeEnabled();
      }
    });

    test('should display status badges', async ({ page }) => {
      const statusBadges = page.locator('[class*="bg-yellow-100"], [class*="bg-blue-100"], [class*="bg-green-100"]');
      const count = await statusBadges.count();

      // If there are patients, there should be status badges
      if (count > 0) {
        await expect(statusBadges.first()).toBeVisible();
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should be responsive on mobile', async ({ page, viewport }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Check that main elements are still visible
      await expect(page.locator('text=접수/대기')).toBeVisible();
      await expect(page.locator('input[placeholder*="환자 이름 검색"]')).toBeVisible();
    });

    test('should be responsive on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });

      await expect(page.locator('text=실시간 대기 현황')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should have accessible search input', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="환자 이름 검색"]');

      // Input should be keyboard accessible
      await searchInput.focus();
      await expect(searchInput).toBeFocused();
    });

    test('should support keyboard navigation for tabs', async ({ page }) => {
      const receptionTab = page.locator('text=접수/대기').first();

      // Tab should be keyboard accessible
      await receptionTab.focus();
      await page.keyboard.press('Enter');

      await expect(receptionTab).toHaveClass(/text-slate-800/);
    });

    test('should have semantic HTML structure', async ({ page }) => {
      // Check for proper button elements
      const buttons = page.locator('button');
      await expect(buttons.first()).toBeVisible();

      // Check for input elements
      const inputs = page.locator('input');
      await expect(inputs.first()).toBeVisible();
    });
  });

  test.describe('Real-time Updates', () => {
    test('should display real-time timestamp', async ({ page }) => {
      // Look for time displays
      const timeElements = page.locator('[class*="text-slate-500"]:has-text(":")');
      const count = await timeElements.count();

      // If there are patients, there should be timestamps
      if (count > 0) {
        await expect(timeElements.first()).toBeVisible();
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate offline mode
      await page.context().setOffline(true);

      // Try to search
      const searchInput = page.locator('input[placeholder*="환자 이름 검색"]');
      await searchInput.fill('테스트');

      // Wait for error handling
      await page.waitForTimeout(2000);

      // Go back online
      await page.context().setOffline(false);
    });

    test('should recover from errors', async ({ page }) => {
      // Reload page to test recovery
      await page.reload();

      // Page should still load correctly
      await expect(page.locator('text=접수/대기')).toBeVisible();
    });
  });
});
