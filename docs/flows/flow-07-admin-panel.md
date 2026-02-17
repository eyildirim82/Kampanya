# Flow 07: Admin Panel

**Amaç:** Yetkili personelin e-posta/şifre ile giriş yapması, başvuruları ve talepleri yönetmesi, kampanya/whitelist/alan kütüphanesi/ayarları yapılandırması ve export/audit işlemleri.

---

## 1. Giriş

| Öğe | Değer |
|-----|--------|
| **Login** | `/admin/login` |
| **Dashboard** | `/admin/dashboard` |
| **Diğer sayfalar** | `/admin/campaigns`, `/admin/interests`, `/admin/settings`, `/admin/whitelist`, `/admin/fields`, `/admin/institutions` vb. |
| **Backend** | `app/admin/actions.ts` (tüm server actions) |
| **Kimlik doğrulama** | Supabase Auth (e-posta/şifre) + `admins` tablosu; cookie: sb-access-token, sb-refresh-token |

Korunan sayfalarda cookie yoksa `redirect('/admin/login')` yapılır.

---

## 2. Admin Giriş (Flow 08a)

### 2.1 Sayfa

- **Rota:** `/admin/login`
- **Bileşen:** `app/admin/login/page.tsx` (client). useActionState(adminLogin, initialState); state.success && state.redirectUrl → router.push(redirectUrl).

**UI:** "Admin Girişi" başlığı, "Sadece yetkili personel erişebilir.", e-posta ve şifre input'ları, "Giriş Yap" butonu. Hata: state.message (form üstünde kırmızı kutu).

### 2.2 adminLogin(prevState, formData)

1. **FormData:** email, password.
2. **Supabase:** getSupabaseClient().auth.signInWithPassword({ email, password }). Hata veya !data.session → "Giriş yapılamadı." + error.message.
3. **Admin kontrolü:** session.access_token ile createClient(anon key, { headers: { Authorization: Bearer ... } }). from('admins').select('id, role').eq('id', session.user.id).single(). adminError veya !adminData → signOut, "Bu alana erişim yetkiniz yok."
4. **Cookie:** sb-access-token, sb-refresh-token set (path /, httpOnly, secure in production, maxAge 604800).
5. Dönüş: { success: true, message: 'Giriş başarılı.', redirectUrl: '/admin/dashboard' }.

---

## 3. Oturum ve Koruma

- **getAdminClient():** cookies() ile sb-access-token, sb-refresh-token okunur. supabase.auth.setSession({ access_token, refresh_token }). Hata (örn. refresh_token_not_found) → cookie'ler silinir, null dönülür.
- **Korunan sayfalar:** Dashboard ve diğer admin sayfalarında ilk işlem genelde getAdminClient() veya doğrudan cookies().get('sb-access-token'); token yoksa redirect('/admin/login').

---

## 4. Dashboard (Flow 08b)

### 4.1 Sayfa yapısı

- **Rota:** `/admin/dashboard`
- **Sayfa:** `app/admin/dashboard/page.tsx` (server). searchParams: campaignId, page (pagination).

**Veri:** Promise.all([ getApplications(campaignId, page), getCampaigns(), getDashboardStats(), getCampaignStats() ]).

### 4.2 Header

- "Yönetim Paneli" başlığı.
- Linkler: Kampanyalar, Talepler, Ayarlar, Whitelist Yönetimi, Alan Kütüphanesi.
- form action={adminLogout}: "Çıkış Yap" butonu.

### 4.3 Özet kartlar (DashboardStats)

- **getDashboardStats:** totalApplications (applications count), activeCampaigns (is_active=true), totalInterests (interests count), pendingReviews (applications status in PENDING, REVIEWING).
- Her biri bir kart: ikon, değer, etiket (Toplam Başvuru, Bekleyen Onay, Aktif Kampanya, Ön Talepler).

### 4.4 Kampanya istatistikleri (CampaignStats)

- **getCampaignStats:** RPC get_campaign_stats veya fallback (campaigns + applications aggregate). Kampanya bazında total, approved, rejected, pending, conversionRate.
- Sadece campaignId seçili değilken (genel görünüm) gösterilir.

### 4.5 Kampanya sekmeleri

