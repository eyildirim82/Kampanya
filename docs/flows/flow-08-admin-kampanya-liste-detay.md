# Flow 08: Admin Kampanya Listesi ve Detay Görüntüleme

**Amaç:** Admin'in kampanya listesini görüntülemesi, kampanya durumunu değiştirmesi, kampanyaları silmesi ve kampanya detaylarını (sayfa içeriği, form şeması, e-posta ayarları) düzenlemesi.

---

## 1. Giriş

| Öğe | Değer |
|-----|--------|
| **Rotolar** | `/admin/campaigns` (liste), `/admin/campaigns/[id]` (detay/düzenleme) |
| **Sayfalar** | `app/admin/campaigns/page.tsx` (server), `app/admin/campaigns/[id]/page.tsx` (client) |
| **Bileşenler** | `app/admin/campaigns/campaign-list-client.tsx`, `components/FormBuilder.tsx`, `app/admin/components/EmailConfig.tsx` |
| **Backend** | `app/admin/actions.ts`: getCampaigns, getCampaignById, changeCampaignStatus, deleteCampaign; `app/actions.ts`: updateCampaignConfig |
| **Kimlik doğrulama** | Cookie kontrolü (sb-access-token); yoksa `/admin/login` |

---

## 2. Ön koşullar

- Admin girişi yapılmış olmalı (cookie kontrolü).
- Kampanya listesi için: Herhangi bir ek veri gerekmez.
- Kampanya detay için: Geçerli bir kampanya `id` parametresi gerekir.

---

## 3. Kampanya Listesi Akışı (`/admin/campaigns`)

### 3.1 Sayfa yüklenmesi

1. Kullanıcı `/admin/campaigns` adresine gider.
2. Server component (`app/admin/campaigns/page.tsx`):
   - Cookie kontrolü: `cookies().get('sb-access-token')`; yoksa `redirect('/admin/login')`.
   - `getCampaigns()` ile tüm kampanyalar çekilir (adminSupabase ile).
   - `CampaignListClient` bileşenine campaigns prop'u geçilir.

**getCampaigns():**

- `getAdminClient()` ile admin Supabase client.
- `campaigns` tablosundan select; institutions join (kurum bilgisi için).
- Dönüş: Campaign[] (id, campaign_code, name, slug, description, status, is_active, max_quota, start_date, end_date, institution_id, created_at, application_count, institutions).

**getCampaignsWithDetails():**

- `getAdminClient()` ile admin Supabase client.
- `campaigns` tablosundan select; institutions join. Ardından kampanya başına `applications` tablosundan başvuru sayısı hesaplanır (`application_count`).
- Dönüş: getCampaigns ile aynı yapı, ek olarak hesaplanmış `application_count` alanı içerir.

### 3.2 Kampanya listesi görüntüleme (CampaignListClient)

**UI:**

- **Boş durum:** Kampanya yoksa ikon + "Henüz kampanya yok" + "Yeni Kampanya" butonu (`/admin/campaigns/new`).
- **Tablo:** Sütunlar: Kampanya (ad + kod), Kurum, Durum (badge), Başvuru (sayı / max_quota), Tarih Aralığı, Aksiyonlar.

**Durum badge'leri (STATUS_CONFIG):**

- draft: "Taslak" (gri).
- active: "Aktif" (yeşil).
- paused: "Duraklatılmış" (sarı).
- closed: "Kapatılmış" (kırmızı).

**Geçerli durum geçişleri (VALID_TRANSITIONS):**

- draft → [active].
- active → [paused, closed].
- paused → [active, closed].
- closed → [] (geçiş yok).

Her kampanya için geçerli geçişler buton olarak gösterilir.

### 3.3 Durum değiştirme

**Kullanıcı:**

1. Durum butonuna tıklar (örn. "Aktif", "Duraklatılmış").

**Frontend:**

