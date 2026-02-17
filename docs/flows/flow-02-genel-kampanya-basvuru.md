# Flow 02: Kampanya Başvuru (/kampanya/[slug])

**Amaç:** Kullanıcının kampanya sayfasında TCKN doğrulaması yapıp, kampanyanın dinamik form şemasına göre başvuru göndermesi. Tüm kampanyalar bu akışı kullanır.

---

## 1. Giriş

| Öğe | Değer |
|-----|--------|
| **Rota** | `/kampanya/[slug]` |
| **Sayfa** | `app/kampanya/[slug]/page.tsx` |
| **Form sarmalayıcı** | `app/kampanya/[slug]/CampaignFormWrapper.tsx` |
| **Form** | `components/DynamicForm.tsx` |
| **Backend** | `app/basvuru/actions.ts` (verifyTcknAction), `app/actions.ts` (submitDynamicApplication) |

---

## 2. Ön koşullar

- Kampanya `getCampaignBySlug(slug)` ile bulunur, `is_active = true`.
- Kampanyada `form_schema` (veya eşdeğer alan) tanımlıdır; yoksa "Bu kampanya için form tanımlanmamış" mesajı gösterilir.

---

## 3. Adım Adım Akış

### 3.1 Sayfa yüklenmesi

1. Kullanıcı genel kampanya slug’ı ile `/kampanya/[slug]` sayfasına girer.
2. Server: `getCampaignBySlug(slug)` → kampanya; `isCreditCampaign` false.
3. `page_content` ve `form_schema` kullanılır:
   - **Hero:** `content.heroTitle`, `content.heroSubtitle`; isteğe bağlı `bannerImage` (overlay).
   - **Sol/üst kolon:** `longDescription` (HTML), `features` (title + description kartları). Yoksa placeholder metin.
   - **Sağ/alt kolon:** "Başvuru Formu" kartı içinde:
     - `schema.length > 0` ise **CampaignFormWrapper** (campaignId, schema).
     - Değilse "Bu kampanya için form tanımlanmamış."

### 3.2 Aşama 1: TCKN (CampaignFormWrapper – step: TCKN)

**UI:**

- Açıklama: "Başvuruya devam etmek için T.C. Kimlik Numaranızı girin. Üyeliğiniz doğrulanacaktır."
- Input: 11 haneli TCKN (sadece rakam, maxLength 11).
- Buton: "Devam Et" — 11 hane yoksa disabled; loading durumunda "Doğrulanıyor...".
- Hata: Aynı form altında kırmızı metin (`error` state).

**Kullanıcı:**

1. TCKN girer, "Devam Et"e tıklar.

**Frontend:**

1. `handleTcknSubmit(e)` — preventDefault.
2. `tckn.trim().replace(/\D/g, '')` ile 11 hane kontrolü; değilse `setError('TCKN 11 haneli olmalıdır.')`, return.
3. `verifyTcknAction(value, campaignId)` server action çağrılır; `isChecking = true`.

**Backend – verifyTcknAction (app/basvuru/actions.ts):**

1. **TCKN:** `validateTckn(tckn)` — geçersizse `INVALID`.
2. **Kampanya:** `resolveCampaignId(campaignId)` — aktif kampanya; yoksa `ERROR`.
3. **Rate limit:** `check_rate_limit(p_tckn, 'verify_tckn')` — aşılırsa `RATE_LIMIT`.
4. **Üyelik:** `verify_member(p_tckn_plain)` — whitelist. Yoksa `NOT_FOUND`; DEBTOR ise `BLOCKED`; aktif değilse `INACTIVE`.
5. **Mevcut başvuru:** `check_existing_application(p_tckn, p_campaign_id)` — varsa `EXISTS`.
6. **Başarı:** `createSessionToken(tckn, { campaignId })` → `{ status: 'SUCCESS', sessionToken }`.

**Frontend – sonuç:**

- `SUCCESS` ve `sessionToken`: `setSessionToken(result.sessionToken)`, `setStep('FORM')`.
- `INVALID`: setError mesajı.
- `NOT_FOUND`: "TALPA listesinde kaydınız bulunamadı."
- `BLOCKED` / `DEBTOR`: ilgili mesaj.
- `EXISTS`: "Bu kampanya için zaten başvurunuz var."
- Diğer: setError veya genel mesaj.

