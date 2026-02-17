# Flow 12: Admin Kurum Yönetimi

**Amaç:** Admin'in kurumları (institutions) yönetmesi: kurum oluşturma, düzenleme ve silme. Kurumlar kampanyalara atanabilir ve kampanya listesinde gösterilir.

---

## 1. Giriş

| Öğe | Değer |
|-----|--------|
| **Rota** | `/admin/institutions` |
| **Sayfa** | `app/admin/institutions/page.tsx` (server component) |
| **Bileşenler** | `app/admin/components/InstitutionList.tsx` |
| **Backend** | `app/admin/actions.ts`: getInstitutions, upsertInstitution, deleteInstitution |
| **Kimlik doğrulama** | Cookie kontrolü (implicit) |

---

## 2. Ön koşullar

- Admin girişi yapılmış olmalı.
- Kurumlar `institutions` tablosunda saklanır.

---

## 3. Adım Adım Akış

### 3.1 Sayfa yüklenmesi

1. Kullanıcı `/admin/institutions` adresine gider.
2. Server component (`app/admin/institutions/page.tsx`):
   - Cookie kontrolü (implicit).
   - `getInstitutions()` ile kurum listesi çekilir.
   - `InstitutionList` bileşenine `initialInstitutions` prop'u geçilir.

**getInstitutions():**

- `getAdminClient()`; yoksa `[]`.
- `institutions` tablosundan select `*`.
- `order('name')` sıralama.
- Dönüş: Institution[] (id, name, code, contact_email, logo_url, is_active).

### 3.2 Kurum listesi görüntüleme (InstitutionList)

**UI:**

- **Başlık:** "Kurum Listesi", "+ Yeni Kurum" butonu.
- **Tablo:** Sütunlar: Kurum Adı (logo + name), Kod (font-mono, bg-gray-50/50), İletişim (contact_email veya '-'), Durum (Aktif/Pasif badge), İşlemler (Düzenle, Sil butonları).
- **Boş durum:** `institutions.length === 0` ise "Henüz kurum eklenmemiş." mesajı (colSpan 5).

**Logo gösterimi:**

- `logo_url` varsa: `<img src={logo_url} alt={name} />` (w-10 h-10, object-contain).
- `logo_url` yoksa: Building ikonu (gray-400).

**Durum badge'leri:**

- `is_active === true`: Yeşil badge "Aktif" (CheckCircle ikonu).
- `is_active === false`: Kırmızı badge "Pasif" (XCircle ikonu).

### 3.3 Kurum oluşturma

**Kullanıcı:**

1. "+ Yeni Kurum" butonuna tıklar.

**Frontend:**

1. `openModal()`:
   - `setEditingId(null)` (yeni kayıt).
   - `setFormData({ name: '', code: '', contactEmail: '', logoUrl: '', isActive: true })`.
   - `setIsModalOpen(true)` → modal açılır.

**Modal form:**

- **Kurum Adı:** Text input (required), placeholder: "Örn: DenizBank".
- **Kurum Kodu:** Text input (required), placeholder: "Örn: DENIZBANK", `toUpperCase()` ile otomatik büyük harf; alt metin: "Sistem içi benzersiz kod.".
- **İletişim E-posta:** Email input (opsiyonel), placeholder: "iletisim@denizbank.com".
- **Logo URL:** URL input (opsiyonel), placeholder: "https://...".
- **Aktif Durumda:** Checkbox (default: checked).
- **Butonlar:** "Kaydet", "İptal".

**Kullanıcı:**

1. Formu doldurur, "Kaydet" butonuna tıklar.

**Frontend:**

1. `handleSubmit(e)`:
   - preventDefault; `loading = true`.
   - FormData oluşturulur:
     - `id` eklenmez (yeni kayıt).
     - `name`, `code` eklenir.
     - `contactEmail` varsa eklenir.
     - `logoUrl` varsa eklenir.
     - `isActive === true` ise `form.append('isActive', 'on')`.
   - `upsertInstitution(null, form)` çağrılır.

**Backend – upsertInstitution:**

