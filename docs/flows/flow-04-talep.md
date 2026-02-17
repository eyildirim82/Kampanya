# Flow 04: Ön Talep Formu (/talep/[slug])

**Amaç:** Kullanıcının bir kampanya için “ön talep” (ilgi bildirimi) oluşturması. TCKN önce ayrı bir adımda doğrulanmaz; formda TCKN alanı vardır ve gönderimde whitelist + rate limit kontrolü yapılır.

---

## 1. Giriş

| Öğe | Değer |
|-----|--------|
| **Rota** | `/talep/[slug]` |
| **Sayfa** | `app/talep/[slug]/page.tsx` |
| **Form bileşeni** | `app/talep/[slug]/form.tsx` – InterestForm |
| **Backend** | `app/talep/actions.ts` – submitInterest |

Bu akış **başvuru (application)** değil **talep (interest)** kaydıdır; `interests` tablosuna insert edilir. TCKN tek adımda formla birlikte gönderilir.

---

## 2. Ön koşullar

- Kampanya `getCampaignBySlug(slug)` ile bulunur, `is_active = true`.
- Sayfa yoksa `notFound()`.

---

## 3. Adım Adım Akış

### 3.1 Sayfa yüklenmesi

1. Kullanıcı `/talep/[slug]` adresine gider (örn. `/talep/yeni-kampanya`).
2. Server: `getCampaignBySlug(slug)`; kampanya yoksa 404.
3. Sayfa render edilir:
   - Hero: Lacivert arka plan, kampanya adı (`campaign.name` veya "Talep Formu"), "Bu kampanya için ön talep oluşturarak ilginizi belirtebilirsiniz."
   - Ana içerik: "Talep Formu" başlığı, kısa açıklama, **InterestForm** (campaignId prop).
   - Footer.

### 3.2 Form alanları (InterestForm)

**Zod şeması (interestSchema):**

- **fullName:** min 2 karakter.
- **email:** geçerli e-posta, zorunlu.
- **phone:** optional.
- **tckn:** 11 hane, zorunlu.
- **note:** optional.

**UI:**

- Ad Soyad, E-posta, Telefon (opsiyonel), T.C. Kimlik Numarası, Not (opsiyonel) input’ları.
- "Talep Oluştur" butonu (loading durumunda "Gönderiliyor..." metni gösterilir).
- Sunucu hatası: `serverError` state ile form üstünde veya inline gösterilir; `result.errors` varsa `setError(field, ...)` ile alan bazlı hata.

### 3.3 Gönderim – submitInterest

**Frontend:**

1. Form submit → `onSubmit(data)`.
2. FormData oluşturulur: campaignId, fullName, email, phone (varsa), tckn, note (varsa).
3. `submitInterest({ success: false }, formData)` server action; `isSubmitting = true`, `setServerError(null)`.

**Backend – submitInterest (app/talep/actions.ts):**

1. **Parse:** formData’dan fullName, email, phone, tckn, note, campaignId alınır.
2. **Zod:** interestSchema.safeParse(rawData). Başarısızsa `{ success: false, errors: fieldErrors, message: 'Lütfen form alanlarını kontrol ediniz.' }`.
3. **TCKN:** 11 hane kontrolü; değilse "Geçersiz T.C. Kimlik Numarası."
4. **Whitelist:** `verify_member(p_tckn_plain)` RPC. Sonuç yok veya NOT_FOUND → "TALPA üye listesinde kaydınız bulunamadı. Lütfen TALPA ile iletişime geçiniz."
5. **Borçlu:** memberStatus[0].status === 'DEBTOR' → "Derneğimizde bulunan borcunuz nedeniyle işleminize devam edilememektedir."
6. **Rate limit:** `check_rate_limit(p_tckn, 'submit_interest')`. Aşılırsa "Çok fazla deneme yaptınız. Lütfen daha sonra tekrar deneyiniz."
7. **Insert:** `interests` tablosuna insert: campaign_id, full_name, email, phone (null olabilir), tckn, note (null olabilir).
   - **23505 (unique_violation):** "Bu e-posta adresi ile zaten bir talebiniz bulunmaktadır."
   - Diğer DB hataları: "Kayıt sırasında bir hata oluştu."
8. Başarı: `{ success: true, message: 'Talebiniz başarıyla alınmıştır. Teşekkür ederiz.' }`.

**Frontend – sonuç:**

- Başarı: `setSubmitSuccess(true)`, toast.success, reset. Ekranda "Talebiniz Alındı" + "İlginiz için teşekkür ederiz..." + "Ana Sayfaya Dön" ve "Başvuru Sorgula" linkleri.
- Hata: `setServerError(message)`, toast.error; varsa `result.errors` alanlara setError ile yansıtılır.

---

## 4. Başvuru akışlarından farklar

| Özellik | Talep (Flow 04) | Başvuru (Flow 02, 03) |
|---------|------------------|----------------------------|
| TCKN adımı | Yok; formda tek sayfa | Önce TCKN doğrula, sonra form |
| Session token | Yok | Var; gönderimde token zorunlu |
| Tablo | `interests` | `applications` (+ RPC) |
| E-posta | Gönderilmez (talep kaydında) | No Email No Save; bildirim e-postası |
| Çift kayıt kontrolü | E-posta unique (interests) | TCKN + campaign (check_existing_application) |

---

## 5. Kullanılan dosyalar ve RPC’ler

| Dosya / RPC | Rol |
|-------------|-----|
| `app/talep/[slug]/page.tsx` | Talep sayfası layout, InterestForm |
| `app/talep/[slug]/form.tsx` | InterestForm – tek sayfa form, submitInterest |
| `app/talep/actions.ts` | submitInterest, Zod, whitelist, rate limit, insert interests |
| RPC: verify_member, check_rate_limit | Üyelik ve limit kontrolü |
| Tablo: interests | campaign_id, full_name, email, phone, tckn, note |

---

## 6. Hata durumları özeti

| Durum | Kullanıcıya |
|-------|-------------|
| Form validasyon | "Lütfen form alanlarını kontrol ediniz." + alan hataları |
| Geçersiz TCKN | "Geçersiz T.C. Kimlik Numarası." |
| TALPA’da kayıt yok | "TALPA üye listesinde kaydınız bulunamadı..." |
| Borçlu üye | "Derneğimizde bulunan borcunuz nedeniyle..." |
| Rate limit | "Çok fazla deneme yaptınız..." |
| Aynı e-posta ile tekrar talep | "Bu e-posta adresi ile zaten bir talebiniz bulunmaktadır." |
| DB hatası | "Kayıt sırasında bir hata oluştu." / "Beklenmedik bir hata oluştu." |

---

## 7. İlgili akışlar

- **Flow 01:** Ana sayfada talep sayfasına doğrudan link yok; kullanıcı URL ile veya kampanya sayfasından link ile gelebilir (projede talep linki nerede veriliyorsa oradan).
- **Flow 05:** "Başvuru Sorgula" talep için başvuru listesi göstermez; sorgulama `applications` tablosuna göre çalışır (TCKN+telefon). Talep kayıtları ayrı `interests` tablosunda.
- **Flow 07:** Admin panelinde "Talepler" / interests yönetimi (admin/interests) bu kayıtları listeler.
