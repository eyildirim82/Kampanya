# Başvuru Akışı (Application Flow)

Bu dokümanda kullanıcının kampanyaya nasıl girdiği, TCKN doğrulaması ve form gönderiminin adım adım nasıl işlediği anlatılmaktadır.

---

## 1. Giriş Noktaları

| Nereden | Nereye | Açıklama |
|--------|--------|----------|
| **Ana sayfa (`/`)** | `/kampanya/[slug]` | Kullanıcı bir kampanya kartına "Başvuru Yap" ile tıklar; slug kampanya sayfasına götürür. |
| **Eski link** | `/kredi` → `/` | Kredi akışı kaldırıldı; ana sayfaya yönlendirilir. |
| **Doğrudan** | `/basvuru` veya `/basvuru/[slug]` | Başvuru formu sayfası (kampanya bazlı). |
| **Doğrudan** | `/talep/[slug]` | Talep formu sayfası. |

Ana akış büyük ölçüde **ana sayfa → kampanya detay → form** şeklindedir.

---

## 2. Kampanya Sayfası Akışı

Kampanya sayfası (`/kampanya/[slug]`) tüm kampanyalar için aynı yapıyı kullanır: **CampaignFormWrapper** (TCKN adımı) + **DynamicForm** (kampanyanın `form_schema`’sına göre). Önce **TCKN doğrulama**, sonra **form doldurma** ve **gönderim** (submitDynamicApplication) vardır.

---

## 3. Ortak Adım: TCKN Doğrulama

Tüm başvuru akışlarında ilk adım **T.C. Kimlik Numarası (TCKN) girişi ve doğrulama**dır.

### 3.1 Kullanıcı tarafı

1. Kullanıcı 11 haneli TCKN’yi girer.
2. "Doğrula" / "Devam Et" butonuna basar.
3. İstek sunucuya gider (rate limit, whitelist, mevcut başvuru kontrolü).

### 3.2 Sunucu tarafı (genel kampanya: `verifyTcknAction`)

Sırayla yapılan işlemler:

1. **TCKN algoritma kontrolü** (`validateTckn`)  
   - Geçersizse: `INVALID`.

2. **Kampanya çözümleme** (`resolveCampaignId`)  
   - Aktif kampanya yoksa: `ERROR`.

3. **Rate limit**  
   - `check_rate_limit` RPC (örn. verify_tckn aksiyonu).  
   - Aşılırsa: `RATE_LIMIT`.

4. **TALPA üyelik (whitelist)**  
   - `verify_member` RPC ile TCKN whitelist’te aranır.  
   - Bulunamazsa: `NOT_FOUND`.  
   - Üye borçlu ise: `BLOCKED` (DEBTOR).  
   - Üye aktif değilse: `INACTIVE`.

5. **Daha önce başvuru var mı?**  
   - `check_existing_application` RPC (aynı TCKN + kampanya).  
   - Varsa: `EXISTS`.

6. **Başarı**  
   - HMAC imzalı **session token** üretilir (`createSessionToken(tckn, { campaignId })`).  
   - Dönüş: `SUCCESS` + `sessionToken`.

Bu token, form gönderiminde kimliği kanıtlamak ve tekrar TCKN ile oynanmasını engellemek için kullanılır.

---

## 4. Kampanya Başvuru Akışı (`/kampanya/[slug]`)

### 4.1 Sayfa yapısı

- Sol/üst: Kampanya açıklaması, özellikler.
- Sağ/alt: "Başvuru Formu" kartı.

Form bileşeni: **CampaignFormWrapper**.

### 4.2 Adımlar

1. **TCKN adımı (CampaignFormWrapper)**  
   - Kullanıcı TCKN girer, "Devam Et" der.  
   - `verifyTcknAction(tckn, campaignId)` çağrılır.  
   - Sonuç `SUCCESS` ve `sessionToken` gelirse `step` "FORM" yapılır, token state’te tutulur.

2. **Form adımı (DynamicForm)**  
   - Kampanyanın `form_schema` alanına göre alanlar render edilir (input, textarea, select, email, checkbox vb.).  
   - Kullanıcı formu doldurur ve gönderir.

3. **Gönderim (submitDynamicApplication)**  
   - `app/actions.ts` içindeki server action.  
   - Session token doğrulanır (`verifySessionToken`); geçersizse "Oturum süreniz dolmuş" benzeri mesaj.  
   - Kampanya ve e-posta kuralları okunur; koşula göre e-posta şablonu seçilir.  
   - **Önce e-posta gönderilir** (No Email, No Save). Başarısızsa kayıt yapılmaz.  
   - Sonra `submit_dynamic_application_secure` RPC ile başvuru kaydedilir.  
   - Başarılıysa: "Başvurunuz Alındı!" ekranı; kullanıcı "Yeni Başvuru Yap" ile sayfayı yenileyebilir.

