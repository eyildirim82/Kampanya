# Flow 06: Public Login (Başvuru Sistemi Girişi)

**Amaç:** Kullanıcının TCKN ile “başvuru sistemi”ne giriş yapması. İki yol vardır: (1) Henüz başvurusu yoksa (`has_app=false`) doğrudan `/basvuru?tckn=...` yönlendirmesi (OTP gerekmez); (2) Zaten başvurusu varsa (`has_app=true`) OTP e-posta ile kimlik doğrulama yapılır. Giriş sonrası hedef her zaman başvuru formu sayfasıdır.

---

## 1. Giriş

| Öğe | Değer |
|-----|--------|
| **Rota** | `/login` |
| **Sayfa** | `app/login/page.tsx` (Providers + LoginForm) |
| **Form** | `app/login/form.tsx` – LoginForm (TCKN → OTP veya redirect) |
| **API** | `POST /api/auth/check`, `POST /api/auth/verify` |

Bu akış **admin girişi değildir**; admin için Flow 07 kullanılır.

---

## 2. Adım Adım Akış

### 2.1 Sayfa yüklenmesi

1. Kullanıcı `/login` adresine gider.
2. Sayfa: "Başvuru Sistemi" başlığı, "Lütfen TCKN ile giriş yapınız" alt metni, **LoginForm** (Providers içinde).
3. LoginForm state: step ('TCKN' | 'OTP'), tckn, otp, loading, error, maskedEmail.

### 2.2 Adım 1: TCKN gönderimi

**UI (step === 'TCKN'):**

- Input: "TC Kimlik No", 11 hane, value={tckn}, onChange’de sadece rakam.
- Buton: "Giriş Yap" (loading durumunda disabled, "İşleniyor..." metni gösterilir).
- Hata: Alert (destructive) ile error mesajı.

**Kullanıcı:**

1. TCKN girer, "Giriş Yap"a tıklar.

**Frontend:**

1. handleTcknSubmit(e); preventDefault; loading true, error ''.
2. tckn.length !== 11 ise setError('TCKN 11 haneli olmalıdır.'), loading false, return.
3. axios.post('/api/auth/check', { tckn }).

**API – POST /api/auth/check:**

1. Body: { tckn }.
2. **RPC:** `check_member_status(input_tckn: tckn)`. Sonuç: member_exists, has_app, member_email vb.
3. result yok veya !member_exists → 404 JSON: "Girdiğiniz TCKN ile kayıtlı bir üye bulunamadı."
4. **has_app === false:** Başvurusu yok → 200 JSON: `{ status: 'REDIRECT_FORM' }`. (Frontend bu durumda doğrudan basvuru sayfasına yönlendirir; OTP yok.)
5. **has_app === true:** Başvurusu zaten var → OTP gönder:
   - email = result.member_email.
   - supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } }).
   - Hata: 500 "OTP hatası: ...".
   - Başarı: E-posta maskelenir (örn. ab***@domain.com), 200 JSON: `{ status: 'OTP_SENT', emailMasked: maskedEmail }`.

**Frontend – /api/auth/check yanıtı:**

- **OTP_SENT:** setMaskedEmail(res.data.emailMasked), setStep('OTP').
- **REDIRECT_FORM:** router.push(`/basvuru?tckn=${tckn}`) — OTP adımı atlanır.
- Hata: setError(error.response?.data?.error || 'Giriş yapılırken sunucuyla iletişim kurulamadı.').

### 2.3 Adım 2: OTP doğrulama (step === 'OTP')

**UI:**

- Metin: "Lütfen **{maskedEmail}** adresine gönderilen 6 haneli kodu giriniz."
- Input: "Doğrulama Kodu (OTP)", 6 hane, value={otp}, onChange’de sadece rakam.
- Buton: "Doğrula" (loading’de disabled).
- "Geri Dön" butonu → setStep('TCKN').

**Kullanıcı:**

1. E-postadaki kodu girer, "Doğrula"ya tıklar.

**Frontend:**

1. handleOtpSubmit(e); preventDefault; loading true, error ''.
2. axios.post('/api/auth/verify', { tckn, otp }).

**API – POST /api/auth/verify:**

1. Body: { tckn, otp }.
2. **RPC:** check_member_status(input_tckn: tckn) → member_email.
3. result yok veya !member_exists → 404 "Üye bulunamadı".
4. **verifyOtp:** supabase.auth.verifyOtp({ email: result.member_email, token: otp, type: 'email' }).
5. verifyError veya !session → 400 "Hatalı veya süresi dolmuş kod".
6. Başarı: 200 JSON { success: true, session }.

**Frontend – /api/auth/verify yanıtı:**

- success: router.push(`/basvuru?tckn=${tckn}`). (Session cookie ile devam edilip edilmediği proje yapısına bağlı; yönlendirme ile basvuru sayfasında tckn query’den doldurulur.)
- Hata: setError('Doğrulama işlemi başarısız oldu.' veya response mesajı).

---

## 3. Özet akış şeması

```
[Kullanıcı] → /login → TCKN girer → "Giriş Yap"
       ↓
POST /api/auth/check { tckn }
       ↓
check_member_status → member_exists?
  No → 404 "Üye bulunamadı"
  Yes → has_app?
    No  → REDIRECT_FORM → router.push(/basvuru?tckn=...)
    Yes → signInWithOtp(email) → OTP_SENT → step = OTP
       ↓
[Kullanıcı] OTP girer → "Doğrula"
       ↓
POST /api/auth/verify { tckn, otp }
       ↓
verifyOtp → success → router.push(/basvuru?tckn=...)
```

---

## 4. Kullanılan dosyalar

| Dosya | Rol |
|-------|-----|
| `app/login/page.tsx` | Login sayfası, Providers, LoginForm |
| `app/login/form.tsx` | TCKN + OTP adımları, axios ile API çağrıları |
| `app/login/providers.tsx` | Olası context/provider sarmalayıcı |
| `app/api/auth/check/route.ts` | check_member_status, REDIRECT_FORM / OTP_SENT |
| `app/api/auth/verify/route.ts` | check_member_status, verifyOtp |
| RPC: check_member_status | member_exists, has_app, member_email |

---

## 5. Hata durumları özeti

| Durum | Kullanıcıya |
|-------|-------------|
| TCKN 11 hane değil | "TCKN 11 haneli olmalıdır." |
| Üye bulunamadı | "Girdiğiniz TCKN ile kayıtlı bir üye bulunamadı." |
| RPC hatası (check_member_status) | "Sistem hatası" (500) |
| OTP gönderilemedi | "OTP hatası: ..." (API’den gelen mesaj) |
| Hatalı / süresi dolmuş OTP | "Hatalı veya süresi dolmuş kod" |
| Ağ hatası | "Giriş yapılırken sunucuyla iletişim kurulamadı." / "Doğrulama işlemi başarısız oldu." |

---

## 6. İlgili akışlar

- **Flow 03:** Giriş sonrası yönlendirme hedefi `/basvuru?tckn=...`; ApplicationForm bu tckn’yi query’den alıp input’a doldurur, kullanıcı "Doğrula" ile devam eder.
- **Flow 07:** Admin girişi ayrı rota ve aksiyon (e-posta/şifre, Supabase Auth + admins tablosu).