- "Tümü" → /admin/dashboard (campaignId yok).
- Her kampanya için link: /admin/dashboard?campaignId={id}. Aktif sekme campaignId ile eşleşir.

### 4.6 Başvuru tablosu (ApplicationTable)

- **Props:** applications, totalCount, currentPage, campaignId, isCreditCampaign.
- **getApplications(campaignId, page, limit 50):** applications tablosu, order created_at desc, campaignId varsa filter; range ile sayfalama. decryptApplications (artık plain tckn) ile döner.
- **UI:** Arama (searchTerm: full_name, tckn, email ile client-side filter). Tablo: satırlar (TCKN, ad, telefon, e-posta, durum, tarih vb.). Durum badge; kredi kampanyası ise ek sütunlar (tutar, müşteri durumu vb.). Silme (deleteApplication), toplu durum güncelleme (bulkUpdateApplicationStatus). Export butonu → modal (tarih aralığı, kampanya, unmask) → Excel veya PDF.

**deleteApplication(id):** getAdminClient(); from('applications').delete().eq('id', id).

**bulkUpdateApplicationStatus(applicationIds, newStatus):** getAdminClient(); applications update status; audit log.

**getAllApplicationsForExport(filters):** campaignId veya (startDate + endDate) zorunlu. applications select, filter; audit_logs insert (EXPORT_APPLICATIONS, row_count, unmasked). decryptApplications; unmask false ise tckn, email, phone, full_name mask (***+son 4 hane). Excel (xlsx) veya PDF (jspdf-autotable) oluşturulur client'ta; veri action'dan döner.

---

## 5. Kampanya Oluşturma ve Düzenleme (Flow 08c)

### 5.1 Yeni Kampanya Oluşturma (/admin/campaigns/new)

**Sayfa:** `app/admin/campaigns/new/page.tsx` (server component). Cookie kontrolü; token yoksa `/admin/login`.

**Veri:** `getActiveInstitutions()` — kurum listesi (select dropdown için).

**Form:** `CampaignForm` bileşeni (mode="create", submitAction=handleCreate).

**CampaignForm alanları:**

- **Kampanya Adı** (name) — zorunlu.
- **Kampanya Kodu** (campaignCode) — opsiyonel; boşsa addan otomatik üretilir (`toCampaignCode(name)`).
- **Kurum** (institutionId) — select, opsiyonel.
- **Açıklama** (description) — textarea, opsiyonel.
- **Başlangıç Tarihi** (startDate) — date, opsiyonel.
- **Bitiş Tarihi** (endDate) — date, opsiyonel.
- **Maksimum Kontenjan** (maxQuota) — number, opsiyonel.

**Gönderim (createCampaignEnhanced):**

1. FormData parse; name zorunlu kontrolü.
2. startDate > endDate kontrolü; hata varsa mesaj dönülür.
3. campaignCode: form'dan gelir veya `toCampaignCode(name)` veya `CAMPAIGN_${Date.now()}`.
4. slug: name'den slugify (küçük harf, tire, trim).
5. Payload: campaign_code, name, slug, description, institution_id, start_date, end_date, max_quota, **status: 'draft'** (her zaman taslak olarak başlar).
6. `campaigns` tablosuna insert; hata varsa mesaj, başarılıysa "Kampanya taslak olarak oluşturuldu."
7. Frontend: toast.success, router.push('/admin/campaigns'), router.refresh().

### 5.2 Kampanya Düzenleme (/admin/campaigns/[id]/edit)

**Sayfa:** `app/admin/campaigns/[id]/edit/page.tsx` (server component). Cookie kontrolü.

**Veri:** `getCampaignById(id)`, `getActiveInstitutions()`.

**Form:** `CampaignForm` (mode="edit", defaultValues=campaign, submitAction=handleUpdate).

**Gönderim (updateCampaignEnhanced):**

