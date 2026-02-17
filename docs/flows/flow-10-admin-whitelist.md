# Flow 10: Admin Whitelist Yönetimi

**Amaç:** Admin'in TALPA üye listesini (whitelist) yönetmesi: CSV ile toplu yükleme (normal üyeler ve borçlu listesi), manuel üye ekleme, üye durumunu aktif/pasif yapma ve üye silme.

---

## 1. Giriş

| Öğe | Değer |
|-----|--------|
| **Rota** | `/admin/whitelist` |
| **Sayfa** | `app/admin/whitelist/page.tsx` (client component) |
| **Backend** | `app/admin/actions.ts`: getWhitelistMembers, uploadWhitelist, uploadDebtorList, addWhitelistMember, updateWhitelistMember, deleteWhitelistMember |
| **Kimlik doğrulama** | Cookie kontrolü (implicit) |

---

## 2. Ön koşullar

- Admin girişi yapılmış olmalı.
- CSV dosyaları TCKN formatında olmalı (opsiyonel header, virgülle ayrılmış, ilk sütun TCKN).

---

## 3. Adım Adım Akış

### 3.1 Sayfa yüklenmesi

1. Kullanıcı `/admin/whitelist` adresine gider.
2. Client component (`app/admin/whitelist/page.tsx`):
   - `useEffect` ile `getWhitelistMembers()` çağrılır; `loading = true`.
   - Veri gelince `setMembers(data)`, `loading = false`.

**getWhitelistMembers():**

- `getAdminClient()`; yoksa `[]`.
- `member_whitelist` tablosundan select `*`.
- `order('synced_at', { ascending: false })` sıralama.
- `.limit(100)` → son 100 kayıt.
- Dönüş: Member[] (id, tckn, masked_name, is_active, is_debtor, synced_at, updated_at).

### 3.2 CSV Upload - Whitelist (Aktif Üyeler)

**UI:**

- Kart: "Whitelist Yükle (Aktif Üyeler)" başlığı, açıklama: "Normal üye listesini güncelle."
- Form: file input (accept=".csv"), "Whitelist Güncelle" butonu.

**Kullanıcı:**

1. CSV dosyası seçer, "Whitelist Güncelle" butonuna tıklar.

**Frontend:**

1. `handleUpload(e)`:
   - preventDefault; `uploading = true`, `setMessage(null)`.
   - FormData oluşturulur; file input'tan dosya alınır.
   - `uploadWhitelist(null, formData)` çağrılır.

**Backend – uploadWhitelist:**

1. **Dosya kontrolü:** `formData.get('file')` → File objesi; `.endsWith('.csv')` kontrolü; geçersizse `{ success: false, message: 'Geçersiz dosya.' }`.
2. **Dosya okuma:** `file.text()` → CSV içeriği string.
3. **Satır parse:** `split('\n')` → lines array; boş satırlar filtrelenir.
4. **Header kontrolü:** İlk satırda harf varsa (örn. "TCKN") header kabul edilir, `startIdx = 1`; yoksa `startIdx = 0`.
5. **Satır işleme:**
   - Her satır için: `split(',')` → parts.
   - TCKN: `parts[0]?.trim().replace(/[^0-9]/g, '')` → sadece rakamlar.
   - Name: `parts.length > 1 ? parts.slice(1).join(',').trim() : 'Bilinmeyen Üye'`.
   - TCKN 11 hane değilse satır atlanır (continue).
   - Member objesi: `{ tckn, masked_name: name || 'Bilinmeyen Üye', is_active: true, synced_at: ISO string, updated_at: ISO string }`.
6. **Batch upsert:** `member_whitelist` tablosuna `upsert(members, { onConflict: 'tckn' })` → TCKN unique constraint üzerinden güncelleme veya ekleme.
7. **Audit log:** `logger.adminAction('WHITELIST_UPLOAD', 'system', { count: members.length })`.
8. Dönüş: `{ success: true, message: '${members.length} kayıt yüklendi.' }` veya hata mesajı.

**Frontend – sonuç:**

