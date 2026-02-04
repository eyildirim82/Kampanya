import { test, expect } from '@playwright/test';

/**
 * Admin E2E Testleri
 * Not: Bu testler için demo admin kullanıcısı gereklidir
 */
test.describe('Admin Panel E2E Testi', () => {
  test.beforeEach(async ({ page }) => {
    // Admin login sayfasına git
    await page.goto('/admin/login');
  });

  test('should redirect to login if not authenticated', async ({ page }) => {
    // Dashboard'a direkt gitmeyi dene
    await page.goto('/admin/dashboard');
    
    // Login sayfasına yönlendirilmeli
    await expect(page).toHaveURL(/.*\/admin\/login/);
  });

  test('should display login form', async ({ page }) => {
    // Login form alanlarının görünür olduğunu kontrol et
    await expect(page.getByLabel(/e-posta|email/i)).toBeVisible();
    await expect(page.getByLabel(/şifre|password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /giriş|login/i })).toBeVisible();
  });

  // Not: Gerçek admin kullanıcısı ile login testi için
  // test ortamında admin kullanıcısı oluşturulmalıdır
  test.skip('should login with valid admin credentials', async ({ page }) => {
    // Bu test, demo admin kullanıcısı oluşturulduktan sonra aktif edilebilir
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    await page.getByLabel(/e-posta|email/i).fill(adminEmail);
    await page.getByLabel(/şifre|password/i).fill(adminPassword);
    await page.getByRole('button', { name: /giriş|login/i }).click();

    // Dashboard'a yönlendirilmeli
    await expect(page).toHaveURL(/.*\/admin\/dashboard/);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Geçersiz bilgilerle giriş yapmayı dene
    await page.getByLabel(/e-posta|email/i).fill('invalid@example.com');
    await page.getByLabel(/şifre|password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /giriş|login/i }).click();

    // Hata mesajı gösterilmeli
    await expect(page.getByText(/hata|error|yanlış/i)).toBeVisible({ timeout: 5000 });
  });
});
