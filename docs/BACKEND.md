# Backend Documentation

## Overview

The backend infrastructure is built entirely on **Supabase**, providing a managed PostgreSQL database, authentication services, and serverless Edge Functions. The architecture follows a "thick-database, thin-API" philosophy, leveraging PostgreSQL's native capabilities (RLS, Triggers, Functions) for data integrity, security, and business logic.

## Database Schema

### Core Tables

#### 1. `campaigns`

Stores configuration for active marketing campaigns with dynamic form schemas and page content.

**Columns**:
- `id` (UUID, PK): Primary key
- `odoo_id` (INTEGER, UNIQUE): External Odoo ERP reference (nullable)
- `campaign_code` (TEXT, UNIQUE, NOT NULL): Semantic identifier (e.g., `PRIVATE_CARD_2024`, `CREDIT_2026`)
- `name` (TEXT, NOT NULL): Display name
- `slug` (TEXT, UNIQUE): URL-friendly identifier for dynamic routing
- `description` (TEXT): Campaign description
- `start_date` (DATE): Campaign start date
- `end_date` (DATE): Campaign end date
- `is_active` (BOOLEAN, DEFAULT true): Campaign status flag
- `form_schema` (JSONB, DEFAULT '[]'): Dynamic form field definitions
- `page_content` (JSONB, DEFAULT '{}'): CMS-like content for landing pages
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

**Indexes**:
- `idx_campaigns_code`: On `campaign_code`
- `idx_campaigns_slug`: On `slug`
- `idx_campaigns_active`: Partial index on `is_active` WHERE `is_active = true`

**RLS Policies**:
- Public read access for active campaigns: `is_active = true AND end_date >= CURRENT_DATE`
- Admin full access: Authenticated users in `admins` table

#### 2. `member_whitelist`

Source of truth for eligible members. Stores TCKN in plaintext (per business requirement).

