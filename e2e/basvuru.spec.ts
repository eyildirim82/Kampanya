import { test, expect } from '@playwright/test';

/**
 * Demo TCKN ve kampanya bilgileri
 * Bu bilgiler DEMO_CONFIG.md'den alınmalıdır
 */
const DEMO_TCKN = '12345678901';
const DEMO_NAME = 'Ahmet Yılmaz';

test.describe('Başvuru Formu E2E Testi', () => {
  test.beforeEach(async ({ page }) => {
    // Başvuru sayfasına git ve sayfanın yüklenmesini bekle
    await page.goto('/basvuru');
    // Sayfanın yüklendiğini doğrula
    await expect(page.getByText(/TALPA Üyelik Başvurusu/i)).toBeVisible({ timeout: 10000 });
  });

  test('should display application form', async ({ page }) => {
    // Form alanlarının görünür olduğunu kontrol et
    // Label'lar: "T.C. Kimlik Numarası", "Ad Soyad", "E-posta", "Telefon"
    await expect(page.getByLabel(/T\.C\. Kimlik Numarası|TCKN/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByLabel(/Ad Soyad/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByLabel(/E-posta/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByLabel(/Telefon/i)).toBeVisible({ timeout: 5000 });
  });

  test('should validate required fields', async ({ page }) => {
    // Formu boş göndermeyi dene
    const submitButton = page.getByRole('button', { name: /Başvuruyu Tamamla/i });
    await submitButton.click();

    // Hata mesajlarının göründüğünü kontrol et
    // Form validasyonu react-hook-form ile yapılıyor, hata mesajları görünmeli
    await expect(page.locator('form')).toBeVisible();
    // En az bir hata mesajı görünmeli
    await expect(page.locator('.text-red-500').first()).toBeVisible({ timeout: 3000 });
  });

  test('should submit application with demo TCKN', async ({ page }) => {
    // Not: Bu test için demo verisi yüklenmiş olmalı ve Supabase bağlantısı olmalı
    // Formu doldur - name attribute'larına göre bul
    await page.getByLabel(/T\.C\. Kimlik Numarası|TCKN/i).fill(DEMO_TCKN);
    await page.getByLabel(/Ad Soyad/i).fill(DEMO_NAME);
    await page.getByLabel(/E-posta/i).fill('test@example.com');
    await page.getByLabel(/Telefon/i).fill('5551234567');
    await page.getByLabel(/Adres/i).fill('Test Adresi 123');
    await page.getByLabel(/İl/i).fill('İstanbul');
    await page.getByLabel(/İlçe/i).fill('Kadıköy');

    // KVKK onay kutularını işaretle - id'lerine göre bul
    await page.getByLabel(/KVKK Metni/i).check();
    await page.getByLabel(/Açık Rıza Metni/i).check();
    await page.getByLabel(/İletişim İzni/i).check();

    // Formu gönder
    const submitButton = page.getByRole('button', { name: /Başvuruyu Tamamla/i });
    await submitButton.click();

    // Başarı mesajını kontrol et - "Başvurunuz Alındı" veya benzeri
    await expect(page.getByText(/Başvurunuz Alındı|başarı/i)).toBeVisible({ timeout: 15000 });
  });

  test('should show error for invalid TCKN', async ({ page }) => {
    // Geçersiz TCKN gir (11 haneden az)
    await page.getByLabel(/T\.C\. Kimlik Numarası|TCKN/i).fill('123');

    // Form gönderilmeye çalışıldığında hata gösterilmeli
    const submitButton = page.getByRole('button', { name: /Başvuruyu Tamamla/i });
    await submitButton.click();

    // TCKN validasyon hatası gösterilmeli
    await expect(page.getByText(/TCKN 11 haneli olmalıdır/i)).toBeVisible({ timeout: 3000 });
  });
});
