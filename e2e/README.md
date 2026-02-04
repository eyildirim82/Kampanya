# E2E Test Notları

## Ön Koşullar

E2E testlerini çalıştırmadan önce:

1. **Uygulamanın çalışıyor olması gerekiyor:**
   ```bash
   npm run dev
   ```

2. **Demo verisi yüklenmiş olmalı:**
   - Admin panelden `/admin/whitelist` sayfasına gidin
   - "Demo Verisi Yükle" butonuna tıklayın

3. **Supabase bağlantısı:**
   - `.env.local` dosyasında doğru Supabase URL ve key'ler olmalı
   - Migration'lar uygulanmış olmalı

## Test Çalıştırma

```bash
# Tüm testler
npm run test:e2e

# Sadece Chromium (daha hızlı)
npx playwright test --project=chromium

# Görsel mod (debug için)
npm run test:e2e:ui

# Headed mod (tarayıcıyı göstererek)
npm run test:e2e:headed
```

## Bilinen Sorunlar

- **Rate Limiting:** Çok fazla test çalıştırırsanız rate limit'e takılabilirsiniz. Rate limit tablosunu temizleyin veya testler arasında bekleme ekleyin.

- **Demo Verisi:** Testler demo TCKN (`12345678901`) kullanıyor. Bu TCKN whitelist'te olmalı.

## Debug İpuçları

1. **Test başarısız olursa:**
   ```bash
   # Screenshot ve video otomatik kaydedilir
   # `test-results/` klasörüne bakın
   ```

2. **Manuel test için:**
   ```bash
   npm run test:e2e:headed
   ```

3. **Sadece bir testi çalıştır:**
   ```bash
   npx playwright test basvuru.spec.ts -g "should display"
   ```
