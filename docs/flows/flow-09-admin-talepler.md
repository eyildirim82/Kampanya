# Flow 09: Admin Talepler Yönetimi

**Amaç:** Admin'in kampanyalar için oluşturulan ön talepleri (interests) görüntülemesi, kampanya bazında filtrelemesi, arama yapması, talepleri silmesi ve Excel/PDF olarak export etmesi.

---

## 1. Giriş

| Öğe | Değer |
|-----|--------|
| **Rota** | `/admin/interests` |
| **Sayfa** | `app/admin/interests/page.tsx` (server component) |
| **Bileşenler** | `app/admin/components/InterestTable.tsx`, `app/admin/components/CampaignSelector.tsx` |
| **Backend** | `app/admin/actions.ts`: getInterests, deleteInterest |
| **Kimlik doğrulama** | Cookie kontrolü (implicit - sayfa korumalı) |

---

## 2. Ön koşullar

- Admin girişi yapılmış olmalı.
- Talepler `interests` tablosunda kayıtlı olmalı (Flow 04'te oluşturulur).

---

## 3. Adım Adım Akış

### 3.1 Sayfa yüklenmesi

1. Kullanıcı `/admin/interests` adresine gider.
2. Server component (`app/admin/interests/page.tsx`):
   - `searchParams` Promise'den `campaignId` ve `page` çözümlenir.
   - `campaignId` yoksa veya 'all' ise tüm kampanyalar için filtreleme yapılır.
   - `page` yoksa varsayılan 1.
   - Promise.all ile paralel fetch:
     - `getCampaigns()` → kampanya listesi (CampaignSelector için).
     - `getInterests(campaignId, page)` → talepler + count.

**getInterests(campaignId?, page=1, limit=50):**

- `getAdminClient()`; yoksa `{ data: [], count: 0 }`.
- `interests` tablosundan select; `campaigns(name)` join (kampanya adı için).
- `campaignId` varsa ve 'all' değilse `.eq('campaign_id', campaignId)` filtreleme.
- `order('created_at', { ascending: false })` sıralama.
- `.range(from, to)` ile sayfalama (limit 50).
- Dönüş: `{ data: interests[], count: number }`.

### 3.2 Sayfa render

**UI:**

- **Başlık:** "Talep Yönetimi", alt metin: "Kampanyalar için oluşturulan ön talepleri buradan yönetebilirsiniz."
- **CampaignSelector:** Dropdown ile kampanya seçimi; seçilen kampanya URL'ye `?campaignId={id}` olarak eklenir.
- **InterestTable:** interests, totalCount, currentPage, campaignId prop'ları ile render edilir.

### 3.3 Talepler tablosu (InterestTable)

**Arama:**

- Input: "Ara (İsim, E-posta, TCKN)..."
- `searchTerm` state ile client-side filtreleme:
  - `filteredInterests = interests.filter(item => item.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || item.email?.toLowerCase().includes(searchTerm.toLowerCase()) || (item.tckn && item.tckn.includes(searchTerm)))`.
- Filtrelenmiş liste tabloda gösterilir.

**Tablo sütunları:**

- Tarih (created_at, toLocaleDateString).
- Kampanya (campaigns?.name veya '-').
- Ad Soyad (full_name).
- E-posta (email).
- Telefon (phone veya '-').
- Not (note veya '-', max-w-xs truncate, title attribute ile tam metin).
- İşlemler (Sil butonu).

**Boş durum:**

- `filteredInterests.length === 0` ise "Kayıt bulunamadı." mesajı (colSpan 7).

### 3.4 Silme

**Kullanıcı:**

1. Bir talebin "Sil" butonuna tıklar.

**Frontend:**

1. `handleDelete(id)`:
   - `confirm('Bu talebi silmek istediğinize emin misiniz?')` → onaylanmazsa return.
   - `deleteInterest(id)` çağrılır.

**Backend – deleteInterest:**

1. `getAdminClient()`; yoksa `{ success: false, message: 'Auth error' }`.
2. `interests` tablosundan delete `.eq('id', id)`.
3. Hata varsa mesaj; başarılıysa `{ success: true }`.

**Frontend – sonuç:**

- Başarı: toast.success('Talep silindi.'), `router.refresh()` (sayfa yenilenir, liste güncellenir).
- Hata: toast.error('Silme işlemi başarısız: ' + res.message).

### 3.5 Export işlemleri

**Excel export:**

1. "Excel'e Aktar" butonuna tıklanır.
2. `handleExport()`:
   - `isExporting = true`.
   - `filteredInterests` map edilir: Kampanya, Ad Soyad, E-posta, Telefon, TCKN, Not, Tarih (toLocaleString('tr-TR')).
   - `XLSX.utils.json_to_sheet()` ile worksheet oluşturulur.
   - `XLSX.utils.book_new()` → workbook, `XLSX.utils.book_append_sheet(workbook, worksheet, "Talepler")`.
   - `XLSX.writeFile(workbook, "Talepler.xlsx")` → dosya indirilir.
   - Hata: toast.error('Excel dışa aktarma başarısız oldu.').
   - `isExporting = false`.

**PDF export:**

1. "PDF İndir" butonuna tıklanır.
2. `handleExportPDF()`:
   - Dynamic import: `import('jspdf').default`, `import('jspdf-autotable')`.
   - jsPDF instance oluşturulur.
   - Başlık: "Ön Talep Listesi" (18pt), tarih (11pt).
   - Tablo kolonları: ["Tarih", "Kampanya", "Ad Soyad", "E-posta", "Telefon", "TCKN"].
   - `filteredInterests` map edilir → tableRows array.
   - `doc.autoTable({ head: [tableColumn], body: tableRows, startY: 40 })`.
   - `doc.save("On_Talep_Listesi.pdf")`.
   - Başarı: toast.success('PDF raporu indirildi.').
   - Hata: toast.error('PDF oluşturma başarısız oldu.').

### 3.6 Sayfalama

**Pagination:**

- `pageSize = 50`.
- `totalPages = Math.ceil(totalCount / pageSize)`.
- `handlePageChange(newPage)`:
  - URLSearchParams ile `page` ve `campaignId` (varsa) query parametreleri oluşturulur.
  - `router.push(\`?${params.toString()}\`)` → sayfa yenilenir, yeni sayfa verisi yüklenir.

**UI:**

- Mobil: "Önceki" / "Sonraki" butonları (disabled durumları kontrol edilir).
- Desktop: Sayfa numarası gösterimi, "Toplam X kayıttan Y ile Z arası gösteriliyor" metni, önceki/sonraki ok butonları.

---

## 4. Kullanılan Dosyalar ve RPC'ler

| Dosya | Rol |
|-------|-----|
| `app/admin/interests/page.tsx` | Talepler sayfası (server), searchParams parse, getCampaigns + getInterests |
| `app/admin/components/InterestTable.tsx` | Talepler tablosu, arama, export, silme, sayfalama |
| `app/admin/components/CampaignSelector.tsx` | Kampanya dropdown filtresi |
| `app/admin/actions.ts` | getInterests, deleteInterest |
| Tablo: interests | campaign_id, full_name, email, phone, tckn, note, created_at |

---

## 5. Hata Durumları Özeti

| Durum | Kullanıcıya |
|-------|-------------|
| Cookie yok | `/admin/login`'e yönlendirme (implicit) |
| Veri yok | "Kayıt bulunamadı." mesajı |
| Silme hatası | toast.error('Silme işlemi başarısız: ' + message) |
| Excel export hatası | toast.error('Excel dışa aktarma başarısız oldu.') |
| PDF export hatası | toast.error('PDF oluşturma başarısız oldu.') |

---

## 6. İlgili Akışlar

- **Flow 04:** Talepler `/talep/[slug]` sayfasında `submitInterest` ile oluşturulur; bu sayfada listelenir.
- **Flow 07:** Dashboard'da toplam talepler sayısı gösterilir (getDashboardStats → totalInterests).
