# Mimari Kurallar ve Veritabanı

## RLS (Row Level Security) ve RPC Bypass

- **Anon key** ile tablolara doğrudan `SELECT`/`INSERT`/`UPDATE` yapılmamalıdır. Hassas tablolar (`applications`, `member_whitelist`, `interests`) için RLS politikaları ile anon erişimi kısıtlanmalıdır.
- **Yetkili işlemler** (başvuru oluşturma, whitelist kontrolü, durum sorgulama) **RPC (SECURITY DEFINER)** ile yapılır. RPC'ler tanımlı parametrelerle çalışır ve dönen alanlar sınırlıdır.
- **Service role** yalnızca güvenli RPC çağrıları veya admin işlemleri için kullanılır (örn. `get_application_status_by_tckn_phone`, `get_campaign_stats`). Uygulama katmanında doğrudan tablo okuma/yazma yerine bu RPC'ler tercih edilir.

## Migration'lar

Supabase migration'ları `supabase/migrations/` altındadır. Aşağıda tüm tablolar ve RPC'ler için migration referansları listelenmiştir.

### Tablolar

| Tablo | Migration Dosyası | Notlar |
|-------|-------------------|--------|
| `campaigns` | `20260213000001_initial_schema.sql` | Temel şema. `20260215134500_multi_campaign_schema.sql` ile status, slug, email alanları eklendi. |
| `applications` | `20260213000001_initial_schema.sql` | Temel şema. `20260218141500_fix_lint_errors_v2.sql` ile `client_ip` kolonu eklendi. |
| `member_whitelist` | `20260213000001_initial_schema.sql` | Temel şema. `20260215134500_multi_campaign_schema.sql` ile PK `tckn`'e geçirildi, `id` kolonu kaldırıldı. |
| `interests` | `20260213000000_add_interests_table.sql` | Talep formu için. `20260214000005_missing_schema_parity.sql` ile RLS politikaları güncellendi. |
| `institutions` | `20260212220000_add_institutions_table.sql` | Kurum yönetimi (DenizBank vb.). `20260217180000_add_institution_branding.sql` ile `primary_color`, `secondary_color` eklendi. |
| `audit_logs` | `20260214000005_missing_schema_parity.sql` | Admin işlemleri için denetim kaydı. `20240202130000_security_updates.sql` içinde de tanım var (eski). |
| `rate_limit_entries` | `20260214000005_missing_schema_parity.sql` | `check_rate_limit` RPC için destek tablosu. |
| `admins` | `20260214000003_create_admins.sql` | Admin kullanıcıları. |
| `email_configurations` | `20260203030000_email_configs.sql` | E-posta şablonları. |
| `email_rules` | `20260215134500_multi_campaign_schema.sql` | Kampanya bazlı e-posta kuralları. |
| `field_templates` | `20260215134500_multi_campaign_schema.sql` | Form alan şablonları. |

### RPC Fonksiyonları

| RPC | Migration Dosyası | Açıklama |
|-----|-------------------|----------|
| `get_application_status_by_tckn_phone(p_tckn, p_phone)` | `20260214000000_get_application_status_by_tckn_phone.sql` | TCKN + telefon ile başvuru durumu (sadece id, created_at, status, campaign_name). Sorgula akışında service role ile çağrılır. |
| `get_campaign_stats()` | `20260214000001_get_campaign_stats.sql` | Kampanya bazlı başvuru sayıları (dashboard). Admin client ile çağrılır. |
| `verify_member(p_tckn_plain)` | `20260213000001_initial_schema.sql` | Whitelist üyelik kontrolü. En güncel versiyon: `20260215134550_verify_member_after_whitelist_pk.sql` (PK değişikliği sonrası). |
| `check_existing_application(p_tckn_plain, p_campaign_id, p_member_id)` | `20260213000001_initial_schema.sql` | Mükerrer başvuru kontrolü. En güncel versiyon: `20260215134550_verify_member_after_whitelist_pk.sql`. |
| `submit_dynamic_application_secure(p_campaign_id, p_tckn, p_form_data, p_client_ip)` | `20260214000002_submit_dynamic_application_secure.sql` | Tek aktif başvuru RPC. En güncel: `20260218140000_fix_lint_errors.sql` (enum fix), `20260218141500_fix_lint_errors_v2.sql` (client_ip vb.). |
| ~~`submit_application_secure`~~ | — | **Kaldırıldı.** `20260218140000_fix_lint_errors.sql` ve `20260218141500_fix_lint_errors_v2.sql` ile drop edildi. Yerine `submit_dynamic_application_secure` kullanılır. |
| `check_rate_limit(p_tckn, p_action)` | `20260214000005_missing_schema_parity.sql` | Rate limit (talep ve doğrulama akışı); tablo: `rate_limit_entries`. Aynı TCKN+action için saatte 3 deneme. Eski IP/endpoint imzası ve `rate_limit` tablosu kullanılmıyor (deprecated). |
| `check_member_status(input_tckn)` | `20260215135000_check_member_status_rpc.sql` | Üye e-posta (OTP akışı). `member_whitelist` veya `applications` tablosundan e-posta döner. |
| `transition_campaign_status(p_campaign_id, p_new_status)` | `20260212220200_campaign_status_transition_rpc.sql` | Kampanya durum geçişi (draft → active → paused → closed). State machine kontrolü içerir. |
| `is_admin(user_id)` | `20260214000004_admin_rls_policies.sql` | RLS helper: `auth.uid()`'in `admins` tablosunda olup olmadığını kontrol eder. |

## Önerilen index ve kısıtlar

- `applications (campaign_id)`, `applications (tckn, campaign_id)` – Sorgu ve mükerrer kontrol performansı
- `applications (tckn, phone)` – Sorgula RPC performansı
- `applications (tckn, campaign_id)` üzerinde **UNIQUE** – Mükerrer başvuru engeli (RPC ile birlikte)

## Tip Üretimi ve Senkronizasyon

Yeni tablo veya RPC eklendiğinde:

1. Migration dosyasını `supabase/migrations/` altına ekleyin (timestamp formatında: `YYYYMMDDHHMMSS_description.sql`)
2. `supabase gen types typescript --local` komutu ile `types/supabase.ts` dosyasını güncelleyin
3. Bu dokümandaki (CONVENTIONS.md) tablo/RPC listesine yeni eklemeyi ekleyin
4. `app/admin/actions.ts` veya `app/talep/actions.ts` gibi ilgili action dosyalarında Supabase tiplerini (`Tables<'tablo_adi'>`, `TablesInsert<'tablo_adi'>`, vb.) kullanın

Bu doküman, RLS politikaları ve migration'lar Supabase dashboard veya başka bir repoda tutuluyorsa oradan export edilerek güncellenebilir.