### 3.3 Aşama 2: Dinamik form (step: FORM → DynamicForm)

**CampaignFormWrapper** `step === 'FORM'` ve `sessionToken` varsa **DynamicForm** render eder:

- Props: `schema` (kampanya form_schema), `campaignId`, `sessionToken`.

**DynamicForm:**

- Şema kampanya `form_schema`’sından gelir (input, textarea, select, email, checkbox, number vb.).
- Her alan için `react-hook-form` + Zod: şemadan dinamik `formSchema` üretilir (required, email, tckn/phone özel validasyonları).
- Form gönderiminde: `submitDynamicApplication(campaignId, data, sessionToken)` — data, form değerleri obje olarak.

**submitDynamicApplication (app/actions.ts):**

1. **Token:** `verifySessionToken(sessionToken, { campaignId })` → tckn. Geçersizse "Oturum süreniz dolmuş..." mesajı.
2. **Kampanya:** campaigns + field_templates + email_rules çekilir.
3. **E-posta kuralı:** `email_rules` içinde `condition_field` / `condition_value` ile eşleşen kural varsa o kuralın subject/html/senderName kullanılır; yoksa kampanya default’ları.
4. **Alıcı:** `formData.email` zorunlu; boşsa "E-posta adresi gerekli."
5. **Önce e-posta:** `sendTransactionalEmail(to, subject, html, senderName, data)`. Başarısızsa kayıt yapılmaz; "E-posta gönderilemedi. Lütfen tekrar deneyiniz."
6. **Kayıt:** `submit_dynamic_application_secure` RPC (p_campaign_id, p_tckn, p_form_data, p_client_ip).
7. Başarı: `{ success: true, message }` (ve isteğe bağlı application_id).

**Frontend – gönderim sonrası:**

- Başarı: toast.success, `setIsSuccess(true)`, reset. Ekranda "Başvurunuz Alındı!" mesajı gösterilir. Butonlar: "Ana Sayfaya Dön" ve "Başvuru Sorgula".
- Hata: toast.error, mesaj gösterilir.

---

## 4. Form şeması (form_schema) yapısı

Kampanya `form_schema` alanı örnek yapı:

- `name`, `label`, `type` (text, textarea, email, select, checkbox, number vb.), `required`, `options` (select için), `placeholder`, `width` (half, third, full), `id`.

DynamicForm bu alanlara göre input/textarea/select/checkbox render eder ve Zod şemasını üretir.

---

## 5. Kullanılan dosyalar ve RPC’ler

| Dosya | Rol |
|-------|-----|
| `app/kampanya/[slug]/page.tsx` | Genel kampanya layout, CampaignFormWrapper |
| `app/kampanya/[slug]/CampaignFormWrapper.tsx` | TCKN adımı + DynamicForm’a geçiş |
| `components/DynamicForm.tsx` | Dinamik form render + submitDynamicApplication |
| `app/basvuru/actions.ts` | verifyTcknAction |
| `app/actions.ts` | submitDynamicApplication |
| RPC: check_rate_limit, verify_member, check_existing_application, submit_dynamic_application_secure | Backend |

---

## 6. Hata durumları özeti

| Durum | Kullanıcıya |
|-------|--------------|
| TCKN 11 hane değil | "TCKN 11 haneli olmalıdır." |
| Geçersiz TCKN (algoritma) | INVALID mesajı |
| Rate limit | "Çok fazla deneme..." |
| TALPA’da kayıt yok | NOT_FOUND mesajı |
| Borçlu / BLOCKED | İlgili mesaj |
| Zaten başvuru var | EXISTS mesajı |
| Oturum süresi dolmuş | "Oturum süreniz dolmuş veya geçersiz..." |
| E-posta zorunlu / gönderilemedi | "E-posta adresi gerekli." / "E-posta gönderilemedi..." |
| RPC hatası | "Başvuru alınamadı. Lütfen tekrar deneyiniz." |

---

## 7. İlgili akışlar

- **Flow 01:** Ana sayfa → bu kampanya sayfasına link.
- **Flow 03:** /basvuru sayfası farklı form (ApplicationForm + extra_fields_schema) ve submitApplication kullanır.