- Başarı: `setMessage({ text: result.message || 'Yükleme başarılı.', type: 'success' })`, file input temizlenir (`fileInputRef.current.value = ''`), `fetchMembers()` ile liste yenilenir.
- Hata: `setMessage({ text: result.message || 'Dosya yüklenirken bir sorun oluştu.', type: 'error' })`.
- `uploading = false`.

### 3.3 CSV Upload - Borçlu Listesi

**UI:**

- Kart (kırmızı border): "Borçlu Listesi Yükle" başlığı, açıklama: "Borcu olan üyeleri işaretle (Başvuruları engellenecek)."
- Form: file input (accept=".csv"), "Borçluları İşaretle" butonu.

**Kullanıcı:**

1. CSV dosyası seçer, "Borçluları İşaretle" butonuna tıklar.

**Frontend:**

1. `handleDebtorUpload(e)`:
   - preventDefault; `debtorUploading = true`, `setMessage(null)`.
   - FormData oluşturulur; `uploadDebtorList(null, formData)` çağrılır.

**Backend – uploadDebtorList:**

1. **Dosya kontrolü:** uploadWhitelist ile aynı (CSV kontrolü).
2. **Dosya okuma ve parse:** Aynı mantık (header kontrolü, satır işleme).
3. **Member objesi:** `{ tckn, masked_name: name || 'Borçlu Üye', is_active: true, is_debtor: true, synced_at: ISO string, updated_at: ISO string }`.
4. **Batch upsert:** `member_whitelist` tablosuna `upsert(members, { onConflict: 'tckn' })` → mevcut kayıtlar `is_debtor: true` olarak güncellenir veya yeni kayıt eklenir.
5. **Audit log:** `logger.adminAction('DEBTOR_UPLOAD', 'system', { count: members.length })`.
6. Dönüş: `{ success: true, message: '${members.length} borçlu kayıt güncellendi/eklendi.' }`.

**Frontend – sonuç:**

- Başarı: `setMessage({ text: result.message || 'Borçlu listesi yüklendi.', type: 'success' })`, file input temizlenir, `fetchMembers()`.
- Hata: `setMessage({ text: result.message || 'Borçlu listesi güncellenirken bir sorun oluştu.', type: 'error' })`.
- `debtorUploading = false`.

### 3.4 Manuel Üye Ekleme

**UI:**

- "+ Yeni Üye Ekle" butonu → `showAddForm = true` → form kartı görünür.
- Form: TCKN (required, maxLength 11, pattern [0-9]{11}), İsim Soyisim (opsiyonel), Aktif checkbox (defaultChecked), "İptal" ve "Ekle" butonları.

**Kullanıcı:**

1. Formu doldurur, "Ekle" butonuna tıklar.

**Frontend:**

1. `handleAddMember(e)`:
   - preventDefault; `adding = true`, `setMessage(null)`.
   - FormData oluşturulur; `addWhitelistMember(null, formData)` çağrılır.

**Backend – addWhitelistMember:**

1. **FormData parse:** tckn, name (opsiyonel), is_active ('on' → true).
2. **TCKN validasyon:** `tckn.length !== 11` → `{ success: false, message: 'Geçersiz TCKN.' }`.
3. **Insert:** `member_whitelist` tablosuna insert: `{ tckn, masked_name: name || 'Manuel Kayıt', is_active }`.
4. Hata varsa mesaj; başarılıysa `{ success: true, message: 'Eklendi.' }`.

**Frontend – sonuç:**

- Başarı: `setMessage({ text: result.message || 'Üye başarıyla eklendi.', type: 'success' })`, form reset (`addFormRef.current.reset()`), `setShowAddForm(false)`, `fetchMembers()`.
- Hata: `setMessage({ text: result.message || 'Üye eklenemedi.', type: 'error' })`.
- `adding = false`.

### 3.5 Üye Listesi

**UI:**

