# Flow 11: Admin Alan Kütüphanesi Yönetimi

**Amaç:** Admin'in form alanı şablonlarını (field templates) yönetmesi: şablon oluşturma, düzenleme ve silme. Bu şablonlar FormBuilder'da "Alan Kütüphanesi" özelliği ile kampanya formlarına hızlıca eklenebilir.

---

## 1. Giriş

| Öğe | Değer |
|-----|--------|
| **Rota** | `/admin/fields` |
| **Sayfa** | `app/admin/fields/page.tsx` (server component) |
| **Bileşenler** | `app/admin/fields/FieldLibraryClient.tsx` |
| **Backend** | `app/admin/actions.ts`: getFieldTemplates, upsertFieldTemplate, deleteFieldTemplate |
| **Kimlik doğrulama** | Cookie kontrolü (implicit) |

---

## 2. Ön koşullar

- Admin girişi yapılmış olmalı.
- Şablonlar `field_templates` tablosunda saklanır.

---

## 3. Adım Adım Akış

### 3.1 Sayfa yüklenmesi

1. Kullanıcı `/admin/fields` adresine gider.
2. Server component (`app/admin/fields/page.tsx`):
   - Cookie kontrolü (implicit).
   - `getFieldTemplates()` ile şablon listesi çekilir.
   - `FieldLibraryClient` bileşenine `initialTemplates` prop'u geçilir.

**getFieldTemplates():**

- `getAdminClient()`; yoksa `[]`.
- `field_templates` tablosundan select `*`.
- `order('created_at', { ascending: false })` sıralama.
- Dönüş: FieldTemplate[] (id, label, type, options, is_required, created_at).

### 3.2 Şablon listesi görüntüleme (FieldLibraryClient)

**UI:**

- **Başlık:** "Kayıtlı Alanlar", "+ Yeni Alan Ekle" butonu.
- **Boş durum:** `templates.length === 0` ise "Henüz kayıtlı alan şablonu bulunmuyor." mesajı.
- **Şablon kartları:** Her şablon için:
  - **Label:** Kalın, mavi renk (`text-[#002855]`).
  - **Badge'ler:**
    - Tip badge: "Metin" (input), "Seçim" (select), "Uzun Metin" (textarea).
    - Zorunlu badge: `is_required === true` ise "Zorunlu" (kırmızı).
    - Seçenekler: `type === 'select'` ise "Seçenekler: {options.join(', ')}".
  - **Aksiyonlar:** "Düzenle" butonu (Edit2 ikonu), "Sil" butonu (Trash2 ikonu).

### 3.3 Şablon oluşturma

**Kullanıcı:**

1. "+ Yeni Alan Ekle" butonuna tıklar.

**Frontend:**

1. `handleOpenModal()`:
   - `setEditingTemplate({ id: '', label: '', type: 'input', options: [], is_required: false })`.
   - `setIsModalOpen(true)` → modal açılır.

**Modal form:**

- **Görünen İsim (Label):** Text input (required).
- **Tip:** Select dropdown:
  - "Metin Kutusu (Input)" → `type: 'input'`.
  - "Seçim Kutusu (Select)" → `type: 'select'` → "Seçenekler" input görünür.
  - "Uzun Metin (Textarea)" → `type: 'textarea'`.
