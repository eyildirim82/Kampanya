# Talpa.org Kampanya Modülü – Teknik Sağlık ve Mimari Harita

**Tarih:** 18 Şubat 2026  
**Kapsam:** Veritabanı (Supabase), Backend (Server Actions), Frontend (Next.js 16)

---

## 1. Structural Mapping (Yapısal Harita)

### 1.1 Klasör Mantığı

| Katman | Konum | Açıklama |
|--------|--------|----------|
| **Route / Sayfa** | `app/` | Next.js App Router: `basvuru`, `kredi`, `talep`, `kampanya/[slug]`, `sorgula`, `admin/*` |
| **Server Actions** | `app/*/actions.ts`, `app/actions.ts` | Her akışın kendi `actions.ts` dosyası; merkezi kampanya/başvuru `app/actions.ts` |
| **İş Kuralları (DB)** | `supabase/migrations/*.sql` | RPC’ler (verify_member, check_existing_application, submit_dynamic_application_secure) |
| **İş Kuralları (App)** | `app/basvuru/actions.ts`, `app/kredi/actions.ts`, `app/talep/actions.ts` | TCKN/whitelist/session orkestrasyonu; nihai karar DB RPC’de |
| **Validasyon** | `lib/schemas.ts`, `lib/tckn.ts` | Zod şemaları ve TCKN Mod10/Mod11 |
| **Güvenlik (Session)** | `lib/session-token.ts` | HMAC’li session token (TCKN + campaign scope) |
| **Supabase erişimi** | `lib/supabase-client.ts`, `lib/supabase-url.ts` | Anon client fabrikası; service role yalnızca `sorgula/actions.ts` |

### 1.2 Core Business Logic Konumları

- **RPC (tek gerçek kaynak):** Kota, mükerrer, whitelist uygunluk ve INSERT `submit_dynamic_application_secure` içinde atomik. Üyelik durumu `verify_member`, mükerrer `check_existing_application`.
- **Actions:** Akış orkestrasyonu (TCKN doğrula → verify_member → check_existing → session token → form submit → submit_dynamic_application_secure). İş kuralı “kota/whitelist/duplicate” DB’de.
- **Utils:** `lib/tckn.ts` (validateTckn), `lib/schemas.ts` (Zod); şifreleme/hash yok, TCKN plain.
- **Kurum markası (Institution Branding):** Kampanya/kurum teması `BrandProvider` (CSS değişkenleri: `--brand-primary`, `--brand-secondary`), admin tarafında `PartnerBranding` (logo/renk seçimi) ve kampanya sorgularında `institution:institutions(name, logo_url, primary_color, secondary_color)` join’i ile sağlanır. Migration: `20260217180000_add_institution_branding.sql`.
- **Durum takibi:** `components/status/StatusTracker.tsx` (VerticalStepper) sorgula ve talep akışlarında başvuru adımlarını gösterir; client component.

---

## 2. Data Integrity & Transaction Audit

### 2.1 Migration Özeti

