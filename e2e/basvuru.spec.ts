import { test, expect } from '@playwright/test';

const DEMO_TCKN = '11111111110'; // Valid checksum TCKN for testing if Mernis is mocked or generic
const DEMO_NAME = 'Ahmet Yılmaz';

test.describe('Başvuru Formu E2E Testi', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/basvuru');
    await expect(page.getByText(/Kampanya Başvuru Formu/i)).toBeVisible({ timeout: 15000 });
  });

  test('should validate TCKN in stage 1', async ({ page }) => {
    // Stage 1: Only TCKN input should be visible
    await expect(page.getByLabel(/T\.C\. Kimlik Numarası/i)).toBeVisible();
    await expect(page.getByLabel(/Ad Soyad/i)).toBeHidden(); // Stage 2 fields hidden

    // Invalid TCKN
    await page.getByLabel(/T\.C\. Kimlik Numarası/i).fill('123');
    await page.getByRole('button', { name: /Doğrula/i }).click();
    await expect(page.getByText(/TCKN 11 haneli olmalıdır/i)).toBeVisible();
  });

  test('should proceed to stage 2 with valid TCKN', async ({ page }) => {
    // Fill TCKN
    await page.getByLabel(/T\.C\. Kimlik Numarası/i).fill(DEMO_TCKN);

    // Click Verify
    // Note: This relies on the backend mocking 'NEW_MEMBER' response for this TCKN
    // If backend is real and TCKN doesn't exist/fails Mernis, this might fail.
    // Assuming dev environment handles this or we need to mock the route.
    await page.getByRole('button', { name: /Doğrula/i }).click();

    // Check if Stage 2 appeared
    // Wait for "Ad Soyad" to become visible
    // Using a longer timeout to account for RPC call
    await expect(page.getByLabel(/Ad Soyad/i)).toBeVisible({ timeout: 10000 });

    // Check auto-filled TCKN in Stage 2 (disabled)
    const tcknInputStage2 = page.locator('input[name="tckn"]').nth(1); // Might be 2nd input if stage 1 is hidden/removed or just disabled
    // Actually in the code: {stage === 'FORM' && ...} replaces Stage 1 div.
    // So there is only one TCKN input visible in Stage 2, which is disabled.
    await expect(page.getByLabel(/T\.C\. Kimlik Numarası/i)).toBeDisabled();
    await expect(page.getByLabel(/T\.C\. Kimlik Numarası/i)).toHaveValue(DEMO_TCKN);
  });

  // Combined flow
  test('should submit application successfully', async ({ page }) => {
    // STAGE 1
    await page.getByLabel(/T\.C\. Kimlik Numarası/i).fill(DEMO_TCKN);
    await page.getByRole('button', { name: /Doğrula/i }).click();

    // Wait for Stage 2
    await expect(page.getByLabel(/Ad Soyad/i)).toBeVisible({ timeout: 10000 });

    // STAGE 2
    await page.getByLabel(/Ad Soyad/i).fill(DEMO_NAME);
    await page.getByLabel(/Telefon/i).fill('5551234567');
    await page.getByLabel(/E-posta/i).fill('test@example.com');

    // Delivery Method -> Branch
    // Select radio button "Denizbank Yeşilköy Şubesi'nden..."
    await page.getByLabel(/Denizbank Yeşilköy Şubesi'nden/i).check();

    // Consents
    // "Kart başvurusu..." checkbox
    await page.getByLabel(/talebim doğrultusunda adıma/i).check();
    // "TC kimlik ve telefon..." checkbox
    await page.getByLabel(/iletişime geçilebilmesi için telefon/i).check();

    // Submit
    await page.getByRole('button', { name: /Başvuruyu Tamamla/i }).click();

    // Success
    await expect(page.getByText(/Başvurunuz Alındı/i)).toBeVisible({ timeout: 20000 });
  });
});