1. `handleStatusChange(campaignId, newStatus)`:
   - `confirm()` ile onay: "Kampanya durumunu '{yeni durum}' olarak değiştirmek istiyor musunuz?".
   - Onaylanmazsa return.
   - `startTransition` ile `changeCampaignStatus(campaignId, newStatus)` çağrılır; `isPending = true` (tablo opacity-50).

**Backend – changeCampaignStatus:**

1. `getAdminClient()`; yoksa `{ success: false, message: 'Auth error' }`.
2. RPC: `transition_campaign_status(p_campaign_id, p_new_status)`.
   - RPC içinde geçiş kuralları kontrol edilir; geçersizse hata döner.
   - `status` ve `is_active` güncellenir (status 'active' ise is_active=true, diğerleri false).
3. Dönüş: `{ success: boolean, message: string, old_status?, new_status? }`.

**Frontend – sonuç:**

- Başarı: toast.success(message), `router.refresh()` (liste yenilenir).
- Hata: toast.error(message).

### 3.4 Silme

**Kullanıcı:**

1. "Sil" butonuna tıklar (sadece draft kampanyalar için görünür).

**Frontend:**

1. `handleDelete(campaignId, campaignName)`:
   - `confirm()`: "`{campaignName}` kampanyasını silmek istiyor musunuz? Bu işlem geri alınamaz.".
   - Onaylanmazsa return.
   - `startTransition` ile `deleteCampaign(campaignId)` çağrılır.

**Backend – deleteCampaign:**

1. `getAdminClient()`; yoksa `{ success: false, message: 'Auth error' }`.
2. `campaigns` tablosundan delete `.eq('id', id)`.
3. Hata varsa mesaj; başarılıysa `{ success: true }`.

**Frontend – sonuç:**

- Başarı: toast.success('Kampanya silindi.'), `router.refresh()`.
- Hata: toast.error(message).

### 3.5 Diğer aksiyonlar

- **"Düzenle" butonu:** Link `/admin/campaigns/${campaign.id}` → kampanya detay sayfası.
- **"Yeni Kampanya" butonu (header):** Link `/admin/campaigns/new` → Flow 07'deki kampanya oluşturma akışı.

---

## 4. Kampanya Detay Görüntüleme/Düzenleme (`/admin/campaigns/[id]`)

### 4.1 Sayfa yüklenmesi

1. Kullanıcı `/admin/campaigns/[id]` adresine gider.
2. Client component (`app/admin/campaigns/[id]/page.tsx`):
   - `params` Promise'den `id` çözümlenir (`useEffect` ile `setCampaignId`).
   - `campaignId` varsa `getCampaignById(campaignId)` ile kampanya verisi yüklenir; `isLoading = true`.

**getCampaignById(id):**

- `getAdminClient()` veya fallback anon client.
- `campaigns` tablosundan `.eq('id', id).single()`.
- Hata varsa null; başarılıysa Campaign objesi.

**Frontend – veri yükleme:**

1. `loadCampaign()`:
   - `getCampaignById(campaignId)` çağrılır.
   - Veri varsa state'ler doldurulur:
     - Temel: slug, title (name veya title), description, isActive (is_active).
     - Page content: `page_content` JSON parse → heroTitle, heroSubtitle, bannerImage, longDescription, features array.
     - Form schema: `form_schema` → formFields array, formSchemaJson string.
   - Veri yoksa: toast.error('Kampanya bulunamadı.'), `router.push('/admin/campaigns')`.
   - `isLoading = false`.

### 4.2 Tab yapısı

Üç sekme: **Detaylar**, **Başvuru Formu**, **E-posta Ayarları**.

**Tab geçişi:**