1. FormData parse; name zorunlu.
2. Payload: name, campaign_code (form veya toCampaignCode), institution_id, description, start_date, end_date, max_quota, **status** (form'dan), updated_at.
3. `campaigns` tablosunda update; başarılıysa "Kampanya güncellendi."
4. Frontend: toast.success, router.push('/admin/campaigns').

### 5.3 Kampanya Durumu Yönetimi

- **toggleCampaignStatus(id, isActive):** `is_active` alanını günceller.
- **pauseCampaign, resumeCampaign, closeCampaign, startCampaign:** Durum değiştirme helper'ları (status alanı veya is_active üzerinden).

---

## 6. Mail Yönetimi (Flow 08d)

### 6.1 Mail Şablonları (/admin/settings → Mail Şablonları sekmesi)

**Bileşen:** `EmailConfig` (`app/admin/components/EmailConfig.tsx`).

**Başlangıç:**

- `getCampaigns()` ile kampanya listesi yüklenir.
- Varsayılan olarak ilk kampanya seçilir veya prop ile `campaignId` gelirse o kullanılır.
- `getEmailConfigs(selectedCampaignId)` ile o kampanyanın e-posta konfigürasyonları yüklenir (`email_configurations` tablosu).

**Şablon listesi:**

- Her şablon: recipient_type (applicant/admin/custom), recipient_email (custom ise), subject_template, body_template, trigger_event, is_active.
- "Düzenle" butonu → editing state'e geçer.
- "Sil" butonu → `deleteEmailConfig(id)` → confirm → silme → listeyi yeniden yükler.

**Şablon düzenleme/oluşturma:**

- Form: recipientType (select), recipientEmail (custom ise), triggerEvent (default: SUBMISSION), subjectTemplate (textarea), bodyTemplate (textarea), isActive (checkbox).
- **Template tag'leri:** {{name}}, {{email}}, {{tckn}}, {{phone}}, {{address}}, {{date}} vb. (kampanya türüne göre farklı tag'ler; kredi kampanyası için ek tag'ler).
- **Live preview:** subjectTemplate ve bodyTemplate değiştiğinde demo payload ile derlenmiş önizleme gösterilir (`compileTemplate`).
- **Hazır şablon yükle:** Buton ile kampanya türüne göre (kredi/genel) hazır şablon yüklenir.
- **Kaydet:** `saveEmailConfig(null, formData)` — id varsa update, yoksa insert. campaignId FormData'ya eklenir (yoksa varsayılan kampanya kullanılır). Başarılıysa "Kaydedildi.", editing null, liste yeniden yüklenir.

**getEmailConfigs(campaignId?):**

- campaignId yoksa `ensureDefaultCampaign()` ile varsayılan kampanya bulunur.
- `email_configurations` tablosundan `campaign_id` ile filtreleme, `created_at` artan sıralama.

**saveEmailConfig(prevState, formData):**

- FormData: id (varsa update), campaignId, recipientType, recipientEmail, triggerEvent, subjectTemplate, bodyTemplate, isActive.
- campaignId yoksa varsayılan kampanya kullanılır.
- Payload oluşturulur; id varsa update, yoksa insert.
- Başarılı: `{ success: true, message: 'Kaydedildi.' }`.

**deleteEmailConfig(id):**

- `email_configurations` tablosundan silme; başarılı: `{ success: true }`.

### 6.2 Test E-postası Gönderme (/admin/settings → Test Gönderimi sekmesi)

**Bileşen:** `TemplateTester` (`app/admin/components/TemplateTester.tsx`).

**Akış:**

1. **Kampanya seçimi:** `getCampaigns()` → dropdown; seçilen kampanya için `getEmailConfigs(campaignId)` → şablon listesi.
2. **Şablon seçimi:** Dropdown'dan şablon seçilir; seçilen şablonun subject_template ve body_template'i demo payload ile derlenir (`compileTemplate`) → önizleme gösterilir.
3. **Test alıcısı:** E-posta input'u (zorunlu).
4. **Gönder:** `sendTestEmail({ campaignId, templateId, testRecipient })`.

**sendTestEmail:**

1. `getEmailConfigs(campaignId)` ile şablon bulunur (templateId ile).
2. Şablon yoksa hata dönülür.
3. Template derlenir (`compileTemplate`); demo payload kullanılır.
4. `sendTransactionalEmail({ to: testRecipient, subject: compiledSubject, html: compiledBody, senderName: 'TALPA Test', data: demoPayload })`.
5. Başarılı: `{ success: true, message: 'Test e-postası gönderildi.' }`.
6. Frontend: toast.success, statusMessage güncellenir.

**Demo payload:** name, full_name, email, tckn, phone, address, city, district, deliveryMethod, requestedAmount, isDenizbankCustomer, consents, date.

---

## 7. Diğer Admin Sayfaları

Aşağıdaki admin sayfaları için detaylı akış dokümantasyonu mevcuttur:

- **Flow 08:** Kampanya Listesi ve Detay Görüntüleme (`/admin/campaigns`, `/admin/campaigns/[id]`) - Durum değiştirme, silme, sayfa içeriği/form şeması/e-posta ayarları düzenleme
- **Flow 09:** Talepler Yönetimi (`/admin/interests`) - Talep listesi, filtreleme, arama, silme, export
- **Flow 10:** Whitelist Yönetimi (`/admin/whitelist`) - CSV upload, manuel üye ekleme, durum yönetimi
- **Flow 11:** Alan Kütüphanesi Yönetimi (`/admin/fields`) - Form alanı şablonları oluşturma/düzenleme/silme
- **Flow 12:** Kurum Yönetimi (`/admin/institutions`) - Kurum oluşturma/düzenleme/silme

Detaylı akışlar için ilgili flow dokümanlarına bakınız.

---

## 8. Çıkış (adminLogout)

- **Action:** adminLogout(). cookies().delete('sb-access-token'), delete('sb-refresh-token'), redirect('/admin/login').
- Dashboard header'daki "Çıkış Yap" formu bu action'ı tetikler.

---

## 9. Kullanılan dosyalar (seçili)

| Dosya | Rol |
|-------|-----|
| app/admin/login/page.tsx | Admin login sayfası |
| app/admin/actions.ts | adminLogin, getAdminClient, getApplications, getDashboardStats, getCampaignStats, getAllApplicationsForExport, deleteApplication, bulkUpdateApplicationStatus, getCampaigns, getInterests, whitelist/campaign/email/field/institution actions, adminLogout |
| app/admin/dashboard/page.tsx | Dashboard layout, stats, sekmeler, ApplicationTable |
| app/admin/components/ApplicationTable.tsx | Tablo, arama, sayfalama, export modal, bulk update, silme |
| app/admin/components/DashboardStats.tsx | Özet kartlar |
| app/admin/components/CampaignStats.tsx | Kampanya bazlı istatistikler |
| app/admin/campaigns/new/page.tsx | Yeni kampanya sayfası |
| app/admin/campaigns/[id]/edit/page.tsx | Kampanya düzenleme sayfası |
| app/admin/campaigns/campaign-form.tsx | Kampanya form bileşeni (create/edit) |
| app/admin/settings/page.tsx | Ayarlar sayfası (kampanyalar, mail şablonları, test) |
| app/admin/components/EmailConfig.tsx | Mail şablon yönetimi bileşeni |
| app/admin/components/TemplateTester.tsx | Test e-postası gönderme bileşeni |
| app/admin/components/CampaignManager.tsx | Kampanya listesi ve durum yönetimi |

---

## 10. Güvenlik ve denetim

- **Admin yetkisi:** signInWithPassword sonrası admins tablosunda kayıt yoksa giriş reddedilir.
- **Export:** Kampanya veya tarih aralığı zorunlu; audit_logs ile export kaydı tutulur; unmask seçeneği ile PII maskelenebilir.
- **Cookie:** httpOnly, production'da secure; refresh token ile oturum yenilenir.

---

## 11. İlgili akışlar

- **Flow 02, 03:** Oluşan başvurular dashboard'da listelenir, export edilir.
- **Flow 04:** Talepler admin/interests'te listelenir (detaylı akış Flow 09'da).
- **Flow 05:** Sorgulama applications tablosunu kullanır; admin tarafında aynı veri yönetilir.
- **Flow 08:** Kampanya listesi ve detay görüntüleme/düzenleme akışı.
- **Flow 09:** Talepler yönetimi detaylı akışı.
- **Flow 10:** Whitelist yönetimi detaylı akışı.
- **Flow 11:** Alan kütüphanesi yönetimi detaylı akışı.
- **Flow 12:** Kurum yönetimi detaylı akışı.