**Columns**:
- `tckn` (TEXT, PK, NOT NULL): Turkish Identity Number (plaintext). Primary key; `id` column was removed in multi-campaign schema. See [Historical Encryption Design](#historical-encryption-design-deprecated).
- `masked_name` (TEXT): Partially masked name for display (e.g., "Ah*** Y***")
- `is_active` (BOOLEAN, DEFAULT true): Member eligibility status
- `is_debtor` (BOOLEAN, DEFAULT false): Debtor flag (blocks application)
- `synced_at` (TIMESTAMPTZ, DEFAULT NOW()): Last Odoo sync timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

**Indexes**:
- `idx_member_whitelist_tckn`: On `tckn` (PK)
- Partial index on `is_active` WHERE `is_active = true` (if present)

**RLS Policies**:
- Public read via RPC only (`verify_member`); no direct anon SELECT.
- Admin full access: Authenticated admins (migration: `20260215134500_multi_campaign_schema.sql`).

#### 3. `applications`

Stores all campaign application submissions. Inserts are **only** via the `submit_dynamic_application_secure` RPC (anon direct INSERT was removed in migration `20260215135100`).

**Active schema (migrations)**:
- `id` (UUID, PK): Primary key
- `campaign_id` (UUID, FK → `campaigns.id`): Associated campaign
- `tckn` (TEXT, NOT NULL): TCKN (plaintext)
- `phone` (TEXT), `full_name` (TEXT), `email` (TEXT): From form
- `status` (TEXT, DEFAULT 'PENDING'): e.g. PENDING, APPROVED, REJECTED, REVIEWING
- `form_data` (JSONB, DEFAULT '{}'): Dynamic form field values
- `client_ip` (TEXT, nullable): Client IP at submission
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

**Constraints**:
- Unique: `(campaign_id, tckn)` – duplicate prevention (enforced in RPC and DB).

**Indexes**:
- `idx_applications_campaign_id`, `idx_applications_tckn_phone` (migrations).

**RLS Policies**:
- Anon: No direct SELECT; no direct INSERT (insert only via `submit_dynamic_application_secure`).
- Admin: Authenticated admins (policy in migrations) for SELECT/UPDATE/DELETE.

**Legacy / deprecated (not in current migrations)**  
Older documentation or generated types may reference: `member_id`, `encrypted_tckn`, consent columns (`address_sharing_consent`, `kvkk_consent`, etc.), `consent_metadata`, `admin_notes`. These are not part of the current migration-defined schema. The app’s `decryptApplications()` helper exists for backward compatibility where `encrypted_tckn` may still exist in existing databases; it returns plaintext when possible.

#### 4. `email_configurations`

Stores email template configurations for transactional emails.

**Columns**:
- `id` (UUID, PK): Primary key
- `campaign_id` (UUID, FK → `campaigns.id`, NULLABLE): Campaign-specific config (NULL = global)
- `recipient_type` (ENUM: `applicant`, `admin`, `custom`): Email recipient type
- `recipient_email` (TEXT): Custom recipient email (if `recipient_type = 'custom'`)
- `subject_template` (TEXT, NOT NULL): Email subject with `{{variable}}` placeholders
- `body_template` (TEXT, NOT NULL): Email body HTML with `{{variable}}` placeholders
- `is_active` (BOOLEAN, DEFAULT true): Configuration status
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

**RLS Policies**:
- Admin full access: Authenticated admins can manage configurations

#### 5. `admins`

Maps Supabase Auth users to admin roles.

**Columns**:
- `id` (UUID, PK, FK → `auth.users.id`): Supabase Auth user ID
- `role` (TEXT, DEFAULT 'admin', CHECK IN ('admin', 'viewer')): Admin role
  - `admin`: Full access (read, write, delete, decrypt TCKN)
  - `viewer`: Read-only access (cannot decrypt sensitive data)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

**RLS Policies**:
- Admins can read their own record
- Service role has full access

#### 6. `audit_logs`

Tracks all sensitive operations for compliance and security auditing.

**Columns**:
- `id` (UUID, PK): Primary key
- `admin_id` (UUID, FK → `auth.users.id`): Admin who performed the action
- `action` (TEXT, NOT NULL): Action type (e.g., `DECRYPT_TCKN`, `UPDATE_APPLICATION`, `DELETE_CAMPAIGN`)
- `target_identifier` (TEXT): Target identifier (TCKN, application ID, etc.)
- `details` (JSONB, DEFAULT '{}'): Additional action details
- `ip_address` (INET): Admin IP address
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

**RLS Policies**:
- Admin read access: Authenticated admins can view audit logs

#### 7. `rate_limit_entries` (aktif)

TCKN + aksiyon bazlı rate limiting. `check_rate_limit(p_tckn, p_action)` RPC ile yazılır; anon/authenticated doğrudan erişemez.

**Columns**:
- `id` (UUID, PK)
- `tckn` (TEXT, NOT NULL)
- `action` (TEXT, NOT NULL)
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

**Indexes**: `idx_rate_limit_entries_lookup` (tckn, action, created_at DESC)

**Deprecated**: `rate_limit` tablosu (IP/endpoint) – 002_rate_limiting.sql; kod artık kullanmıyor.

#### 8. `otp_codes`

Temporary OTP codes for member verification (legacy, currently using Supabase Auth OTP).

**Columns**:
- `id` (UUID, PK): Primary key
- `tckn` (TEXT, NOT NULL): Associated TCKN
- `code` (TEXT, NOT NULL): OTP code
- `expires_at` (TIMESTAMPTZ, DEFAULT NOW() + 5 minutes): Expiration timestamp
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

**Indexes**:
- `idx_otp_expires`: On `expires_at` (for cleanup)
- `idx_otp_tckn`: On `tckn`

#### 9. `sync_logs`

Logs for Odoo synchronization operations.

**Columns**:
- `id` (UUID, PK): Primary key
- `sync_type` (TEXT, CHECK IN ('members', 'campaigns')): Sync type
- `status` (TEXT, CHECK IN ('success', 'error')): Sync status
- `records_processed` (INTEGER): Number of records processed
- `error_message` (TEXT): Error message (if status = 'error')
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

## RPC Functions (Stored Procedures)

### `verify_member(p_tckn TEXT)`

Verifies if a TCKN exists in the member whitelist.

**Security**: `SECURITY DEFINER` (executes with elevated privileges to bypass RLS)

**Parameters**:
- `p_tckn` (TEXT): Plaintext TCKN

**Returns**: `TABLE(tckn TEXT, status TEXT)`
- `tckn`: TCKN if found (PK of `member_whitelist`)
- `status`: `'ACTIVE'`, `'INACTIVE'`, or `'DEBTOR'`; empty result means not found.

**Logic**:
1. Query `member_whitelist` WHERE `tckn = p_tckn`
2. Return tckn and status (DEBTOR / ACTIVE / INACTIVE). Empty row = NOT_FOUND.

**Usage**: Called from Server Actions after Mod10/Mod11 validation. Updated in `20260215134550_verify_member_after_whitelist_pk.sql` after PK change to `tckn`.

### `check_existing_application(p_tckn_plain TEXT, p_campaign_id UUID, p_member_id UUID DEFAULT NULL)`

Checks if an application already exists for a given TCKN and campaign.

**Security**: `SECURITY DEFINER`

**Parameters**:
- `p_tckn_plain` (TEXT): Plaintext TCKN
- `p_campaign_id` (UUID): Campaign ID
- `p_member_id` (UUID, optional): Unused; kept for signature compatibility.

**Returns**: `TABLE(exists BOOLEAN)`

**Logic**:
1. `SELECT EXISTS(SELECT 1 FROM applications WHERE campaign_id = p_campaign_id AND tckn = p_tckn_plain)`
2. Return single row with `exists` true/false.

**Migration**: `20260215134550_verify_member_after_whitelist_pk.sql`

### `submit_dynamic_application_secure(p_campaign_id UUID, p_tckn TEXT, p_form_data JSONB, p_client_ip TEXT DEFAULT NULL)` **(aktif)**

**Tek aktif başvuru RPC.** Tüm başvurular (basvuru, kredi, kampanya) bu RPC ile kaydedilir.

**Security**: `SECURITY DEFINER`

**Parameters**:
- `p_campaign_id` (UUID): Campaign ID
- `p_tckn` (TEXT): Plaintext TCKN
- `p_form_data` (JSONB): Form field values (phone, fullName, email extracted inside RPC)
- `p_client_ip` (TEXT, optional): Client IP for audit

**Returns**: `JSONB`
```json
{
  "success": boolean,
  "message": string,
  "code": string | null,
  "application_id": UUID | null
}
```
Codes include: `CAMPAIGN_NOT_FOUND`, `CAMPAIGN_CLOSED`, `ELIGIBILITY_FAILED`, `QUOTA_EXCEEDED`, `DUPLICATE_ENTRY`.

**Logic** (atomic in one transaction):
1. Lock campaign row `FOR UPDATE`
2. Check campaign status = 'active' and dates
3. Verify member in whitelist (is_active, !is_debtor)
4. Quota check (max_quota)
5. Duplicate check (campaign_id + tckn)
6. INSERT into applications (tckn, phone, full_name, email, status, form_data, client_ip from form_data)
7. Return success or error code

**Migrations**: `20260214000002_submit_dynamic_application_secure.sql`, `20260218140000_fix_lint_errors.sql` (status enum fix), `20260218141500_fix_lint_errors_v2.sql`.

### `submit_application_secure(...)` **DEPRECATED / REMOVED**

Eski başvuru RPC’si. Migration’larda kaldırıldı (`20260218140000_fix_lint_errors.sql`, `20260218141500_fix_lint_errors_v2.sql`). Yerine **yalnızca** `submit_dynamic_application_secure` kullanılır.

### `check_rate_limit(p_tckn TEXT, p_action TEXT)` (aktif)

TCKN ve aksiyon bazlı rate limiting. Talep ve TCKN doğrulama akışında kullanılır.

**Security**: `SECURITY DEFINER`

**Tablo**: `rate_limit_entries` (tckn, action, created_at). Anon/authenticated doğrudan yazamaz; sadece bu RPC yazar.

**Parameters**:
- `p_tckn` (TEXT): TCKN
- `p_action` (TEXT): Aksiyon adı (örn. `'verify_tckn'`)

**Returns**: `BOOLEAN` - `true` istek izinli (saat başına 3 deneme limiti), `false` limit aşıldı

**Logic**:
1. Son 1 saatte aynı (tckn, action) için kayıt sayısını say
2. 3 veya fazlaysa `false` dön
3. Yeni kayıt ekle ve `true` dön

**Deprecated**: Eski `rate_limit` tablosu ve `check_rate_limit(p_ip_address INET, p_endpoint TEXT, ...)` imzası (002_rate_limiting.sql) artık kullanılmıyor; dokümantasyonla uyum için bırakılmıştır.

### `get_application_status_by_tckn_phone(p_tckn TEXT, p_phone TEXT)`

Returns application status information for a given TCKN and phone number. Used by the "sorgula" (query) flow.

**Security**: `SECURITY DEFINER` - **Must be called with service role** to bypass RLS

**Parameters**:
- `p_tckn` (TEXT): Plaintext TCKN (11 digits)
- `p_phone` (TEXT): Phone number

**Returns**: `TABLE(id UUID, created_at TIMESTAMPTZ, status TEXT, campaign_name TEXT)`
- Returns limited fields only (no PII exposure beyond what's necessary)
- Ordered by `created_at DESC`

**Logic**:
1. Query `applications` table WHERE `tckn = p_tckn AND phone = p_phone`
2. LEFT JOIN with `campaigns` to get campaign name
3. Return id, created_at, status, campaign_name

**Usage**: Called from `queryApplicationStatus()` server action via `getServiceRoleClient()`. This RPC is the **only** way end-users can query their application status; direct table access is blocked by RLS.

**Migration**: `20260214000000_get_application_status_by_tckn_phone.sql`

### `get_active_campaigns()`

Returns all active campaigns with valid date ranges.

**Security**: `SECURITY DEFINER`

**Returns**: `TABLE(id UUID, campaign_code TEXT, name TEXT, description TEXT, start_date DATE, end_date DATE)`

**Logic**:
- Select from `campaigns` WHERE `is_active = true AND end_date >= CURRENT_DATE`
- Ordered by `start_date`

### `decrypt_tckn(p_encrypted_tckn TEXT, p_key TEXT)` **DEPRECATED**

Eski şifreleme tasarımına ait. TCKN artık düz metin saklandığı için bu RPC aktif akışta kullanılmıyor. Uygulama tarafında admin paneli `decryptApplications()` ile sadece legacy `encrypted_tckn` kolonu varsa (eski veriler) değeri döndürür; yeni şemada `applications` tablosunda `encrypted_tckn` kolonu yoktur.

### `cleanup_rate_limits()`

**Deprecated.** Eski `rate_limit` tablosu için cleanup. Aktif rate limiting `rate_limit_entries` + `check_rate_limit(p_tckn, p_action)` kullanıyor; eski tabloda zaman aşımı temizliği istenirse pg_cron ile tetiklenebilir.

## Edge Functions

### `process-email`

**Runtime**: Deno 2.x  
**Trigger**: Database webhook on `applications` table INSERT  
**Purpose**: Sends transactional emails using configured templates

**Environment Variables**:
- `SMTP_HOST`: SMTP server hostname
- `SMTP_PORT`: SMTP port (587 for TLS, 465 for SSL)
- `SMTP_USER`: SMTP username
- `SMTP_PASS`: SMTP password
- `SMTP_FROM`: Sender email address
- `SUPABASE_URL` or `MY_SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` or `MY_SERVICE_ROLE_KEY`: Service role key

**Webhook Payload**:
```json
{
  "type": "INSERT",
  "table": "applications",
  "schema": "public",
  "record": {
    "id": "uuid",
    "campaign_id": "uuid",
    "email": "applicant@example.com",
    "full_name": "Ahmet Yilmaz",
    "tckn": "12345678901",
    "phone": "5551234567",
    "form_data": { ... }
  }
}
```

**Logic**:
1. Validate webhook payload (must be `applications` INSERT)
2. Extract application data (email, name, form_data, campaign_id)
3. Fetch email configurations:
   - First, try campaign-specific configs (`campaign_id` match)
   - Fallback to global configs (`campaign_id IS NULL`)
4. For each active configuration:
   - Determine recipient email (applicant, admin, or custom)
   - Render template: Replace `{{variable}}` placeholders with form data
   - Send email via Nodemailer
5. Return summary: `{ success, attemptedConfigs, sentCount, errorCount, results, errors }`

**Template Variables**:
- `{{full_name}}`, `{{name}}`: Applicant name
- `{{email}}`: Applicant email
- `{{tckn}}`: TCKN
- `{{phone}}`: Phone number
- `{{address}}`: Delivery address
- `{{deliveryMethod}}`: Delivery method
- `{{date}}`, `{{created_at}}`: Submission date (Turkish locale)
- `{{year}}`: Current year
- Plus all keys from `form_data` JSONB

### `sync-odoo`

**Runtime**: Deno 2.x  
**Trigger**: Manual (admin-triggered) or scheduled cron job  
**Purpose**: Synchronizes member whitelist from Odoo ERP

**Environment Variables**:
- `ODOO_URL`: Odoo instance URL
- `ODOO_DB`: Odoo database name
- `ODOO_USERNAME`: Odoo username
- `ODOO_PASSWORD`: Odoo password
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key

**Authentication**: Requires `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>` header.
**Note**: This function is restricted to Service Role or Admin triggers only.

**Logic**:
1. Authenticate request (verify service role key)
2. Connect to Odoo via XML-RPC
3. Fetch partners: `res.partner.search_read([['vat', '!=', false]])`
   - Fields: `name`, `email`, `vat` (TCKN)
   - Limit: 1000 records per sync
4. Transform data:
   - Filter valid entries (must have `vat` and `name`)
   - Map: `vat` → `tckn`, `name` → `ad_soyad`
5. Upsert to `member_whitelist`:
   - Conflict resolution: `ON CONFLICT (tckn) DO UPDATE`
   - Update `synced_at` timestamp
6. Log to `sync_logs` table
7. Return: `{ message: "Sync successful", count: N }`

**Error Handling**:
- Returns `400` with error message on failure
- Logs errors to `sync_logs` table

## Security & Validation Logic

### 1. TCKN Validation (Mod10/Mod11 Algorithm)

Implemented in `web/app/basvuru/actions.ts` before any database interaction.

**Algorithm Steps**:

1. **Format Check**:
   - Must be exactly 11 digits
   - Cannot start with '0'
   - Regex: `/^[1-9][0-9]{10}$/`

2. **Mod10 Check** (10th digit validation):
   ```
   digits = [d0, d1, d2, ..., d10]
   odd_sum = d0 + d2 + d4 + d6 + d8
   even_sum = d1 + d3 + d5 + d7
   digit_10 = (odd_sum * 7 - even_sum) % 10
   Validation: digit_10 must equal d9
   ```

3. **Mod11 Check** (11th digit validation):
   ```
   total_sum = sum(d0...d9)
   digit_11 = total_sum % 10
   Validation: digit_11 must equal d10
   ```

**Implementation**: `validateTckn(tckn: string): boolean` in Server Actions

### 2. Session Security (HMAC Tokens)

Prevents replay attacks and secures multi-step form flow.

**Token Structure**:
- **Secret**: `SESSION_SECRET` environment variable
- **Payload**: `{ tckn: string, exp: timestamp }`
- **Expiration**: 15 minutes from creation
- **Signature**: HMAC-SHA256 of base64-encoded payload
- **Format**: `base64(payload) + "." + hex(signature)`

**Functions**:
- `createSessionToken(tckn: string): string` - Generates signed token
- `verifySessionToken(token: string): string | null` - Verifies and extracts TCKN

**Usage**:
1. Generated after successful TCKN verification (`checkTcknStatus`)
2. Included in form submission payload
3. Verified in `submitApplication` before processing

### 3. Rate Limiting

TCKN + action rate limiting at the database level.

**Implementation**: `check_rate_limit(p_tckn, p_action)` RPC (20260214000005)

**Limits**: 3 requests per hour per (TCKN, action) pair (e.g. `verify_tckn`)

**Storage**: `rate_limit_entries` table

### 4. Row-Level Security (RLS)

All tables have RLS enabled with policies:

**Public Policies (Anon Key)**:
- `campaigns`: Read access to active campaigns (`is_active = true AND end_date >= CURRENT_DATE`)
- `member_whitelist`: **No direct table access** - Anon SELECT blocked (`member_whitelist_no_anon` policy). Access only via `verify_member()` RPC.
- `applications`: **No direct table access** - Anon SELECT blocked (`applications_no_anon` policy). Insert allowed via RPC (`applications_anon_insert`). Status queries must use `get_application_status_by_tckn_phone()` RPC with service role.

**Admin Policies (Authenticated + Admin Check)**:
- Uses `is_admin(auth.uid())` helper function to check `admins` table membership
- Full access to `campaigns` (`campaigns_admin_all`), `applications` (`applications_admin_all`), `member_whitelist` (`member_whitelist_admin_all`), `email_configurations`, `admins`
- Read access to `audit_logs` (`audit_logs_admin_all`), `sync_logs`
- Role-based restrictions: `viewer` role cannot decrypt TCKN or modify data

**Service Role**:
- Bypasses all RLS policies (used by Edge Functions, migrations, and secure RPC calls)
- **Required for**: `get_application_status_by_tckn_phone()` RPC calls (queryApplicationStatus flow)
- **Usage**: Server-side only, never exposed to client. Created via `getServiceRoleClient()` helper.

**End-User Query Pattern**:
- **Status Queries**: `queryApplicationStatus()` → Uses `getServiceRoleClient()` → Calls `get_application_status_by_tckn_phone()` RPC
- **Rationale**: RPC returns limited fields (id, created_at, status, campaign_name) and bypasses RLS safely. Direct table access is blocked for anon users.

## Database Triggers

### `notify_application_submitted()`

**Trigger**: `AFTER INSERT ON applications`  
**Purpose**: Notifies Edge Function webhook on new application submission

**Implementation**: Database webhook configured in Supabase dashboard to call `process-email` Edge Function

**Note**: Actual webhook configuration is managed via Supabase dashboard, not SQL triggers

## Migration Strategy

Migrations are stored in `supabase/migrations/` directory and applied sequentially:

1. **Local Development**: `npx supabase db reset` (applies all migrations)
2. **Production**: `supabase db push` or via Supabase dashboard

**Naming Convention**: `YYYYMMDDHHMMSS_description.sql`

**Key Migrations**:
- `001_initial_schema.sql`: Core tables and initial RLS policies
- `002_rate_limiting.sql`: Eski rate_limit tablosu (deprecated)
- `20260214000005_missing_schema_parity.sql`: `rate_limit_entries` + `check_rate_limit(p_tckn, p_action)`
- `20240202130000_security_updates.sql`: Admin table, audit logs, applications table
- `20260203000000_update_schema_and_roles.sql`: Role-based access, plaintext TCKN migration
- `20260204120000_fix_security_and_schema.sql`: Final schema fixes, RPC functions
- `20260211183143_add_status_and_notes_to_submissions.sql`: Application status enum

### Historical Encryption Design (Deprecated)

The system initial design included a `tckn_hash` column for lookups and an `encrypted_tckn` column using `pgcrypto` for secure storage. 

**Status**: As of Feb 2026, the system was migrated to use **plaintext TCKN** to simplify administrative workflows and bulk operations. The `encrypted_tckn` columns remain in the schema for compatibility but are no longer the primary storage mechanism. Legacy encryption functions (`encrypt_tckn`, `decrypt_tckn`) are deprecated.

See `SECURITY_AND_PRIVACY_NOTES.md` for more details.

---

**Next**: See [FRONTEND.md](./FRONTEND.md) for React component architecture and state management.