- Başlık: "Mevcut Üye Listesi (Son 100)", "+ Yeni Üye Ekle" butonu, "Yenile" butonu (`fetchMembers()`).
- Tablo: TCKN (font-mono, is_debtor ise "BORÇLU" badge), Güncellenme Tarihi (synced_at veya updated_at, toLocaleString('tr-TR')), Durum (Aktif/Pasif badge), İşlemler (Pasif Yap/Aktif Yap toggle, Sil butonu).

**Durum toggle:**

1. "Pasif Yap" / "Aktif Yap" butonuna tıklanır.
2. `handleToggleStatus(id, currentStatus)`:
   - `updateWhitelistMember(id, !currentStatus)` çağrılır.

**Backend – updateWhitelistMember:**

1. `getAdminClient()`; yoksa `{ success: false, message: 'Auth error' }`.
2. `member_whitelist` tablosunda update: `{ is_active: isActive }` `.eq('id', id)`.
3. Hata varsa mesaj; başarılıysa `{ success: true }`.

**Frontend – sonuç:**

- Başarı: `fetchMembers()` ile liste yenilenir.
- Hata: `setMessage({ text: result.message || 'Durum güncellenemedi.', type: 'error' })`.

**Silme:**

1. "Sil" butonuna tıklanır.
2. `handleDelete(id)`:
   - `confirm('Bu üyeyi silmek istediğinizden emin misiniz?')` → onaylanmazsa return.
   - `deleteWhitelistMember(id)` çağrılır.

**Backend – deleteWhitelistMember:**

1. `getAdminClient()`; yoksa `{ success: false, message: 'Auth error' }`.
2. `member_whitelist` tablosundan delete `.eq('id', id)`.
3. Hata varsa mesaj; başarılıysa `{ success: true }`.

**Frontend – sonuç:**

- Başarı: `setMessage({ text: 'Üye başarıyla silindi.', type: 'success' })`, `fetchMembers()`.
- Hata: `setMessage({ text: result.message || 'Silme işlemi başarısız.', type: 'error' })`.

### 3.6 Mesaj gösterimi

- `message` state varsa Alert bileşeni gösterilir:
  - `variant={message.type === 'success' ? 'success' : 'destructive'}`.
  - Başlık: "İşlem Başarılı" / "İşlem Başarısız".
  - İçerik: `message.text`.

---

## 4. Kullanılan Dosyalar ve RPC'ler

| Dosya | Rol |
|-------|-----|
| `app/admin/whitelist/page.tsx` | Whitelist yönetim sayfası (client), CSV upload formları, üye listesi, manuel ekleme formu |
| `app/admin/actions.ts` | getWhitelistMembers, uploadWhitelist, uploadDebtorList, addWhitelistMember, updateWhitelistMember, deleteWhitelistMember |
| Tablo: member_whitelist | tckn (unique), masked_name, is_active, is_debtor, synced_at, updated_at |

---

## 5. Hata Durumları Özeti

| Durum | Kullanıcıya |
|-------|-------------|
| Cookie yok | `/admin/login`'e yönlendirme (implicit) |
| Geçersiz dosya (CSV değil) | Alert: "Geçersiz dosya." |
| Dosya boş | Alert: "Dosya boş." |
| Geçerli kayıt yok (CSV'de 11 haneli TCKN yok) | Alert: "Geçerli kayıt bulunamadı." |
| CSV parse hatası | Alert: "Hata: " + error.message |
| Geçersiz TCKN (manuel ekleme) | Alert: "Geçersiz TCKN." |
| Duplicate TCKN (insert hatası) | Alert: error.message (DB constraint mesajı) |
| Durum güncelleme hatası | Alert: "Durum güncellenemedi." + message |
| Silme hatası | Alert: "Silme işlemi başarısız." + message |

---

## 6. İlgili Akışlar

- **Flow 02, 03, 04:** Başvuru ve talep akışlarında `verify_member` RPC'si bu whitelist tablosunu kullanır; `is_active = false` veya `is_debtor = true` olan üyeler başvuru yapamaz.
- **Flow 07:** Dashboard'da toplam üye sayısı gösterilmez; whitelist yönetimi bu sayfadan yapılır.