| Dosya | İçerik |
|-------|--------|
| `20260213000001_initial_schema.sql` | campaigns, applications, member_whitelist, verify_member, check_existing_application, RLS (anon) |
| `20260213000000_add_interests_table.sql` | interests tablosu + RLS (anon INSERT, admin SELECT/DELETE) |
| `20260212220000_add_institutions_table.sql` | institutions tablosu + RLS (public active read, admin all) |
| `20260212220200_campaign_status_transition_rpc.sql` | transition_campaign_status RPC (state machine) |
| `20260214000000_get_application_status_by_tckn_phone.sql` | Sorgula RPC (id, created_at, status, campaign_name) |
| `20260214000001_get_campaign_stats.sql` | Dashboard istatistik RPC |
| `20260214000002_submit_dynamic_application_secure.sql` | Atomik başvuru RPC (FOR UPDATE, kota, whitelist, duplicate, INSERT) |
| `20260214000003_create_admins.sql` | admins tablosu + RLS (kendi kaydı SELECT) |
| `20260214000004_admin_rls_policies.sql` | is_admin() helper + applications/member_whitelist/campaigns için admin policy'leri |
| `20260214000005_missing_schema_parity.sql` | interests (RLS güncellemesi), rate_limit_entries, check_rate_limit RPC, audit_logs |
| `20260215134500_multi_campaign_schema.sql` | member_whitelist PK değişikliği (tckn), field_templates, email_rules, campaigns enhancement, admin policy'leri |
| `20260215135000_check_member_status_rpc.sql` | check_member_status RPC (OTP için e-posta) |
| `20260213160000_audit_logs_insert_policy.sql` | audit_logs INSERT policy |
| `20260213170000_agreement_entity.sql` | agreement ile ilgili şema |
| `20260213180000_add_slug_to_campaigns.sql` | campaigns.slug |
| `20260215134400_drop_applications_member_id_fk.sql` | applications.member_id FK kaldırma |
| `20260215134550_verify_member_after_whitelist_pk.sql` | verify_member / check_existing_application (PK tckn sonrası) |
| `20260215135100_remove_applications_anon_insert.sql` | applications anon INSERT kaldırma; sadece RPC ile insert |
| `20260215135200_trigger_url_config.sql` | trigger/URL config |
| `20260217180000_add_institution_branding.sql` | institutions: primary_color, secondary_color |
| `20260218140000_fix_lint_errors.sql` | submit_dynamic_application_secure enum fix; submit_application_secure drop |
| `20260218141500_fix_lint_errors_v2.sql` | applications.client_ip (yoksa ekle); submit_application_secure tüm imzalar drop |
| `20260203030000_email_configs.sql` | email_configurations tablosu |

### 2.2 Atomiklik Değerlendirmesi

- **submit_dynamic_application_secure:**  
  Kampanya satırı `FOR UPDATE` ile kilitleniyor; aynı transaction içinde durum/tarih, whitelist, kota sayımı, duplicate kontrolü ve INSERT yapılıyor. **Kota ve mükerrer kontrolü atomik; race condition riski yok.**

- **applications:**  
  `UNIQUE (campaign_id, tckn)` var; RPC içinde duplicate kontrolü + INSERT sonrası `EXCEPTION WHEN unique_violation` ile ikinci savunma hattı mevcut.

### 2.3 Şema Paritesi Durumu (Güncellendi: 18 Şubat 2026)

- **talep/actions.ts:**  
  `check_rate_limit` RPC ve `interests` tablosu kullanılıyor; bu tablo ve RPC repoda mevcuttur. Migration: `20260214000005_missing_schema_parity.sql` (interests RLS güncellemesi, rate_limit_entries, check_rate_limit, audit_logs). Talep akışı taze kurulumda bu migration ile uyumludur.
- **admin/actions.ts:**  
  `transition_campaign_status` (20260212220200), `audit_logs`, `email_configurations`, `institutions`, `interests` için ilgili migration’lar bu repoda mevcuttur; tek kaynak `supabase/migrations/` dizinidir. CONVENTIONS.md’de tablo/RPC–migration eşlemesi listelenmiştir.

---

## 3. Security & Sensitive Data

### 3.1 TCKN Yaşam Döngüsü

1. **Giriş:** Form (basvuru/kredi/kampanya/talep/sorgula) → `tckn` string.
2. **Validasyon:** `lib/tckn.ts` `validateTckn()` (Mod10/Mod11) + `lib/schemas.ts` `tcknSchema` (Zod).
3. **Whitelist:** Server action → `verify_member(p_tckn_plain: tckn)` (plain text).
4. **Session:** Geçerli üye için `createSessionToken(tckn, { campaignId, purpose? })` → HMAC-SHA256 imzalı token; form gönderiminde `verifySessionToken` ile TCKN geri alınıyor.
5. **Gönderim:** `submit_dynamic_application_secure(p_tckn, ...)` → RPC içinde `applications` tablosuna **plain text** INSERT.
6. **Sorgula:** `get_application_status_by_tckn_phone` SERVICE_ROLE ile çağrılıyor; TCKN/telefon eşleşmesi DB’de, cevap sadece id/tarih/durum/kampanya adı.

