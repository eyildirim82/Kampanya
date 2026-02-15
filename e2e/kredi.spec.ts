import { test, expect } from '@playwright/test';

const DEMO_TCKN = '11111111110';
const DEMO_NAME = 'Fatma Demir';

test.describe('Kredi Başvuru Formu E2E Testi', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/kampanya/kredi');
        await expect(page.getByText(/Kredi Başvuru Formu/i)).toBeVisible({ timeout: 15000 });
    });

    test('should validate TCKN in stage 1', async ({ page }) => {
        // Stage 1 check
        await expect(page.getByLabel(/TC Kimlik Numaranız?/i)).toBeVisible();
        await expect(page.getByLabel(/1. Adınız soyadınız?/i)).toBeHidden();

        // Invalid TCKN
        await page.getByLabel(/TC Kimlik Numaranız?/i).fill('123');
        await page.getByRole('button', { name: /Devam Et/i }).click();
        await expect(page.getByText(/TCKN 11 haneli olmalıdır/i)).toBeVisible();
    });

    test('should submit credit application successfully', async ({ page }) => {
        // STAGE 1
        await page.getByLabel(/TC Kimlik Numaranız?/i).fill(DEMO_TCKN);
        await page.getByRole('button', { name: /Devam Et/i }).click();

        // Wait for Stage 2
        await expect(page.getByLabel(/1. Adınız soyadınız?/i)).toBeVisible({ timeout: 10000 });

        // STAGE 2
        await page.getByLabel(/1. Adınız soyadınız?/i).fill(DEMO_NAME);
        await page.getByLabel(/2. Telefon numaranız?/i).fill('5559876543');

        // Customer Status -> Yes (looks like radio button logic)
        // Label text: "Evet, müşteriyim"
        await page.getByLabel(/Evet, müşteriyim/i).check();

        // Requested Amount -> 1.000.000 TL
        // Label text: "1.000.000 TL"
        await page.getByLabel(/1.000.000 TL/i).check();

        // Consents
        await page.getByLabel(/Tarafımla iletişime geçilebilmesi için/i).check(); // Phone sharing
        await page.getByLabel(/kredi teklifi sunulabilmesi için/i).check(); // TCKN sharing

        // Submit
        await page.getByRole('button', { name: /Başvuruyu Gönder/i }).click();

        // Success
        await expect(page.getByText(/Başvurunuz Alındı/i)).toBeVisible({ timeout: 20000 });
    });
});
