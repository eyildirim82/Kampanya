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
- `id` (UUID, PK): Primary key
- `tckn` (TEXT, UNIQUE, NOT NULL): Turkish Identity Number (plaintext). See [Historical Encryption Design](#historical-encryption-design-deprecated).
- `masked_name` (TEXT): Partially masked name for display (e.g., "Ah*** Y***")
- `is_active` (BOOLEAN, DEFAULT true): Member eligibility status
- `synced_at` (TIMESTAMPTZ, DEFAULT NOW()): Last Odoo sync timestamp
- `updated_at` (TIMESTAMPTZ, DEFAULT NOW())

**Indexes**:
- `idx_whitelist_tckn`: On `tckn`
- `idx_whitelist_active`: Partial index on `is_active` WHERE `is_active = true`

**RLS Policies**:
- Public read access for verification: `is_active = true` (via RPC function)
- Admin full access: Authenticated admins

#### 3. `applications`

Stores all campaign application submissions with form data and consent metadata.

**Columns**:
- `id` (UUID, PK): Primary key
- `campaign_id` (UUID, FK → `campaigns.id`): Associated campaign
- `member_id` (UUID, FK → `member_whitelist.id`): Verified member reference
- `tckn` (TEXT, NOT NULL): TCKN (plaintext, primary identifier)
- `encrypted_tckn` (TEXT, NOT NULL): **DEPRECATED**. Legacy field from initial encryption design. Currently stores plaintext or matches `tckn`.
- `full_name` (TEXT, NOT NULL): Applicant full name
- `email` (TEXT, NOT NULL): Applicant email
- `phone` (TEXT, NOT NULL): Applicant phone number
- `address` (TEXT): Delivery address (if applicable)
- `city` (TEXT): City
- `district` (TEXT): District
- `form_data` (JSONB, DEFAULT '{}'): Dynamic form field values
- `dynamic_data` (JSONB, DEFAULT '{}'): Additional campaign-specific data
- `status` (ENUM: `PENDING`, `APPROVED`, `REJECTED`, `REVIEWING`, DEFAULT `PENDING`)
- `admin_notes` (TEXT): Internal admin notes
- `address_sharing_consent` (BOOLEAN, DEFAULT false): Address sharing consent
- `card_application_consent` (BOOLEAN, DEFAULT false): Card application consent
- `tckn_phone_sharing_consent` (BOOLEAN, DEFAULT false): TCKN/phone sharing consent
- `kvkk_consent` (BOOLEAN, DEFAULT false): KVKK (GDPR) consent
- `open_consent` (BOOLEAN, DEFAULT false): Open banking consent
- `communication_consent` (BOOLEAN, DEFAULT false): Communication consent
- `consent_metadata` (JSONB, DEFAULT '{}'): IP, user agent, timestamp, consent version
- `created_at` (TIMESTAMPTZ, DEFAULT NOW())

**Constraints**:
- Unique constraint: `(campaign_id, member_id)` - Prevents duplicate applications per campaign
- Unique constraint: `(campaign_id, tckn)` - Additional TCKN-based duplicate prevention

**Indexes**:
- `idx_applications_campaign`: On `campaign_id`
- `idx_applications_created`: On `created_at DESC`
- `idx_applications_status`: On `status`

**RLS Policies**:
- Public insert: Anyone can submit applications
- Admin read: Authenticated admins can view all applications
- Admin update/delete: Admin role only (viewer role cannot modify)

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

**Security**: `SECURITY DEFINER` (executes with superuser privileges to bypass RLS)

**Parameters**:
- `p_tckn` (TEXT): Plaintext TCKN

**Returns**: `TABLE(id UUID, status TEXT)`
- `id`: Member UUID if found
- `status`: `'FOUND'` or `'NOT_FOUND'`

**Logic**:
1. Query `member_whitelist` WHERE `tckn = p_tckn AND is_active = true`
2. Return member ID and status

**Usage**: Called from Server Actions after Mod10/Mod11 validation

### `check_existing_application(p_tckn_plain TEXT, p_campaign_id UUID, p_member_id UUID)`

Checks if an application already exists for a given TCKN and campaign.

**Security**: `SECURITY DEFINER`

**Parameters**:
- `p_tckn_plain` (TEXT): Plaintext TCKN
- `p_campaign_id` (UUID): Campaign ID
- `p_member_id` (UUID): Member ID

**Returns**: `JSONB`
```json
{
  "exists": boolean,
  "application_id": UUID | null,
  "found_by": "tckn" | "member_id" | null
}
```

**Logic**:
1. Check by TCKN: `SELECT id FROM applications WHERE campaign_id = p_campaign_id AND tckn = p_tckn_plain`
2. If not found, check by member_id (for legacy records)
3. Return existence status

### `submit_application_secure(p_tckn_plain TEXT, p_campaign_id UUID, p_encrypted_tckn TEXT, p_form_data JSONB, p_consent_metadata JSONB)`

Securely submits an application with duplicate checking and validation.

**Security**: `SECURITY DEFINER`

**Parameters**:
- `p_tckn_plain` (TEXT): Plaintext TCKN
- `p_campaign_id` (UUID): Campaign ID
- `p_encrypted_tckn` (TEXT): Encrypted TCKN (currently stores plaintext)
- `p_form_data` (JSONB): Form field values
- `p_consent_metadata` (JSONB): IP, user agent, timestamp, consent version

**Returns**: `JSONB`
```json
{
  "success": boolean,
  "message": string,
  "application_id": UUID | null
}
```

**Logic**:
1. Verify member exists in whitelist: `SELECT id FROM member_whitelist WHERE tckn = p_tckn_plain AND is_active = true`
2. Check duplicate: `SELECT id FROM applications WHERE campaign_id = p_campaign_id AND tckn = p_tckn_plain`
3. Insert application with all fields
4. Return success status and application ID

**Triggers**: Fires `notify_application_submitted()` trigger on INSERT

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

### `get_active_campaigns()`

Returns all active campaigns with valid date ranges.

**Security**: `SECURITY DEFINER`

**Returns**: `TABLE(id UUID, campaign_code TEXT, name TEXT, description TEXT, start_date DATE, end_date DATE)`

**Logic**:
- Select from `campaigns` WHERE `is_active = true AND end_date >= CURRENT_DATE`
- Ordered by `start_date`

### `decrypt_tckn(p_encrypted_tckn TEXT, p_key TEXT)`

Decrypts TCKN for admin viewing (restricted to admin role, not viewer).

**Security**: `SECURITY DEFINER` with role checking

**Parameters**:
- `p_encrypted_tckn` (TEXT): Encrypted TCKN (hex-encoded)
- `p_key` (TEXT): Decryption key

**Returns**: `TEXT` - Decrypted TCKN or `NULL` on error

**Logic**:
1. Check authentication: `auth.role() = 'authenticated'` or `'service_role'`
2. Check admin role: Query `admins` table, ensure role != 'viewer'
3. Decrypt using `pgp_sym_decrypt()` with `pgcrypto` extension
4. Log to `audit_logs` table
5. Return decrypted value

**Audit**: All decryption attempts logged to `audit_logs` with action `'DECRYPT_TCKN'`

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

**Public Policies**:
- `campaigns`: Read access to active campaigns (`is_active = true AND end_date >= CURRENT_DATE`)
- `member_whitelist`: Read access via RPC function only (no direct table access)
- `applications`: Insert only (public can submit, cannot read)

**Admin Policies**:
- Full access to `campaigns`, `applications`, `email_configurations`, `admins`
- Read access to `audit_logs`, `sync_logs`
- Role-based restrictions: `viewer` role cannot decrypt TCKN or modify data

**Service Role**:
- Bypasses all RLS policies (used by Edge Functions and migrations)

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