**Sonuç:** TCKN uygulama katmanında ve veritabanında **şifrelenmeden** tutuluyor. Loglarda `lib/logger.ts` PII redaction var (tckn, phone, email vb.).

### 3.2 RLS Özeti (Migrations’dan)

- **campaigns:**  
  `campaigns_read_active`: SELECT için `is_active = true`. **INSERT/UPDATE/DELETE için policy yok.**
- **applications:**  
  `applications_no_anon`: SELECT için `false` (anon hiç satır göremez). Anon INSERT kaldırıldı (20260215135100); insert yalnızca `submit_dynamic_application_secure` RPC ile. **Authenticated/admin için policy migration’da tanımlı olmalı.**
- **member_whitelist:**  
  `member_whitelist_no_anon`: SELECT için `false`. **Admin için policy yok.**
- **admins:**  
  `admins_select_own`: SELECT için `auth.uid() = id`.

Admin istemcisi `getSupabaseClient()` (anon key) + `setSession(access_token, refresh_token)` ile çalışıyor. Yani istekler “authenticated” JWT ile gidiyor; ancak `applications` ve `member_whitelist` için authenticated’a izin veren bir policy migration’da tanımlı değil. **Bu durumda admin paneli bu tablolarda boş/erişim hatası alır** – ya Supabase Dashboard’da ek policy’ler tanımlıdır ya da admin gerçekten service role ile ayrı bir kanal kullanıyordur (kodda görünmüyor).

### 3.3 Hassas Veri ve HMAC

- **lib/session-token.ts:**  
  HMAC-SHA256, `SESSION_SECRET` (env). Production’da boş/default secret atanıyor. `config-validation.ts` ve production kontrolü uyumlu.
- **Sabit secret:**  
  `DEFAULT_SECRET = 'temp_secret_change_me_in_prod'` sadece development fallback; production’da kullanım engellenmiş.
- **Hardcoded secret:**  
  Kodda başka sabit secret/host yok; ancak **app/actions.ts** ve **app/basvuru/campaign.ts** içinde `http://127.0.0.1:7248/ingest/...` debug/agent çağrıları var; production’da kaldırılmalı veya feature-flag’e alınmalı.

---

## 4. Performance & Modern Patterns

- **Stack:** Next.js **16**, React 19, Tailwind **4** (`app/globals.css`: `@import "tailwindcss";`). Server Actions ile `useActionState` (admin login), `revalidatePath`, `redirect` kullanılır; hata dönüşü genelde `{ success, message }` formundadır.

### 4.1 RSC vs Client Components

- **RSC (Server):**  
  `app/admin/dashboard/page.tsx`, `app/kampanya/[slug]/page.tsx` (slug’dan kampanya çekme, form wrapper’a props). Veri `Promise.all` ile tek seferde alınıyor; gereksiz client bundle yok.
- **Client:**  
  Formlar, tablolar, filtreler: `CampaignFormWrapper`, `DynamicForm`, `ApplicationTable`, `InterestTable`, `DashboardStats`, `CampaignStats`, `StatusTracker` (VerticalStepper), login/form sayfaları. Mantıklı ayrım: etkileşim client’ta, veri çekimi server’da.

### 4.2 N+1 ve Sorgu Sayısı

- **Dashboard:**  
  `getApplications`, `getCampaigns`, `getDashboardStats`, `getCampaignStats` tek `Promise.all` içinde; N+1 yok.
- **getCampaignsWithDetails:**  
  Kampanyalar + tüm kampanyalar için `applications`’dan `campaign_id` listesi çekilip client-side count. İki ayrı sorgu; N+1 değil ama büyük veride `applications` çekmek ağır olabilir. İdeal: `get_campaign_stats` RPC veya DB tarafında aggregate.

