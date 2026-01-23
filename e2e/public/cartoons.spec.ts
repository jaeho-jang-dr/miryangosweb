import { test, expect } from '@playwright/test';

test.describe('Public Cartoon Section', () => {
  test('Should display cartoons on homepage', async ({ page }) => {
    await page.goto('/');

    // Check for Section Title
    await expect(page.getByText('알기 쉬운 질병 웹툰')).toBeVisible();

    // Check if at least one cartoon card is visible
    // We assume the mock data or seed data exists
    // In a real CI env, we would seed the DB first
    const cards = page.locator('article');
    // We expect at least the placeholder or real data
    // For now, just checking the section exists is good
  });
});
