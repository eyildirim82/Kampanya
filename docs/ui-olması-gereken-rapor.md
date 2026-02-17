# TALPA x DenizBank Kampanya – Olması Gereken UI Raporu

**Proje:** Kampanya başvuru ve yönetim sistemi (TALPA – DenizBank işbirliği)  
**Rapor tarihi:** Şubat 2026  
**Kapsam:** Tüm kullanıcı arayüzü (public + admin), tasarım sistemi, erişilebilirlik ve UX standartları.

---

## 1. Proje Özeti ve Hedef Kitle

| Alan | Açıklama |
|------|----------|
| **Ürün** | TALPA üyelerine özel kampanya başvuruları (kart, kredi, genel kampanyalar), başvuru sorgulama, admin yönetim paneli |
| **Hedef kitle (public)** | TALPA üyeleri (pilotlar); mobil ve masaüstü kullanım |
| **Hedef kitle (admin)** | İç personel; masaüstü odaklı, veri yoğun ekranlar |
| **Marka** | TALPA (lacivert #002855), DenizBank (kırmızı #E30613); kurumsal, güvenilir görünüm |

Bu rapor, **olması gereken** UI’ı tarif eder: mevcut durum özeti + standartlar + eksikler + öneriler.

---

## 2. Mevcut UI Yapısı (Özet)

### 2.1 Sayfa Haritası

| Rota | Açıklama | Kullanıcı |
|------|----------|-----------|
| `/` | Ana sayfa, kampanya kartları grid | Public |
| `/kampanya/[slug]` | Kampanya detay + form (genel veya kredi) | Public |
| `/kredi` | Kredi kampanyasına redirect | Public |
| `/basvuru`, `/basvuru/[slug]` | Başvuru formu | Public |
| `/talep/[slug]` | Talep formu | Public |
| `/sorgula` | TCKN + telefon ile başvuru sorgulama | Public |
| `/login` | TCKN ile başvuru sistemi girişi | Public |
| `/admin/login` | Admin e-posta/şifre girişi | Admin |
| `/admin/dashboard` | Başvurular tablosu, istatistikler, kampanya sekmeleri | Admin |
| `/admin/campaigns`, `/admin/interests`, `/admin/settings`, `/admin/whitelist`, `/admin/fields` | Yönetim sayfaları | Admin |

### 2.2 Bileşen Kütüphanesi (Mevcut)

- **Button:** primary, secondary, ghost, danger; sm/md/lg; loading, left/right icon
- **Card:** elevated, outlined, glass; padding none/sm/md/lg; CardHeader
- **Input:** label, error, helperText, left/right icon, multiline
- **Alert:** variant (destructive vb.)
- **Badge:** durum göstergeleri
- **Modal, Pagination:** listeleme ve onay akışları için

### 2.3 Tasarım Sistemi (globals.css)

- **Renk:** TALPA lacivert paleti (`--talpa-navy-*`), DenizBank kırmızı (`--denizbank-red-500: #E30613`), nötr gri, semantic (success, warning, error, info)
- **Tipografi:** Geist Sans/Mono, type scale (--text-xs … --text-6xl), line-height
- **Spacing:** --space-1 … --space-24
- **Gölge / radius:** --shadow-*, --radius-sm … --radius-full
- **Animasyon:** fadeIn, scaleIn, slideUp, shimmer, pulse-glow, hover-lift; duration/ease token’ları
- **Utility:** .glass, .gradient-text, .animated-gradient, focus-visible

Mevcut yapı sağlam; eksikler tutarlı kullanım ve bazı sayfa/akış detaylarında.

---

## 3. Olması Gereken UI – Genel İlkeler

### 3.1 Marka ve Görsel Dil

- **Birincil renk:** #002855 (TALPA lacivert) – CTA, başlıklar, header, primary butonlar
- **Vurgu renk:** #E30613 (DenizBank kırmızı) – kampanya vurguları (örn. faiz oranı), danger aksiyonlar, önemli badge’ler
- **Arka plan:** Açık gri / hafif mavi-gri gradyan (mevcut body gradient ile uyumlu)
- **Kartlar:** Beyaz, rounded-2xl, shadow-lg; hover’da hafif lift (hover-lift)
- **Tutarlılık:** Tüm public sayfalarda aynı header/footer yapısı; admin’de tek sidebar/header teması

### 3.2 Tipografi

- **Başlıklar:** Sadece Geist (--font-sans); bold/semibold; renk gray-900 veya #002855
- **Gövde metni:** 16px taban (okunabilirlik); gray-700 / gray-800
- **Küçük metin / yardım:** 14px; gray-600
- **Sayfa başlığı:** Tek bir H1 sayfa başına; SEO ve erişilebilirlik için

### 3.3 Spacing ve Layout

- **Container:** max-w-7xl (veya max-w-6xl form sayfalarında) mx-auto, px-4 sm:px-6 lg:px-8
- **Bölüm arası:** Tutarlı py-8 / py-12; kart içi padding Card bileşeninin padding prop’u ile (sm/md/lg)
- **Form:** Label–input gap (mb-2 label, alanlar arası space-y-4 veya space-y-6)

### 3.4 Etkileşim ve Geri Bildirim

- **Butonlar:** Loading state (spinner + “Yükleniyor…”); disabled durumda net görünüm
- **Form:** Inline validasyon mesajları (Input error/helperText); submit sonrası toast (sonner) + gerekirse sayfa üstü Alert
- **Kritik işlemler:** Onay modal’ı (silme, toplu işlem)
- **Başarı:** Net başarı mesajı + opsiyonel “Yeni başvuru” / “Ana sayfa” CTA

### 3.5 Erişilebilirlik (A11y)

- **Odak:** Tüm etkileşimli öğeler focus-visible ile çerçeveli (mevcut :focus-visible kuralı korunmalı)
- **Label:** Her input’ta görünür veya sr-only label; `htmlFor` / `id` eşleşmeli
- **Hata özeti:** Form hatalarında sayfa başında `role="alert"` özeti (örn. Alert bileşeni)
- **Kontrast:** Metin/arka plan oranı en az 4.5:1 (normal metin), 3:1 büyük metin
- **Semantik:** header, main, footer, nav; buton vs link kullanımı doğru (form submit buton, gezinme link)

### 3.6 Responsive

- **Mobile first:** Tek sütun; CTA’lar full-width veya rahat dokunma alanı (min 44px)
- **Kampanya kartları:** 1 sütun (mobil), 2–3 sütun (md/lg)
- **Tablolar (admin):** Yatay kaydırma veya kart görünümü; başlıklar kısaltılmamalı (aria-label ile tam metin)
- **Form:** Tek sütun mobil; iki sütun (açıklama + form) sadece lg’de

---

## 4. Sayfa Bazlı Olması Gereken UI

### 4.1 Ana Sayfa (`/`)

- **Hero:** Lacivert arka plan (#002855), beyaz metin; TALPA + “Üyelerimize özel” mesajı; tek H1
- **Kampanya kartları:** Görsel + başlık + kısa açıklama + tek CTA (“Başvuru Yap”); hover’da shadow ve hafif translate
- **Kampanya yok:** İkon + “Aktif kampanya yok” mesajı + bilgilendirici metin (mevcut yapı uygun)
- **Footer:** Kurumsal metin; layout’ta tekrarlanan footer’ın tek bir yerden (layout veya shared component) gelmesi tercih edilir

### 4.2 Kampanya Detay (`/kampanya/[slug]`)

- **Genel kampanya:** Hero (banner varsa overlay); sol/üstte açıklama + özellikler; sağ/altta “Başvuru Formu” kartı (sticky lg’de)
- **Kredi kampanyası:** Üstte kampanya başlığı + faiz oranı vurgusu (%3,35 kutusu); örnek ödeme tablosu (okunabilir, responsive tablo veya kart listesi mobilde); altında tek sütun form
- **Form:** Aşamalı ise (TCKN doğrula → form) net adım göstergesi; butonlar “Devam”, “Başvuru Yap” gibi net metinlerle

### 4.3 Başvuru Formları (basvuru, kampanya form, kredi formu)

- **Ortak:** Label + placeholder + hata mesajı (Input/Alert); zorunlu alanlar * ile veya “Zorunlu” etiketi
- **TCKN:** 11 karakter, sadece rakam; mask/format kullanılıyorsa kullanıcıya açık
- **Telefon:** 5XX XXX XX XX formatı; mask mevcut, tutarlı kullanılmalı
- **Onay kutuları:** Metinler KVKK/açık rıza ile uyumlu; “Kabul ediyorum” net
- **Teslimat/Seçenekler:** Radio veya kart seçici; seçili durum net (border/arka plan)
- **Gönder sonrası:** Başarı mesajı + “Başvuru no” varsa göster; “Ana sayfaya dön” / “Yeni başvuru” butonu

### 4.4 Sorgula (`/sorgula`)

- **Tek odak:** TCKN + telefon + “Sorgula” butonu; sonuç aynı sayfada (durum badge’i + kısa açıklama)
- **Durum etiketleri:** Onaylandı (yeşil), Reddedildi (kırmızı), Beklemede (sarı) – mevcut statusToVariant mantığı korunmalı
- **Hata:** “Kayıt bulunamadı” net mesaj; tekrar deneme imkânı

### 4.5 Login Sayfaları

- **Public login:** Başlık “Başvuru Sistemi”, alt metin “TCKN ile giriş”; form merkezi, kart içinde
- **Admin login:** Başlık “Admin Girişi”; e-posta/şifre; hata mesajı form üstünde (Alert veya inline); “Giriş Yap” butonu primary
- **Ortak:** Giriş sonrası yönlendirme; “Şifremi unuttum” linki admin’de varsa belirgin

### 4.6 Admin Panel

- **Header:** Sabit; “Yönetim Paneli” başlığı; Kampanyalar, Talepler, Ayarlar, Whitelist, Alan Kütüphanesi linkleri; Çıkış butonu
- **Dashboard:** Özet kartlar (Toplam Başvuru, Bekleyen Onay, Aktif Kampanya, Ön Talepler); kampanya sekmeleri; başvuru tablosu
- **Tablo:** Sıralama, sayfalama (Pagination), arama (isim/TCKN/e-posta); durum badge; toplu işlem (seçim + aksiyon); Excel/PDF export modal’ı
- **Tutarlılık:** Tüm admin sayfalarında aynı header; ikincil sayfalar (kampanya düzenle, ayarlar) aynı container ve kart stilinde

### 4.7 Hata ve Bulunamayan Sayfa

- **error.tsx:** “Bir hata oluştu” mesajı; “Tekrar Dene” + “Ana Sayfa” butonları (mevcut yapı uygun)
- **not-found.tsx:** “Sayfa bulunamadı” + “Ana Sayfa” butonu; opsiyonel arama veya kampanya listesi linki

---

## 5. Bileşen Kullanım Kuralları

| Bileşen | Kullanım |
|---------|----------|
| **Button** | Primary: tek ana CTA (Başvuru Yap, Gönder, Giriş Yap). Secondary: ikincil aksiyon (İptal, Ana Sayfa). Danger: silme/reddetme. Ghost: üçüncül (tab, link benzeri). |
| **Card** | İçerik grupları (kampanya kartı, form konteyneri, istatistik kartı); elevated varsayılan. |
| **Input** | Her zaman label; hata durumunda error; opsiyonel helperText. |
| **Alert** | Form üstü hata özeti, sayfa düzeyi bilgi/hata. |
| **Badge** | Durum (pending, approved, rejected); renk semantiği tutarlı. |
| **Modal** | Onay (silme, toplu işlem), filtre (export); kapatma X ve “İptal” net. |
| **Pagination** | Liste sayfalama; mevcut sayfa vurgulu, “Önceki”/“Sonraki” erişilebilir. |

---

## 6. Eksikler ve İyileştirme Önerileri

### 6.1 Yapısal / Tutarlılık

- **Footer çiftliği:** Hem `layout.tsx` hem `page.tsx` (ana sayfa) içinde footer var; tek bir global footer (layout) kullanılmalı, ana sayfadaki tekrarlanan footer kaldırılmalı.
- **Public header:** Ana sayfa ve kampanya sayfalarında ortak bir header (logo, “Kampanyalar”, “Sorgula” linkleri) yok; eklenirse gezinme ve marka tutarlılığı artar.
- **Admin form bileşenleri:** Admin login’de native `input` kullanılıyor; `Input` bileşeni ile değiştirilirse label, hata ve focus stili tutarlı olur.

### 6.2 Erişilebilirlik

- **Form hata özeti:** Büyük formlarda submit sonrası sayfa başında `role="alert"` ile hata özeti (örn. Alert) eklenmeli; mevcut toast yanında.
- **Tablo:** Admin tabloda `scope="col"` ve uygun başlık hücreleri; mobilde `aria-label` ile tam başlık.
- **Loading:** Yükleme durumlarında `aria-live="polite"` veya `aria-busy="true"` kullanımı düşünülmeli.

### 6.3 Responsive ve Görsel

- **Kredi ödeme tablosu:** Küçük ekranda yatay scroll yerine kart/liste görünümü veya sadeleştirilmiş sütunlar düşünülebilir.
- **Admin tablo:** Çok sütunlu yapıda mobilde kart listesi veya “detay” sayfası ile sütun sayısı azaltılabilir.

### 6.4 Dark Mode

- **globals.css:** `prefers-color-scheme: dark` ile bazı CSS değişkenleri güncellenmiş; bileşenlerde dark sınıfları kullanılmıyor. Tam dark mode istenmiyorsa bu kural kaldırılabilir veya yalnızca admin’de “dark tema” seçeneği planlanabilir.

### 6.5 Performans ve Algı

- **Kampanya görselleri:** `next/image` kullanımı (öncelik, boyut, blur placeholder) ana sayfa ve kampanya detayda tutarlı yapılabilir; harici URL’ler için `domains` ayarı gerekebilir.
- **Form gönderimi:** Butonda loading state tüm formlarda tutarlı (mevcut Button isLoading iyi); ağ hatasında “Tekrar dene” seçeneği net olmalı.

---

## 7. Öncelik Sırası

| Öncelik | Öğe | Açıklama |
|---------|-----|----------|
| P1 | Footer tekilleştirme | Layout’ta tek footer; ana sayfadaki tekrarın kaldırılması |
| P1 | Admin login Input bileşeni | Native input → Input; label ve hata tutarlılığı |
| P2 | Public header (opsiyonel) | Logo + Kampanyalar / Sorgula linkleri |
| P2 | Form hata özeti (role="alert") | Büyük formlarda submit hatalarında sayfa üstü özet |
| P2 | Kredi tablosu mobil | Küçük ekranda kart veya sadeleştirilmiş görünüm |
| P3 | Tablo a11y | scope, aria-label; admin tablo |
| P3 | Dark mode netleştirme | Kullanılacaksa bileşenlerde destek; kullanılmayacaksa CSS kuralı kaldırma |

---

## 8. Sonuç

Mevcut proje, **TALPA x DenizBank** markasına uygun bir tasarım sistemi (renk, tipografi, bileşenler) ve net sayfa yapısına sahip. **Olması gereken UI** için:

1. **Tutarlılık:** Tüm sayfalarda aynı layout parçaları (header/footer), aynı bileşenler (Button, Input, Card, Alert) ve aynı etkileşim kalıpları (loading, hata, başarı) kullanılmalı.
2. **Erişilebilirlik:** Label–input eşleşmesi, focus-visible, form hata özeti ve tablo semantiği standartlara çekilmeli.
3. **Responsive:** Özellikle kredi tablosu ve admin tablo mobilde iyileştirilmeli.
4. **Küçük düzeltmeler:** Çift footer, admin login input’ları ve (isteğe bağlı) public header ile deneyim netleştirilmelidir.

Bu rapor, hem mevcut durumu hem de hedef UI’ı tek belgede toplar; geliştirme ve tasarım kararları için referans olarak kullanılabilir.