### 4.3 Tailwind 4

- `app/globals.css`: `@import "tailwindcss";` (Tailwind 4).  
- Renkler CSS değişkenleri ile (`:root` – talpa-navy, denizbank-red vb.) tutarlı kullanıma uygun.

---

## 5. Type Safety & Validation

### 5.1 Zod vs DB

- **lib/schemas.ts:**  
  tckn, phone, email, fullName için ortak şemalar; TCKN `validateTckn` ile refine. Basvuru/kredi/talep formları bu şemalarla parse ediyor.
- **Eksik uyum:**  
  DB’deki `form_data` jsonb yapısı için merkezi bir Zod şeması yok; her akış kendi `formSchema` ile `form_data`’yı RPC’ye iletiyor. Tip güvenliği form seviyesinde, DB kolon tipi (jsonb) ile otomatik eşleşmiyor.

### 5.2 `any` Kullanımı

- **app/actions.ts:**  
  `updateCampaignConfig(id, updates: any)`, `createCampaign(prevState: any, ...)`.
- **app/admin/actions.ts:**  
  `decryptApplications(apps: Record<string, any>[])`, `(adminSupabase as any).from('applications').delete()`, `error: any`, `Record<string, any>` payload’lar, `(query as any).range`, `(c: any)`, `(row: any)`.
- **app/basvuru/campaign.ts:**  
  `page_content?: any`.
- **Diğer:**  
  ApplicationTable/InterestTable’da `any[]`/`(app: any)`, CampaignManager’da `(campaign as any).status`, sorgula/kampanya sayfalarında `(result: any)` / `(feature: any)`.

Bu kullanımlar tip güvenliğini zayıflatıyor; Supabase üretilen tipleri ve form payload tipleri ile kademeli değiştirilebilir.

### 5.3 Error Boundary

- **app/error.tsx** ve **app/admin/error.tsx** mevcut; hata yakalama ve “Tekrar dene” / “Ana sayfa” akışı var.  
- Route segment’lere özel (ör. `/kampanya/[slug]`) ek error boundary yok; gerekirse eklenebilir.

---

# Özet: Kritik Düzeltmeler, Zayıflıklar, Teknik Borç

## Critical Fixes (Öncelikli)

1. **RLS – Admin erişimi**  
   Migrations’a, admin (authenticated) için policy’ler ekleyin:  
   - `applications`: SELECT (ve gerekiyorsa UPDATE/DELETE) için `auth.uid() IN (SELECT id FROM admins)`.  
   - `member_whitelist`: Aynı mantık.  
   - `campaigns`: SELECT (tümü) + INSERT/UPDATE/DELETE için admin policy.  
   Böylece admin paneli, mevcut anon+setSession akışı ile çalışabilir; aksi halde boş/403 riski var.

2. **Migration’lar**  
   `interests`, `check_rate_limit`, `rate_limit_entries`, `audit_logs`, `email_configurations`, `institutions`, `transition_campaign_status` bu repoda ilgili migration dosyalarında mevcuttur (örn. `20260214000005_missing_schema_parity.sql`, `20260212220000_add_institutions_table.sql`, `20260212220200_campaign_status_transition_rpc.sql`). CONVENTIONS.md ile çapraz kontrol edin; eksik RLS/policy varsa yeni migration ile ekleyin.

3. **Debug / agent çağrıları**  
   `app/actions.ts` ve `app/basvuru/campaign.ts` içindeki `http://127.0.0.1:7248/ingest/...` isteklerini production’da devre dışı bırakın (env check veya tamamen kaldırma).

4. **Sorgula – TCKN validasyonu**  
   `sorgula/actions.ts` içinde TCKN sadece `length === 11` ile kontrol ediliyor; `lib/tckn.validateTckn` veya `tcknSchema` kullanılması KVKK ve veri tutarlılığı için daha iyi olur.