- **Seçenekler:** `type === 'select'` ise textarea görünür; placeholder: "Seçenek 1, Seçenek 2...", virgülle ayrılmış değerler.
- **Zorunlu Alan:** Checkbox (`isRequired` formData'da 'on' → true).
- **Butonlar:** "Kaydet", "İptal".

**Kullanıcı:**

1. Formu doldurur, "Kaydet" butonuna tıklar.

**Frontend:**

1. `handleSubmit(e)`:
   - preventDefault; `isSaving = true`.
   - FormData oluşturulur; `upsertFieldTemplate(null, formData)` çağrılır.

**Backend – upsertFieldTemplate:**

1. **FormData parse:** id (hidden input, varsa update, yoksa insert), label, type, options (virgülle ayrılmış string), isRequired ('on' → true).
2. **Validasyon:** `!label || !type` → `{ success: false, message: 'Label and Type are required.' }`.
3. **Options parse:** `optionsRaw.split(',').map(o => o.trim()).filter(Boolean)` → string array.
4. **Payload:** `{ label, type, options, is_required: isRequired }`.
5. **Upsert:**
   - `id` varsa: `field_templates` tablosunda update `.eq('id', id)`.
   - `id` yoksa: insert.
6. Hata varsa mesaj; başarılıysa `{ success: true, message: id ? 'Şablon güncellendi.' : 'Şablon eklendi.' }`.

**Frontend – sonuç:**

- Başarı: toast.success(res.message), `handleCloseModal()` (modal kapanır), `router.refresh()`, `window.location.reload()` (liste güncellenir).
- Hata: toast.error(res.message).
- `isSaving = false`.

### 3.4 Şablon düzenleme

**Kullanıcı:**

1. Bir şablonun "Düzenle" butonuna tıklar.

**Frontend:**

1. `handleOpenModal(template)`:
   - `setEditingTemplate(template)` → mevcut şablon verisi modal'a yüklenir.
   - `setIsModalOpen(true)` → modal açılır.

**Modal form:**

- Form alanları `editingTemplate` değerleri ile doldurulur (defaultValue).
- `type` değiştiğinde `setEditingTemplate` ile state güncellenir (select için options input görünür/gizlenir).
- Kullanıcı değişiklikleri yapar, "Kaydet" butonuna tıklar.

**Backend ve sonuç:**

- upsertFieldTemplate akışı aynı; `id` varsa update yapılır.

### 3.5 Şablon silme

**Kullanıcı:**

1. Bir şablonun "Sil" butonuna tıklar.

**Frontend:**

1. `handleDelete(id)`:
   - `confirm('Bu şablonu silmek istediğinize emin misiniz?')` → onaylanmazsa return.
   - `isDeleting = id` (loading state).
   - `deleteFieldTemplate(id)` çağrılır.

**Backend – deleteFieldTemplate:**

1. `getAdminClient()`; yoksa `{ success: false, message: 'Auth required' }`.
2. `field_templates` tablosundan delete `.eq('id', id)`.
3. Hata varsa mesaj; başarılıysa `{ success: true }`.

**Frontend – sonuç:**

- Başarı: toast.success('Şablon silindi.'), `setTemplates(templates.filter(t => t.id !== id))` (optimistic update), `router.refresh()`.
- Hata: toast.error(res.message).
- `isDeleting = null`.

### 3.6 Modal yönetimi

**Modal açma/kapama:**

- `isModalOpen` state ile kontrol edilir.
- Açma: `handleOpenModal(template?)` → `setIsModalOpen(true)`.
- Kapama: `handleCloseModal()` → `setIsModalOpen(false)`, `setEditingTemplate(null)`.
- "İptal" butonu veya X ikonu ile kapanır.

**Modal overlay:**

- Fixed overlay (z-50), gri arka plan (opacity-75).
- Modal içeriği: beyaz kart, border-t-4 border-[#002855] üst kenar vurgusu.

---

## 4. Kullanılan Dosyalar ve RPC'ler

| Dosya | Rol |
|-------|-----|
| `app/admin/fields/page.tsx` | Alan kütüphanesi sayfası (server), getFieldTemplates |
| `app/admin/fields/FieldLibraryClient.tsx` | Şablon listesi, modal form, oluşturma/düzenleme/silme UI |
| `app/admin/actions.ts` | getFieldTemplates, upsertFieldTemplate, deleteFieldTemplate |
| Tablo: field_templates | id, label, type (input/select/textarea), options (string[]), is_required, created_at |

---

## 5. Hata Durumları Özeti

| Durum | Kullanıcıya |
|-------|-------------|
| Cookie yok | `/admin/login`'e yönlendirme (implicit) |
| Label/Type eksik | toast.error('Label and Type are required.') |
| Veritabanı hatası (upsert) | toast.error(error.message) |
| Silme hatası | toast.error(res.message) |
| Auth hatası | toast.error('Auth required') |

---

## 6. İlgili Akışlar

- **Flow 08:** Kampanya detay sayfasında FormBuilder kullanılır; FormBuilder içinde "Alan Kütüphanesi" butonu ile bu şablonlar yüklenir ve kampanya formuna eklenebilir (`addFromLibrary` fonksiyonu).
- **Flow 07:** Kampanya oluşturma sayfasında da FormBuilder kullanılır; aynı şekilde şablonlar erişilebilir.
