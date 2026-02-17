# Flow 03: Başvuru Sayfası (/basvuru ve /basvuru/[slug])

**Amaç:** Kullanıcının doğrudan başvuru sayfasında (Private Kart vb.) TCKN doğrulaması yapıp, sabit + kampanya ek alanlarıyla başvuru formunu göndermesi.

---

## 1. Giriş

| Öğe | Değer |
|-----|--------|
| **Rotolar** | `/basvuru` (varsayılan kampanya), `/basvuru/[slug]` (slug’a göre kampanya) |
| **Sayfalar** | `app/basvuru/page.tsx`, `app/basvuru/[slug]/page.tsx` |
| **Form bileşeni** | `app/basvuru/form.tsx` – ApplicationForm |
| **Backend** | `app/basvuru/actions.ts` – verifyTcknAction, submitApplication |

Bu akış **sabit alanlar** (ad soyad, telefon, e-posta, adres, teslimat yöntemi, onaylar) ile **kampanya bazlı ek alanlar** (`extra_fields_schema`) birleştirir; gönderim `submitApplication` (FormData) ile yapılır.

---

## 2. Sayfa seçimi: /basvuru vs /basvuru/[slug]

### /basvuru

- `getActiveCampaigns()` çağrılır; **ilk aktif kampanya** (`campaigns[0]`) seçilir.
- Kampanya yoksa: "Aktif Başvuru Dönemi Bulunamadı" mesajı, form gösterilmez.
- Sayfa: Banner (denizbank-1.jpg), "Private Kart – Özel Avantajlar", özellik kartları (IGA Lounge, TAV Passport), **ApplicationForm campaign={campaign}**, PrivateCardBenefits.

### /basvuru/[slug]

- `getCampaignBySlug(slug)` ile kampanya bulunur; yoksa `notFound()`.
- Aynı ApplicationForm + aynı layout yapısı (banner, başlık, benefits); kampanya slug’a göre değişir.

---

## 3. Adım Adım Akış

### 3.1 Aşama 1: TCKN doğrulama (stage: INIT)

**UI:**

- Başlık: "Kampanya Başvuru Formu", alt metin: "Lütfen bilgilerinizi doğrulayarak başlayınız."
- Alan: "T.C. Kimlik Numarası" — input + "Doğrula" butonu (yan yana).
- Hata: `errors.tckn` altında kırmızı metin.
- Query: `?tckn=...` varsa input’a doldurulur (`useSearchParams()`).

**Kullanıcı:**

1. TCKN girer (11 hane), "Doğrula"ya tıklar.

**Frontend:**

1. `handleTcknCheck`: `errors.tckn` yok ve `currentTckn.length === 11` kontrolü; değilse `trigger('tckn')`.
2. `verifyTcknAction(currentTckn, campaignId)` server action; `isCheckingTckn = true`.

**Backend – verifyTcknAction:**

- Flow 02 ile aynı: validateTckn → resolveCampaignId → rate limit → verify_member → check_existing_application → session token.
- Dönüş: SUCCESS + sessionToken, veya RATE_LIMIT, INVALID, NOT_FOUND, EXISTS, BLOCKED, INACTIVE, ERROR.

**Frontend – sonuç:**

- SUCCESS + sessionToken: `setSessionToken`, `setStage('FORM')`.
- RATE_LIMIT, INVALID: toast.error.
- NOT_FOUND: toast + confirm → talpa.org/uyelik yönlendirmesi.
- EXISTS: toast.warning.
- BLOCKED: toast.error.
- Diğer: toast "Sorgulama başarısız oldu...".

### 3.2 Aşama 2: Form (stage: FORM)

**Sabit alanlar (baseSchema – Zod):**

- **tckn:** 11 hane (formda readonly değil ama TCKN adımında doğrulanmış; initialData / watch ile kullanılır).
- **fullName:** min 2 karakter.
- **phone:** 10–14 karakter, format 5XX XXX XX XX veya 5XXXXXXXXX; mask `handlePhoneChange`.
- **email:** optional.
- **address:** optional; teslimat "address" ise min 10 karakter zorunlu.
- **deliveryMethod:** enum 'branch' | 'address'.
- **addressSharingConsent:** boolean; deliveryMethod === 'address' ise true zorunlu.
- **cardApplicationConsent:** true zorunlu.
- **tcknPhoneSharingConsent:** true zorunlu.

superRefine: deliveryMethod 'address' ise address uzunluğu ve addressSharingConsent kontrolü.

**Dinamik alanlar:**