## Architectural Weaknesses (Mimari Zayıflıklar)

1. **TCKN plain text**  
   applications ve member_whitelist’te TCKN düz metin; mevcut tasarım böyle. Uzun vadede şifreleme (application-level veya DB encryption) değerlendirilebilir.

2. **Admin client**  
   Admin, anon key + setSession ile çalışıyor; RLS policy’ler migration’da olmadığı için davranış dashboard’a bağlı. Service role’u sadece server-side, sınırlı endpoint’lerde (sorgula gibi) kullanmak ve admin için “authenticated + admin policy” modelini migration’da netleştirmek daha sürdürülebilir.

3. **form_data / jsonb**  
   Dinamik form şeması nedeniyle `form_data` yapısı akışa göre değişiyor; merkezi Zod tipi ve (opsiyonel) DB constraint yok. Şema versiyonu veya ortak alan seti için kontrat tanımlanabilir.

## Technical Debt (Teknik Borç)

1. **`any` ve type assertion’lar**  
   actions ve admin bileşenlerinde `any`/`as any` azaltılması; Supabase generated types ve form tipleriyle değiştirilmesi.

2. **getCampaignsWithDetails**  
   Uygulama sayılarını RPC veya tek aggregate sorgu ile almak; büyük veride daha verimli olur.

3. **CONVENTIONS.md vs migration’lar**  
   Dokümandaki RLS ve RPC listesi ile `supabase/migrations/` içeriğini eşitlemek; eksik tablo/RPC’leri ya migration’a almak ya da “dış şema” olarak belgelemek.

4. **Session TTL**  
   15 dakika sabit; gerekirse env (SESSION_TTL_MS) ile yapılandırılabilir.

---

# Atomic Refactoring Roadmap

Aşağıdaki sıra, bağımlılıkları ve riski minimize edecek şekilde kurgulandı.

| Faz | Adım | Açıklama |
|-----|------|----------|
| **1** | RLS migration | Yeni migration: `applications`, `member_whitelist`, `campaigns` için admin (auth.uid() IN (SELECT id FROM admins)) policy’leri. Mevcut anon policy’lere dokunmadan ekleyin. |
| **2** | Migration / CONVENTIONS çapraz kontrol | Tüm tablo ve RPC’ler repoda mevcut. CONVENTIONS.md ile migration listesini eşleyin; eksik RLS/policy varsa yeni migration ile ekleyin. |
| **3** | Debug kodu kaldırma | `app/actions.ts` ve `app/basvuru/campaign.ts` içindeki 127.0.0.1:7248 ingest çağrılarını kaldırın veya `process.env.NODE_ENV === 'development'` ile sınırlayın. |
| **4** | Sorgula TCKN | `sorgula/actions.ts`’de TCKN için `validateTckn` veya `tcknSchema.safeParse` kullanın; hata mesajını kullanıcıya uygun şekilde dönün. |
| **5** | Tipler (kademeli) | Supabase `supabase gen types typescript` çıktısını projeye alın; `getApplications`, `getCampaigns`, admin action’larında `any` yerine bu tipleri kullanmaya başlayın. |
| **6** | Form / form_data tipi | Ortak `FormDataPayload` veya kampanya bazlı Zod şemalarını tanımlayıp RPC parametrelerinde kullanın; `form_data` için en azından ortak alanları tipleyin. |
| **7** | Dashboard aggregate | `getCampaignsWithDetails` içinde uygulama sayılarını `get_campaign_stats` RPC veya benzeri tek sorgu ile alacak şekilde refactor edin. |
| **8** | CONVENTIONS güncelleme | Tüm RPC ve tabloları listele; hangi migration’da olduğunu yaz; “dashboard’da olmalı” yerine “migration dosyası: X” şeklinde netleştirin. |

Bu harita ve roadmap, teknik sağlık ve güvenlik odaklı kararlar için tek referans olacak şekilde güncellenebilir.