1. **FormData parse:** id (varsa update, yoksa insert), name, code, contactEmail (opsiyonel), logoUrl (opsiyonel), isActive ('on' → true).
2. **Validasyon:** `!name || !code` → `{ success: false, message: 'Name and Code are required.' }`.
3. **Payload:** `{ name, code, contact_email: contactEmail || null, logo_url: logoUrl || null, is_active: isActive }`.
4. **Upsert:**
   - `id` varsa: `institutions` tablosunda update `.eq('id', id)`.
   - `id` yoksa: insert.
5. Hata varsa mesaj; başarılıysa `{ success: true, message: id ? 'Kurum güncellendi.' : 'Kurum eklendi.' }`.

**Frontend – sonuç:**

- Başarı: toast.success(result.message), `setIsModalOpen(false)` (modal kapanır), `window.location.reload()` (liste güncellenir).
- Hata: toast.error(result.message).
- `loading = false`.

### 3.4 Kurum düzenleme

**Kullanıcı:**

1. Bir kurumun "Düzenle" butonuna tıklar.

**Frontend:**

1. `openModal(inst)`:
   - `setEditingId(inst.id)` (mevcut kurum ID'si).
   - `setFormData({ name: inst.name, code: inst.code, contactEmail: inst.contact_email || '', logoUrl: inst.logo_url || '', isActive: inst.is_active })` → form mevcut verilerle doldurulur.
   - `setIsModalOpen(true)` → modal açılır.

**Modal form:**

- Form alanları `formData` state'i ile kontrol edilir (controlled inputs).
- Kullanıcı değişiklikleri yapar, "Kaydet" butonuna tıklar.

**Backend ve sonuç:**

- upsertInstitution akışı aynı; `id` varsa update yapılır.

### 3.5 Kurum silme

**Kullanıcı:**

1. Bir kurumun "Sil" butonuna tıklar.

**Frontend:**

1. `handleDelete(id)`:
   - `confirm('Bu kurumu silmek istediğinize emin misiniz?')` → onaylanmazsa return.
   - `deleteInstitution(id)` çağrılır.

**Backend – deleteInstitution:**

1. `getAdminClient()`; yoksa `{ success: false, message: 'Auth error' }`.
2. `institutions` tablosundan delete `.eq('id', id)`.
3. Hata varsa mesaj; başarılıysa `{ success: true, message: 'Kurum silindi.' }`.

**Frontend – sonuç:**

- Başarı: toast.success(result.message), `setInstitutions(prev => prev.filter(i => i.id !== id))` (optimistic update).
- Hata: toast.error(result.message).

### 3.6 Modal yönetimi

**Modal açma/kapama:**

- `isModalOpen` state ile kontrol edilir.
- Açma: `openModal(inst?)` → `setIsModalOpen(true)`.
- Kapama: "İptal" butonu veya X ikonu → `setIsModalOpen(false)`.

**Modal overlay:**

- Fixed overlay (z-50), backdrop-blur-sm, bg-black/50.
- Modal içeriği: beyaz kart, rounded-xl, shadow-xl, max-w-md.

---

## 4. Kullanılan Dosyalar ve RPC'ler

| Dosya | Rol |
|-------|-----|
| `app/admin/institutions/page.tsx` | Kurum yönetim sayfası (server), getInstitutions |
| `app/admin/components/InstitutionList.tsx` | Kurum listesi, modal form, oluşturma/düzenleme/silme UI |
| `app/admin/actions.ts` | getInstitutions, upsertInstitution, deleteInstitution |
| Tablo: institutions | id, name, code (unique), contact_email, logo_url, is_active |

---

## 5. Hata Durumları Özeti

| Durum | Kullanıcıya |
|-------|-------------|
| Cookie yok | `/admin/login`'e yönlendirme (implicit) |
| Name/Code eksik | toast.error('Name and Code are required.') |
| Duplicate code (unique constraint) | toast.error(error.message) |
| Veritabanı hatası (upsert) | toast.error(error.message) |
| Silme hatası | toast.error(result.message) |
| Auth hatası | toast.error('Auth error') |

---

## 6. İlgili Akışlar

- **Flow 07:** Kampanya oluşturma sayfasında kurum seçimi yapılır (`getActiveInstitutions()` ile aktif kurumlar listelenir).
- **Flow 08:** Kampanya listesinde kurum bilgisi gösterilir (institutions join ile).