---

## 5. Başvuru Formu Akışı (`/basvuru` veya `/basvuru/[slug]`)

Bu sayfa **ApplicationForm** bileşenini kullanır; özellikle Private Kart vb. kampanyalar için sabit + dinamik alanlar bir arada.

### 5.1 Adımlar

1. **TCKN adımı (stage INIT)**  
   - TCKN girilir, "Doğrula" ile `verifyTcknAction(tckn, campaignId)` çağrılır.  
   - `SUCCESS` + session token → stage "FORM", token saklanır.  
   - Diğer durumlar (RATE_LIMIT, INVALID, NOT_FOUND, EXISTS, BLOCKED) toast/hata ile gösterilir.

2. **Form adımı (stage FORM)**  
   - Temel alanlar: TCKN (readonly), Ad Soyad, Telefon (mask), E-posta (opsiyonel), Adres (teslimat adres ise zorunlu), Teslimat yöntemi (Şube/Adres), adres paylaşımı / kart başvurusu / TCKN-telefon paylaşım onayları.  
   - Kampanyanın `extra_fields_schema` alanı varsa **DynamicFormRenderer** ile ek alanlar render edilir.  
   - "Başvuruyu Tamamla" ile gönderim.

3. **Gönderim (submitApplication)**  
   - `app/basvuru/actions.ts`.  
   - FormData → raw obje (parseFormToRaw); session token, campaignId, tckn zorunlu.  
   - Session token doğrulanır; TCKN eşleşmesi kontrol edilir.  
   - Kampanya ve `extra_fields_schema` ile dinamik Zod şeması oluşturulur; doğrulama yapılır.  
   - E-posta kuralı eşleşmesine göre konu/html seçilir.  
   - Önce e-posta gönderilir; başarısızsa kayıt yapılmaz.  
   - `submit_dynamic_application_secure` RPC ile kayıt.  
   - Başarılıysa: "Başvurunuz Alındı!" + "Ana Sayfaya Dön" / "Başvuru Sorgula".

---

## 6. Akış Özeti (Şema)

```
[Ana Sayfa / Doğrudan Link]
         │
         ▼
   /kampanya/[slug]  veya  /basvuru[/slug]  veya  /talep/[slug]
         │
         ▼
   ┌─────────────────────────────────────┐
   │ 1. TCKN Girişi + "Doğrula" / "Devam" │
   └─────────────────────────────────────┘
         │
         ▼
   Sunucu: validateTckn → rate limit → verify_member (whitelist)
           → check_existing_application → session token
         │
         ├─ NOT_FOUND / BLOCKED / EXISTS / RATE_LIMIT / INVALID
         │     → Hata mesajı, forma geçilmez
         │
         ▼ (SUCCESS + sessionToken)
   ┌─────────────────────────────────────┐
   │ 2. Form doldurma (kampanya türüne   │
   │    göre sabit veya dinamik şema)     │
   └─────────────────────────────────────┘
         │
         ▼
   "Başvuruyu Gönder" / "Başvuruyu Tamamla"
         │
         ▼
   Sunucu: Session token doğrula → Zod doğrulama
           → E-posta gönder (No Email, No Save)
           → submit_dynamic_application_secure
         │
         ├─ Hata → Toast + formda hata mesajı
         ▼ Başarı
   "Başvurunuz Alındı!" + Ana Sayfa / Sorgula butonları
```

---

## 7. Güvenlik ve Tutarlılık Notları

- **Session token:** TCKN’yi formda tekrar göndermek yerine HMAC imzalı token kullanılır; süre ve campaignId ile sınırlıdır.
- **Rate limit:** TCKN doğrulama adımında aşırı deneme engellenir.
- **Whitelist:** Sadece TALPA üyesi (ve borçlu olmayan) kullanıcılar başvuru formuna geçebilir.
- **Tek başvuru:** Aynı TCKN + kampanya için ikinci başvuru engellenir (check_existing_application).
- **No Email, No Save:** E-posta gönderilemezse veritabanına kayıt yapılmaz; kullanıcıya tekrar deneme mesajı verilir.

Bu akış, kampanya sayfası ve `/basvuru` sayfaları için ortak TCKN → token → form → e-posta + RPC kayıt mantığını takip eder.