- `activeTab` state ('details' | 'form' | 'email').
- Butonlara tıklanınca `setActiveTab` ile değişir; aktif tab border-[#002855] ile vurgulanır.

### 4.3 Detaylar sekmesi

**Temel bilgiler:**

- **Kampanya Başlığı:** Input (title state).
- **Slug:** Input (slug state); önünde "/kampanya/" prefix gösterilir.
- **Kısa Açıklama:** Textarea (description state).
- **Kampanya Aktif:** Checkbox (isActive state) — disabled, readOnly; "Durum değiştirmek için Kampanya Listesi sayfasını kullanınız" etiketi.

**Sayfa içeriği:**

- **Toggle:** "Gelişmiş JSON Editörü" / "Form Görünümüne Dön" (`showRawContentJson` state).

**Form görünümü (`showRawContentJson === false`):**

- **Banner Görsel Linki:** Input (bannerImage); URL girilince önizleme gösterilir.
- **Hero Başlık:** Input (heroTitle).
- **Hero Alt Başlık:** Input (heroSubtitle).
- **Detaylı Açıklama:** Textarea (longDescription); HTML destekli placeholder.
- **Öne Çıkan Özellikler:**
  - Her feature: title + description input'ları, "Sil" butonu (Trash ikonu).
  - "+ Özellik Ekle" butonu → `addFeature()` → features array'e `{ title: '', description: '' }` ekler.
  - `updateFeature(index, key, value)` ile güncelleme, `removeFeature(index)` ile silme.

**JSON görünümü (`showRawContentJson === true`):**

- Textarea: `pageContentJson` (stringified JSON).
- `handleContentJsonChange(json)` ile değişiklik:
  - JSON parse edilir; başarılıysa heroTitle, heroSubtitle, bannerImage, longDescription, features güncellenir.
  - Hatalı JSON'da sync yapılmaz.

**Senkronizasyon:**

- Form görünümünden JSON'a: `useEffect` ile heroTitle, heroSubtitle, bannerImage, longDescription, features değiştiğinde `pageContentJson` güncellenir (showRawContentJson false iken).

### 4.4 Başvuru Formu sekmesi

**Toggle:** "{ } Ham JSON" / "🎨 Görsel Editör" (`showRawFormJson` state).

**JSON görünümü (`showRawFormJson === true`):**

- Textarea: `formSchemaJson` (stringified array).
- `handleFormJsonChange(json)` ile değişiklik:
  - JSON parse edilir; array ise `setFormFields(parsed)`.
  - Hatalı JSON'da visual builder güncellenmez.

**Görsel editör (`showRawFormJson === false`):**

- **FormBuilder** bileşeni (`components/FormBuilder.tsx`):
  - Props: `fields={formFields}`, `onChange={handleFieldsChange}`.
  - **Alan listesi:** Her alan kartı: label, type, required badge, options (select için), "Düzenle", "Sil", yukarı/aşağı ok butonları.
  - **Alan kütüphanesi:** "Alan Kütüphanesi" butonu → modal açılır; `getFieldTemplates()` ile şablonlar yüklenir, arama ile filtreleme, şablon seçilince `addFromLibrary(template)` ile alan eklenir.
  - **Yeni alan:** "+ Alan Ekle" → `addField()` → yeni FormField (id: crypto.randomUUID(), label: 'Yeni Alan', name: field_${Date.now()}, type: 'text', required: false, width: 'full').
  - **Düzenleme:** Modal: label, name, type (select), required (checkbox), placeholder, options (textarea, virgülle ayrılmış), width (full/half/third).
  - **Silme:** `removeField(id)` → fields array'den çıkarılır.
  - **Sıralama:** `moveField(index, 'up'/'down')` → array'de swap.
- `handleFieldsChange(fields)` → `setFormFields(fields)`, `setFormSchemaJson(JSON.stringify(fields))`.

**Senkronizasyon:**

- Visual builder → JSON: `handleFieldsChange` ile otomatik.
- JSON → visual builder: `handleFormJsonChange` ile manuel JSON düzenleme sonrası.

### 4.5 E-posta Ayarları sekmesi

- `EmailConfig` bileşeni (`app/admin/components/EmailConfig.tsx`) embed edilir.
- Props: `campaignId={campaignId}`.
- campaignId yoksa "Önce kampanyayı kaydediniz." mesajı gösterilir.
- Detaylı akış Flow 07'deki Mail Yönetimi bölümünde.

### 4.6 Kaydetme

**Kullanıcı:**

1. "Kaydet" butonuna tıklar (sağ üstte).

**Frontend:**

1. `handleSave()`:
   - `isSaving = true`.
   - `pageContentJson` parse edilir; hatalıysa toast.error('Sayfa İçeriği JSON formatı hatalı.'), return.
   - `updateCampaignConfig(campaignId, { slug, name: title, description, is_active: isActive, page_content: parsedPageContent, form_schema: formFields }, campaign?.slug ?? null)` çağrılır.

**Backend – updateCampaignConfig:**

1. `getAdminClient()`; yoksa `{ success: false, message: 'Yetkisiz işlem.' }`.
2. `campaigns` tablosunda update `.eq('id', id)`.
3. Hata varsa mesaj; başarılıysa `{ success: true, message: 'Güncellendi.' }`.
4. `revalidatePath` çağrıları: `/admin/campaigns/${id}`, `/kampanya/${slug}` (varsa), `/kampanya/${previousSlug}` (slug değiştiyse), `/`.

**Frontend – sonuç:**

- Başarı: toast.success('Kampanya güncellendi.'), `router.refresh()`.
- Hata: toast.error('Hata: ' + res.message).

### 4.7 Önizleme

- "Önizle" butonu (sağ üstte): Link `/kampanya/${slug}` target="_blank" → kampanya public sayfası yeni sekmede açılır.

---

## 5. Kullanılan Dosyalar ve RPC'ler

| Dosya / RPC | Rol |
|-------------|-----|
| `app/admin/campaigns/page.tsx` | Kampanya listesi sayfası (server), cookie kontrolü, getCampaigns |
| `app/admin/campaigns/campaign-list-client.tsx` | Kampanya listesi tablosu, durum değiştirme, silme UI |
| `app/admin/campaigns/[id]/page.tsx` | Kampanya detay/düzenleme sayfası (client), tab yapısı, FormBuilder entegrasyonu |
| `components/FormBuilder.tsx` | Görsel form alanı editörü, alan kütüphanesi entegrasyonu |
| `app/admin/components/EmailConfig.tsx` | E-posta şablon yönetimi (detay Flow 07'de) |
| `app/admin/actions.ts` | getCampaigns, getCampaignsWithDetails, getCampaignById, changeCampaignStatus, deleteCampaign |
| `app/actions.ts` | updateCampaignConfig |
| RPC: transition_campaign_status | Kampanya durum geçişi (geçiş kuralları kontrolü, status ve is_active güncelleme) |

---

## 6. Hata Durumları Özeti

| Durum | Kullanıcıya |
|-------|-------------|
| Cookie yok | `/admin/login`'e yönlendirme |
| Kampanya bulunamadı (detay) | toast.error('Kampanya bulunamadı.'), `/admin/campaigns`'e yönlendirme |
| Geçersiz durum geçişi | RPC hatası → toast.error(message) |
| Silme hatası | toast.error(message) |
| Page content JSON hatalı | toast.error('Sayfa İçeriği JSON formatı hatalı.') |
| Güncelleme hatası | toast.error('Hata: ' + message) |
| Auth hatası | toast.error('Auth error') veya yönlendirme |

---

## 7. İlgili Akışlar

- **Flow 07:** Kampanya oluşturma (`/admin/campaigns/new`) → bu sayfadan "Yeni Kampanya" butonu ile erişilir.
- **Flow 07:** Mail yönetimi → E-posta Ayarları sekmesinde EmailConfig bileşeni kullanılır.
- **Flow 11:** Alan kütüphanesi → FormBuilder içinde alan şablonları kullanılır.
- **Flow 02:** Kampanya başvuru → Düzenlenen kampanya `/kampanya/[slug]` sayfasında kullanılır.