- Kampanya `extra_fields_schema` (FormField[]) varsa **DynamicFormRenderer** ile render edilir.
- `onSubmit` → `handleDynamicSubmit`; form verisi + sessionToken + campaignId + currentTckn FormData’ya eklenir, `submitApplication` çağrılır.

**handleDynamicSubmit:**

1. FormData oluşturulur; data key-value + sessionToken, campaignId, tckn eklenir.
2. `submitApplication({ success: false }, formData)` server action.
3. Başarı: `setSubmitSuccess(true)`, reset, stage INIT, sessionToken null.
4. Hata: `setSubmitError(message)`, toast.error.

### 3.3 Backend – submitApplication (app/basvuru/actions.ts)

1. **FormData parse:** `parseFormToRaw(formData)` — $ACTION anahtarları atlanır; addressSharingConsent, cardApplicationConsent, tcknPhoneSharingConsent 'on'/'true' → boolean.
2. **Session:** rawData.sessionToken yoksa "Oturum bilgisi bulunamadı." Kampanya: `resolveCampaignId(requestedCampaignId)`. Token doğrulanır; tckn eşleşmesi.
3. **Kampanya detay:** campaigns + field_templates + email_rules; `extra_fields_schema` ile **createDynamicSchema** ile Zod şeması oluşturulur; safeParse(rawData). Hata varsa fieldErrors + message.
4. **E-posta kuralı:** condition_field / condition_value eşleşmesine göre subject/html/senderName.
5. **Önce e-posta:** sendTransactionalEmail(to: rawData.email, ...). Başarısızsa "Email Error - Lütfen tekrar deneyiniz.", kayıt yapılmaz.
6. **Kayıt:** `submit_dynamic_application_secure` RPC (p_campaign_id, p_tckn, p_form_data, p_client_ip). RPC hata/kod: QUOTA_EXCEEDED, DUPLICATE_ENTRY, CAMPAIGN_NOT_FOUND, CAMPAIGN_CLOSED → mapRpcErrorToMessage.
7. Başarı: `{ success: true, message: 'Başvurunuz başarıyla alınmıştır.' }`.

### 3.4 Başarı ekranı

- Yeşil onay ikonu, "Başvurunuz Alındı!", açıklama, "Sonraki Adımlar: DenizBank Yeşilköy Şubesi..."
- Butonlar: "Ana Sayfaya Dön" (window.location.href = '/'), "Başvuru Sorgula" (Link /sorgula).
- Alt kısımda "Önemli Uyarı ve Sorumluluk Reddi" metni (TALPA reklam sorumluluğu).

---

## 4. Kullanılan dosyalar

| Dosya | Rol |
|-------|-----|
| `app/basvuru/page.tsx` | Varsayılan kampanya seçimi, ApplicationForm |
| `app/basvuru/[slug]/page.tsx` | Slug’a göre kampanya, ApplicationForm |
| `app/basvuru/form.tsx` | ApplicationForm – INIT/FORM, DynamicFormRenderer |
| `app/basvuru/actions.ts` | verifyTcknAction, submitApplication, parseFormToRaw, createDynamicSchema |
| `app/basvuru/campaign.ts` | getActiveCampaigns, getCampaignBySlug, resolveCampaignId |
| `components/DynamicFormRenderer.tsx` | extra_fields_schema ile ek alanlar |

---

## 5. Hata durumları özeti

| Durum | Kullanıcıya |
|-------|-------------|
| Oturum yok / süresi dolmuş | "Oturum bilgisi bulunamadı." / "Oturum süreniz dolmuş..." |
| Kampanya bulunamadı | "Aktif kampanya yok." |
| Kimlik eşleşmesi | "Kimlik doğrulama hatası." |
| Form validasyon | "Form verileri geçersiz." + alan hataları |
| E-posta gönderilemedi | "Email Error - Lütfen tekrar deneyiniz." |
| RPC (kontenjan, duplicate, kapalı kampanya) | mapRpcErrorToMessage mesajları |
| Genel hata | "Bağlantı hatası veya sunucu kaynaklı bir sorun oluştu." |

---

## 6. İlgili akışlar

- **Flow 06:** Public login sonrası `router.push('/basvuru?tckn=...')` ile bu sayfaya yönlendirme.
- **Flow 02:** Genel kampanya formu farklı (CampaignFormWrapper + DynamicForm, submitDynamicApplication); burada sabit alanlar + extra_fields_schema + submitApplication.
- **Flow 05:** Başvuru sonrası "Başvuru Sorgula" ile durum sorgulama.
