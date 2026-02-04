# TALPA Web Uygulaması (Next.js) Rehberi

Bu dizin, TALPA üye doğrulama ve başvuru sistemi için geliştirilen **Next.js 14 (App Router)** tabanlı web uygulamasını içerir.

---

## 1. Klasör Yapısı (Özet)

- `app/`
  - `page.tsx` – Ana giriş sayfası
  - `basvuru/` – Üyelik / kampanya başvuru ekranı
  - `login/` – Kullanıcı giriş akışı
  - `admin/` – Yönetim paneli kök dizini
    - `login/` – Admin giriş sayfası
    - `dashboard/` – Özet ve başvurular
    - `campaigns/` – Kampanya yönetimi
    - `whitelist/` – Üye beyaz liste ekranları
  - `api/` – App Router altında kullanılan API route’ları
- `lib/` – Yardımcı fonksiyonlar ve e-posta şablonları
- `scripts/` – Yönetim ve bakım scriptleri (örn. admin oluşturma)
- `public/` – Statik dosyalar (logo, ikonlar vb.)
- `globals.css` – Global stiller

---

## 2. Kurulum ve Çalıştırma

Bu adımlar, yalnızca `web/` dizini için geçerlidir.

### 2.1 Bağımlılıkların Yüklenmesi

```bash
cd member-verification-system/web
npm install
```

### 2.2 Çevre Değişkenleri (`.env.local`)

`web/.env.local` dosyasını oluşturup aşağıdaki değerleri ekleyin (demo için örnek):

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your_anon_key...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your_service_role_key... # Admin scriptleri için gereklidir

TCKN_ENCRYPTION_KEY=demo-icin-ornek-bir-anahtar
SECRET_SALT=DEMO_VEYA_PRODUCTION_SALT

RESEND_API_KEY=re_123...
ADMIN_EMAIL=admin@talpa.org
```

### 2.3 Geliştirme Sunucusunu Başlatma

```bash
npm run dev
```

Tarayıcıda `http://localhost:3000` adresini açarak uygulamayı görüntüleyebilirsiniz.

---

## 3. Yönetici Kullanıcısı Oluşturma

Sisteme ilk admin kullanıcısını eklemek için proje ile birlikte gelen scripti kullanabilirsiniz. Bu işlem `SUPABASE_SERVICE_ROLE_KEY` gerektirir.

1. `.env.local` dosyanızda `SUPABASE_SERVICE_ROLE_KEY` tanımlı olduğundan emin olun.
2. Aşağıdaki komutu çalıştırın:

```bash
node scripts/create-admin-user.js
```

Bu script varsayılan olarak `admin@talpa.com` / `TalpaAdmin123!` bilgilerine sahip bir kullanıcı oluşturur ve veritabanına admin yetkileriyle ekler.

---

## 4. Önemli Sayfalar ve Akışlar

- `/` – Giriş / yönlendirme ekranı
- `/basvuru` – TCKN doğrulama + başvuru formu
- `/login` – Üye giriş / link üzerinden yönlendirme
- `/admin/login` – Yönetici giriş sayfası
- `/admin/dashboard` – Admin dashboard ve başvuru listesi
- `/admin/campaigns` – Kampanya yönetimi
- `/admin/whitelist` – Üye whitelist görüntüleme

---

## 5. Testler

Projede E2E testleri için Playwright kullanılmaktadır.

Testleri çalıştırmak için:

```bash
# Tüm testleri çalıştır
npm run test:e2e

# UI modunda çalıştır (görsel arayüz ile)
npm run test:e2e:ui
```

Detaylı test notları için `e2e/README.md` dosyasına bakabilirsiniz.

---

## 6. Build ve Deploy

Production build almak için:

```bash
npm run build
npm start
```

Veya Vercel/Netlify gibi bir platformda:

- Build komutu: `npm run build`
- Çalışma komutu: `npm start` veya platformun Next.js için önerdiği ayarlar

Production ortamında gerekli tüm environment değişkenlerini platformunuzun panelinden tanımlamayı unutmayın.
