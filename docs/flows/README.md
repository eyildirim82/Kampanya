# Akış (Flow) Raporları – İndeks

Bu klasörde TALPA x DenizBank Kampanya uygulamasındaki **tüm kullanıcı ve yönetici akışları** ayrı ayrı, ayrıntılı raporlar halinde anlatılmaktadır. Her doküman tek bir flow’a odaklanır: giriş noktası, adımlar, backend/server actions, hata durumları ve ilgili diğer akışlar.

---

## Public (Kullanıcı) Akışları

| No | Dosya | Akış | Kısa açıklama |
|----|--------|------|----------------|
| 01 | [flow-01-ana-sayfa-kampanya.md](./flow-01-ana-sayfa-kampanya.md) | Ana sayfa ve kampanya listesi | `/` sayfası, aktif kampanyaların listelenmesi, `/kampanya/[slug]` linkine geçiş |
| 02 | [flow-02-genel-kampanya-basvuru.md](./flow-02-genel-kampanya-basvuru.md) | Kampanya başvuru | `/kampanya/[slug]` → TCKN (CampaignFormWrapper) → DynamicForm → submitDynamicApplication |
| 03 | [flow-03-basvuru-sayfasi.md](./flow-03-basvuru-sayfasi.md) | Başvuru sayfası | `/basvuru`, `/basvuru/[slug]` → TCKN doğrula → ApplicationForm (sabit + extra_fields) → submitApplication |
| 04 | [flow-04-talep.md](./flow-04-talep.md) | Ön talep formu | `/talep/[slug]` → InterestForm (tek sayfa, TCKN formda) → submitInterest → interests tablosu |
| 05 | [flow-05-sorgula.md](./flow-05-sorgula.md) | Başvuru sorgulama | `/sorgula` → TCKN + telefon → checkApplicationStatus → get_application_status_by_tckn_phone → sonuç listesi |
| 06 | [flow-06-login-basvuru.md](./flow-06-login-basvuru.md) | Public login | `/login` → TCKN → /api/auth/check → OTP veya REDIRECT_FORM → /api/auth/verify → /basvuru?tckn=... |

---

## Admin Akışları

| No | Dosya | Akış | Kısa açıklama |
|----|--------|------|----------------|
| 07 | [flow-07-admin-panel.md](./flow-07-admin-panel.md) | Admin panel genel | Giriş, dashboard (başvurular, istatistikler, export, toplu işlem), kampanya oluşturma/düzenleme, mail yönetimi, çıkış |
| 08 | [flow-08-admin-kampanya-liste-detay.md](./flow-08-admin-kampanya-liste-detay.md) | Kampanya listesi ve detay | `/admin/campaigns` → liste görüntüleme, durum değiştirme, silme; `/admin/campaigns/[id]` → detay düzenleme (sayfa içeriği, form şeması, e-posta ayarları) |
| 09 | [flow-09-admin-talepler.md](./flow-09-admin-talepler.md) | Talepler yönetimi | `/admin/interests` → talep listesi, kampanya filtresi, arama, silme, Excel/PDF export |
| 10 | [flow-10-admin-whitelist.md](./flow-10-admin-whitelist.md) | Whitelist yönetimi | `/admin/whitelist` → CSV upload (whitelist/borçlu), manuel üye ekleme, durum toggle, silme |
| 11 | [flow-11-admin-alan-kutuphanesi.md](./flow-11-admin-alan-kutuphanesi.md) | Alan kütüphanesi | `/admin/fields` → form alanı şablonları oluşturma/düzenleme/silme (FormBuilder'da kullanılır) |
| 12 | [flow-12-admin-kurumlar.md](./flow-12-admin-kurumlar.md) | Kurum yönetimi | `/admin/institutions` → kurum oluşturma/düzenleme/silme (kampanyalara atanabilir) |

---

## Akışlar arası ilişki (özet)

- **01** → Kullanıcı kampanya seçer → **02** (kampanya başvuru).
- **02, 03** → Başvuru tamamlanır → **05** (sorgula) ile durum öğrenilir.
- **06** (login) → Başvuru formu sayfasına yönlendirir → **03**.
- **04** (talep) → interests tablosu; **05** sadece applications tablosunu kullanır.
- **07** (admin panel genel) → Giriş, dashboard, kampanya oluşturma, mail yönetimi.
- **08** (kampanya liste/detay) → Kampanya durum yönetimi, form şeması düzenleme; **11** (alan kütüphanesi) şablonları kullanılır.
- **09** (talepler) → **04** akışında oluşturulan talepleri listeler ve yönetir.
- **10** (whitelist) → **02, 03, 04** akışlarındaki `verify_member` RPC'si bu veriyi kullanır.
- **11** (alan kütüphanesi) → **08** akışındaki FormBuilder'da şablonlar kullanılır.
- **12** (kurumlar) → **07, 08** akışlarında kampanyalara kurum atanır.

---

## Kullanım

- Geliştirme ve test sırasında belirli bir akışın adımlarını takip etmek için ilgili flow dosyasını açın.
- Yeni özellik veya değişiklik planlarken hangi flow’ların etkileneceğini bu indeks ve her rapordaki "İlgili akışlar" bölümünden takip edebilirsiniz.
- Onboarding veya dokümantasyon için tek tek flow’lar bağımsız okunabilir.
