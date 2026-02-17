# Flow 05: Başvuru Sorgulama (/sorgula)

**Amaç:** Kullanıcının TCKN ve telefon numarası ile daha önce yaptığı **başvuruların** (applications) durumunu sorgulaması. Talep (interests) kayıtları bu sorguda yer almaz.

---

## 1. Giriş

| Öğe | Değer |
|-----|--------|
| **Rota** | `/sorgula` |
| **Sayfa** | `app/sorgula/page.tsx` (client component) |
| **Aksiyon** | `app/sorgula/actions.ts` – checkApplicationStatus |
| **RPC** | `get_application_status_by_tckn_phone` (service role client) |

---

## 2. Adım Adım Akış

### 2.1 Sayfa yüklenmesi

1. Kullanıcı `/sorgula` adresine gider.
2. Sayfa render edilir:
   - TALPA logo (Image /images/talpa-logo.png).
   - Başlık: "Başvuru Sorgulama."
   - Alt metin: "TCKN ve Telefon numaranız ile başvurunuzun durumunu öğrenin."
   - Kart içinde form: **T.C. Kimlik Numarası** (Input, 11 hane), **Telefon Numarası** (Input tel), **Sorgula** butonu.
   - "Ana Sayfaya Dön" linki (/) — sonuç alanının altında veya yanında.

### 2.2 Form gönderimi

**Frontend:**

- Form `action={formAction}` ile server action’a bağlı; `useActionState(checkApplicationStatus, null)`.
- name: "tckn", "phone"; required; maxLength 11 (tckn).
- Submit’te `isPending` true; buton disabled, "Yükleniyor..." veya isLoading prop ile spinner.

**Backend – checkApplicationStatus(prevState, formData):**

1. **Parse:** formData.get('tckn'), formData.get('phone') → trim.
2. **Zod:** sorgulaFormSchema (tcknSchema, phoneSchema). Başarısızsa ilk hata mesajı (tckn veya phone) dönülür: `{ success: false, message }`.
3. **Service role client:** SUPABASE_SERVICE_ROLE_KEY ile createClient (RPC anon ile görünmeyen veri için).
4. **RPC:** `get_application_status_by_tckn_phone(p_tckn, p_phone)`.
   - error: "Sorgulama sırasında bir hata oluştu."
   - rows boş veya length 0: "Bu bilgilerle eşleşen bir başvuru bulunamadı."
5. **Sonuç map:** Her satır için id, date (created_at toLocaleDateString('tr-TR')), campaignName (campaign_name veya 'Genel Başvuru'), status.
6. Dönüş: `{ success: true, data: results }`.

### 2.3 Sonuç gösterimi

**state && !state.success:**

- Alert (destructive): "Sorgu Hatası" başlığı, state.message.

**state && state.success && state.data:**

- "Başvuru Sonuçları" başlığı.
- Her result için kart: campaignName (kalın), "Başvuru Tarihi: {date}", durum **Badge** (statusLabel + statusToVariant).
  - statusToVariant: approved → success (yeşil), rejected → error (kırmızı), pending/reviewing → warning (sarı), diğer → default.
  - statusLabel: pending → "Değerlendiriliyor", approved → "Onaylandı", rejected → "Reddedildi", draft → "Taslak", reviewing → "İnceleniyor"; bilinmeyen status olduğu gibi.

Birden fazla başvuru varsa hepsi listelenir (aynı TCKN+telefon ile eşleşen tüm application kayıtları).

---

## 3. Veri ve güvenlik

- **Telefon eşleşmesi:** RPC’nin telefonu nasıl karşılaştırdığı (normalize: boşluksuz, başında 0 vb.) veritabanı/RPC tanımına bağlıdır; genelde applications tablosundaki phone ile aynı formatta girilmiş olmalı.
- **Service role:** Başvuru kayıtları anon key ile doğrudan okunmadığı için sorgulama için service role kullanılır; RPC içinde sadece gerekli alanlar (id, created_at, status, campaign_name) dönülmeli, PII sınırlı tutulmalı.

---

## 4. Kullanılan dosyalar

| Dosya | Rol |
|-------|-----|
| `app/sorgula/page.tsx` | Form, useActionState, sonuç ve hata gösterimi |
| `app/sorgula/actions.ts` | checkApplicationStatus, Zod, RPC çağrısı |
| `lib/schemas.ts` | tcknSchema, phoneSchema (sorgulaFormSchema buradan türetilir) |
| RPC: get_application_status_by_tckn_phone | TCKN + telefon ile başvuru listesi |

---

## 5. Hata durumları özeti

| Durum | Kullanıcıya |
|-------|-------------|
| TCKN/telefon validasyon | "Lütfen form alanlarını kontrol ediniz." veya alan mesajı |
| Service role yok | "Sistem hatası: Konfigürasyon eksik." |
| RPC hatası | "Sorgulama sırasında bir hata oluştu." |
| Kayıt yok | "Bu bilgilerle eşleşen bir başvuru bulunamadı." |

---

## 6. İlgili akışlar

- **Flow 02, 03:** Başvuru tamamlandıktan sonra "Başvuru Sorgula" linki bu sayfaya yönlendirir.
- **Flow 04:** Talep (interests) bu sorguda görünmez; sadece applications tablosu kullanılır.
- **Flow 07:** Admin panelinde başvurular listelenir; kullanıcı kendi kaydını bu sayfadan TCKN+telefon ile görür.
