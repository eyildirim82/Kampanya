# Security & Privacy Notes

## 1. Data Storage & Protection

### 1.1 TCKN Storage (Plaintext Decision)

**Decision**: The system currently stores TCKN (Turkish Identity Number) in **plaintext** in the `member_whitelist` and `applications` tables.

**Rationale**:
- **Business Requirement**: Direct matching and searchability of TCKN were prioritized for administrative operations and bulk uploads.
- **Legacy Encryption (Deprecated)**: Earlier designs included hashed/encrypted TCKN; the system was intentionally migrated to **plaintext storage**. Legacy functions/columns (`encrypt_tckn`, `decrypt_tckn`, `tckn_hash`) are no longer part of the active flow. The current migration-defined schema does not include `encrypted_tckn` on `applications`.
- **Access Control**: Security is enforced via **Row-Level Security (RLS)** policies. Only authenticated admins (in `admins` table) can access applications and member_whitelist. Anon cannot INSERT into `applications` directly; inserts go only through the `submit_dynamic_application_secure` RPC.

**Compensating Controls**:
- **RLS**: Database-level policies restrict table access; anon has no direct SELECT on applications/member_whitelist.
- **Audit Logs**: Sensitive admin actions are logged in `audit_logs`.
- **Limited Admin**: Only authenticated users in `admins` table get full access; service role is used only for specific server-side operations (e.g. sorgula RPC).
- **PII Redaction**: `lib/logger.ts` redacts tckn, phone, email, and other PII in logs.

### 1.2 Session Security

- **HMAC Tokens**: Multi-step forms (TCKN verification -> Application form) use signed HMAC tokens to ensure the TCKN validated in step 1 is the same one submitted in step 2.
- **Expiration**: Tokens are short-lived (15 minutes).

## 2. API Security

- **Rate Limiting**: TCKN + action rate limiting at the database level via `check_rate_limit(p_tckn, p_action)` RPC and `rate_limit_entries` table (e.g. 3 requests per hour per TCKN/action). Legacy IP-based `rate_limit` table is deprecated.
- **Input Validation**: TCKN format is validated using Mod10/Mod11 algorithms before any database query.

## 3. Logging & PII Redaction

### 3.1 PII Redaction Rules

**Implementation**: `lib/logger.ts` provides centralized logging with automatic PII redaction.

**Redacted Fields** (defined in `PII_KEYS`):
- `tckn`, `tc`, `identityNumber` - Turkish Identity Numbers
- `phone` - Phone numbers
- `email`, `member_email` - Email addresses
- `full_name`, `fullName` - Full names
- `token`, `otp`, `sessionToken` - Authentication tokens

**Redaction Behavior**:
- Fields matching PII keys (case-insensitive, substring match) are replaced with `[REDACTED]`
- Nested objects are recursively processed
- Arrays and Error objects are preserved as-is

**Code Review Rule**: When adding new PII fields to the codebase, **must** add them to `PII_KEYS` in `lib/logger.ts` before merging.

### 3.2 Logging Standards

**Required**: All server-side logging must use `logger` from `lib/logger.ts`:
- `logger.error()` - For errors
- `logger.warn()` - For warnings
- `logger.info()` - For informational messages
- `logger.debug()` - For debug messages (only in development)

**Prohibited**: Direct `console.log()`, `console.error()`, etc. in production code (scripts excluded):
- ❌ `console.log(email, tckn)` - PII exposure risk
- ✅ `logger.info('User login', { email: '[REDACTED]', tckn: '[REDACTED]' })` - Safe

**Exception**: Error boundaries (`app/error.tsx`, `app/admin/error.tsx`) may use `console.error()` for critical error reporting, but should avoid logging PII.

## 4. Resolved Improvements

- ✅ **Odoo Sync Auth**: The `sync-odoo` Edge Function now enforces Service Role key validation. Unauthorized requests receive a 403 Forbidden response.
- ✅ **Dynamic Campaign Flow**: The dynamic campaign submission flow uses the **`submit_dynamic_application_secure`** RPC (the only active submission path). It enforces whitelist, quota, duplicate check, and campaign status; anon direct INSERT on `applications` has been removed (migration 20260215135100).
- ✅ **PII Logging**: Centralized logger with automatic PII redaction implemented. All server actions use structured logging.

> **📖 Full Details**: See [`docs/BACKEND.md`](./docs/BACKEND.md) for comprehensive security documentation.
