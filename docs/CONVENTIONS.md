# Mimari Kurallar ve Veritabanı

## RLS (Row Level Security) ve RPC Bypass

- **Anon key** ile tablolara doğrudan `SELECT`/`INSERT`/`UPDATE` yapılmamalıdır. Hassas tablolar (`applications`, `member_whitelist`, `interests`) için RLS politikaları ile anon erişimi kısıtlanmalıdır.
- **Yetkili işlemler** (başvuru oluşturma, whitelist kontrolü, durum sorgulama) **RPC (SECURITY DEFINER)** ile yapılır. RPC’ler tanımlı parametrelerle çalışır ve dönen alanlar sınırlıdır.
- **Service role** yalnızca güvenli RPC çağrıları veya admin işlemleri için kullanılır (örn. `get_application_status_by_tckn_phone`, `get_campaign_stats`). Uygulama katmanında doğrudan tablo okuma/yazma yerine bu RPC’ler tercih edilir.

## Migration’lar

Supabase migration’ları `supabase/migrations/` altındadır. Uygulama aşağıdaki RPC’lere bağımlıdır:

| Migration | RPC / Açıklama |
|-----------|-----------------|
| `20260214000000_get_application_status_by_tckn_phone.sql` | `get_application_status_by_tckn_phone(p_tckn, p_phone)` – TCKN + telefon ile başvuru durumu (sadece id, created_at, status, campaign_name). Sorgula akışında service role ile çağrılır. |
| `20260214000001_get_campaign_stats.sql` | `get_campaign_stats()` – Kampanya bazlı başvuru sayıları (dashboard). Admin client ile çağrılır. |

Diğer kullanılan RPC’ler (Supabase tarafında mevcut olmalı):

- `verify_member(p_tckn_plain)` – Whitelist üyelik kontrolü
- `check_existing_application(p_tckn_plain, p_campaign_id, p_member_id)` – Mükerrer başvuru kontrolü
- `submit_dynamic_application_secure(...)` – Başvuru kaydı (whitelist + mükerrer kontrol RPC içinde veya uygulama + session token ile)
- `check_rate_limit(p_tckn, p_action)` – Rate limit (talep ve doğrulama akışı); tablo: `rate_limit_entries`. Eski IP/endpoint imzası ve `rate_limit` tablosu kullanılmıyor (deprecated).
- `check_member_status(input_tckn)` – Üye e-posta (OTP akışı)
- `transition_campaign_status(p_campaign_id, p_new_status)` – Kampanya durum geçişi

## Önerilen index ve kısıtlar

- `applications (campaign_id)`, `applications (tckn, campaign_id)` – Sorgu ve mükerrer kontrol performansı
- `applications (tckn, phone)` – Sorgula RPC performansı
- `applications (tckn, campaign_id)` üzerinde **UNIQUE** – Mükerrer başvuru engeli (RPC ile birlikte)

Bu doküman, RLS politikaları ve migration’lar Supabase dashboard veya başka bir repoda tutuluyorsa oradan export edilerek güncellenebilir.
