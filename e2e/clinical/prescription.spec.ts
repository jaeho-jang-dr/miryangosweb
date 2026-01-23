import { test, expect } from '@playwright/test';

test.describe('Prescription Flow', () => {
  test('Search and Add Drug', async ({ page }) => {
    // 1. Mock the Search API
    await page.route('*/**/api/clinical/drugs/search?q=tyl', async route => {
      const json = [{
        id: "drug_001",
        name: "Tylenol 500mg",
        ingredient: "Acetaminophen",
        category: "Analgesic",
        unit: "Tab"
      }];
      await route.fulfill({ json });
    });

    // 2. Navigate to Consulting Page (Assuming Mock Auth or Direct Access in Dev)
    // For this test, we might need to bypass auth or assume we are logged in.
    // Here we'll just check if the component renders if we force a state, 
    // but in a real app we'd log in. 
    // *SIMPLIFICATION*: We'll assume the user is already on the page.
    await page.goto('/clinical/consulting/mock-visit-id');

    // 3. Interact with Prescription Module
    await page.getByPlaceholder('약물 검색').fill('tyl');
    
    // 4. Wait for results and click
    await expect(page.getByText('Tylenol 500mg')).toBeVisible();
    await page.getByText('Tylenol 500mg').click();

    // 5. Click Add
    await page.getByRole('button', { name: '처방 목록에 추가' }).click();

    // 6. Verify Textarea update
    await expect(page.getByPlaceholder('처방 내용을 말씀하세요...')).toContainText('Tylenol 500mg [ 1Tab / 3회 / 3일 ]');
  });
});
