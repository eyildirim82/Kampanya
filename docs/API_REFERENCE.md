# API Reference

## Overview

This document provides comprehensive documentation for all API endpoints, RPC functions, and integration points in the Member Verification System. The API is primarily built on Supabase (PostgreSQL RPC functions and Edge Functions) with Next.js API routes for authentication flows.

## Authentication

### Admin Authentication

**Flow**: Email/password authentication via Supabase Auth

**Endpoint**: Server Action `adminLogin(formData: FormData)`

**Request**:
```typescript
FormData {
  email: string;
  password: string;
}
```

**Response**:
```typescript
{
  success: boolean;
  message: string;
  redirectUrl?: string; // '/admin' on success
}
```

**Session**: JWT tokens stored in HttpOnly cookies:
- `sb-access-token`: Access token
- `sb-refresh-token`: Refresh token
- Expiration: 7 days

### Member Authentication (OTP Flow)

**Flow**: TCKN verification → OTP email → Session creation

#### Step 1: Check TCKN Status

**Endpoint**: `POST /api/auth/check`

**Request**:
```json
{
  "tckn": "12345678901"
}
```

**Response**:
```json
{
  "status": "OTP_SENT" | "REDIRECT_FORM",
  "emailMasked": "a***@example.com" // Only if OTP_SENT
}
```

**Error Responses**:
- `404`: Member not found in whitelist
- `500`: System error

**Logic**:
1. Call RPC `check_member_status(input_tckn)`
2. If member exists and has existing application: Return `REDIRECT_FORM`
3. If member exists: Send OTP via Supabase Auth `signInWithOtp()`, return `OTP_SENT`

#### Step 2: Verify OTP

**Endpoint**: `POST /api/auth/verify`

**Request**:
```json
{
  "tckn": "12345678901",
  "otp": "123456"
}
```

**Response**:
```json
{
  "success": true,
  "session": {
    "access_token": "...",
    "refresh_token": "...",
    "user": { ... }
  }
}
```

**Error Responses**:
- `400`: Invalid or expired OTP
- `404`: Member not found
- `500`: System error

**Logic**:
1. Get member email via RPC `check_member_status(input_tckn)`
2. Verify OTP via Supabase Auth `verifyOtp()`
3. Return session object

## RPC Functions (Database Stored Procedures)

All RPC functions are callable via Supabase client:

```typescript
const { data, error } = await supabase.rpc('function_name', { param1: value1 });
```

### `verify_member(p_tckn TEXT)`

Verifies if a TCKN exists in the member whitelist.

**Security**: `SECURITY DEFINER` (bypasses RLS)

**Parameters**:
- `p_tckn` (TEXT): Plaintext TCKN

**Returns**: `TABLE(id UUID, status TEXT)`
```typescript
[
  { id: "uuid", status: "FOUND" } | { id: null, status: "NOT_FOUND" }
]
```

**Usage**: Called from Server Actions after Mod10/Mod11 validation

**Example**:
```typescript
const { data } = await supabase.rpc('verify_member', { p_tckn: '12345678901' });
if (data && data[0]?.status === 'FOUND') {
  // Member verified
}
```

### `check_member_status(input_tckn TEXT)`

Checks member status and returns email for OTP flow.

**Security**: `SECURITY DEFINER`

**Parameters**:
- `input_tckn` (TEXT): Plaintext TCKN

**Returns**: `TABLE(member_exists BOOLEAN, has_app BOOLEAN, member_email TEXT)`
```typescript
[
  {
    member_exists: true,
    has_app: false,
    member_email: "member@example.com"
  }
]
```

**Usage**: Called from `/api/auth/check` endpoint

### `check_existing_application(p_tckn_plain TEXT, p_campaign_id UUID, p_member_id UUID)`

Checks if an application already exists for a TCKN and campaign.

**Security**: `SECURITY DEFINER`

**Parameters**:
- `p_tckn_plain` (TEXT): Plaintext TCKN
- `p_campaign_id` (UUID): Campaign ID
- `p_member_id` (UUID): Member ID

**Returns**: `JSONB`
```json
{
  "exists": true,
  "application_id": "uuid",
  "found_by": "tckn" | "member_id"
}
```

**Usage**: Called from `checkTcknStatus` Server Action

### `submit_application_secure(p_tckn_plain TEXT, p_campaign_id UUID, p_encrypted_tckn TEXT, p_form_data JSONB, p_consent_metadata JSONB)`

Securely submits an application with duplicate checking and validation.

**Security**: `SECURITY DEFINER`

**Parameters**:
- `p_tckn_plain` (TEXT): Plaintext TCKN
- `p_campaign_id` (UUID): Campaign ID
- `p_encrypted_tckn` (TEXT): Encrypted TCKN (currently stores plaintext)
- `p_form_data` (JSONB): Form field values
  ```json
  {
    "fullName": "Ahmet Yilmaz",
    "email": "ahmet@example.com",
    "phone": "5551234567",
    "address": "İstanbul",
    "delivery_method": "Şubeden Teslim",
    "address_sharing_consent": true,
    "card_application_consent": true,
    "tckn_phone_sharing_consent": true
  }
  ```
- `p_consent_metadata` (JSONB): IP, user agent, timestamp, consent version
  ```json
  {
    "ip": "1.2.3.4",
    "userAgent": "Mozilla/5.0...",
    "timestamp": "2026-02-11T12:00:00Z",
    "consentVersion": "v1.0"
  }
  ```

**Returns**: `JSONB`
```json
{
  "success": true,
  "message": "Başvurunuz başarıyla alınmıştır.",
  "application_id": "uuid"
}
```

**Error Responses**:
```json
{
  "success": false,
  "message": "Bu kampanya için zaten başvurunuz bulunmaktadır."
}
```

**Usage**: Called from `submitApplication` Server Action

**Triggers**: Fires `notify_application_submitted()` trigger → Edge Function webhook

### `check_rate_limit(p_tckn TEXT, p_action TEXT)` (aktif)

TCKN ve aksiyon bazlı rate limiting. Tablo: `rate_limit_entries`.

**Security**: `SECURITY DEFINER`

**Parameters**:
- `p_tckn` (TEXT): TCKN
- `p_action` (TEXT): Aksiyon (örn. `'verify_tckn'`)

**Returns**: `BOOLEAN` – saat başına 3 deneme limiti; `true` izinli, `false` limit aşıldı

**Usage**: Talep ve TCKN doğrulama akışında (basvuru/actions, talep/actions)

**Example**:
```typescript
const { data: isAllowed } = await supabase.rpc('check_rate_limit', {
  p_tckn: tckn,
  p_action: 'verify_tckn'
});
if (!isAllowed) {
  return { success: false, message: 'Çok fazla deneme. Lütfen bir saat sonra tekrar deneyin.' };
}
```

**Deprecated**: Eski imza `check_rate_limit(p_ip_address, p_endpoint, p_max_requests, p_window_minutes)` ve `rate_limit` tablosu kullanılmıyor.

### `get_active_campaigns()`

Returns all active campaigns with valid date ranges.

**Security**: `SECURITY DEFINER`

**Returns**: `TABLE(id UUID, campaign_code TEXT, name TEXT, description TEXT, start_date DATE, end_date DATE)`

**Usage**: Called from Server Components for campaign listings

### `decrypt_tckn(p_encrypted_tckn TEXT, p_key TEXT)`

Decrypts TCKN for admin viewing (restricted to admin role, not viewer).

**Security**: `SECURITY DEFINER` with role checking

**Parameters**:
- `p_encrypted_tckn` (TEXT): Encrypted TCKN (hex-encoded)
- `p_key` (TEXT): Decryption key

**Returns**: `TEXT` - Decrypted TCKN or `NULL` on error

**Authorization**: 
- Requires authenticated admin role
- Viewer role cannot decrypt (raises exception)
- Service role bypasses checks

**Audit**: Logs to `audit_logs` table with action `'DECRYPT_TCKN'`

**Usage**: Called from admin dashboard when viewing application details

## Edge Functions

### `process-email`

**Runtime**: Deno 2.x  
**Trigger**: Database webhook on `applications` table INSERT  
**Endpoint**: `POST /functions/v1/process-email` (internal, triggered by Supabase)

**Purpose**: Sends transactional emails using configured templates

**Webhook Payload** (from Supabase):
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
    "address": "İstanbul",
    "form_data": {
      "deliveryMethod": "Şubeden Teslim",
      ...
    }
  },
  "old_record": null
}
```

**Response**:
```json
{
  "success": true,
  "attemptedConfigs": 2,
  "sentCount": 2,
  "errorCount": 0,
  "results": [
    { "email": "applicant@example.com", "id": "message-id-1" },
    { "email": "admin@example.com", "id": "message-id-2" }
  ],
  "errors": [],
  "skipped": []
}
```

**Error Response**:
```json
{
  "error": "Configuration Error",
  "diagnostics": {
    "hasSupabaseUrl": true,
    "hasServiceRoleKey": true,
    "configCount": 0,
    "configError": "..."
  }
}
```

**Environment Variables**:
- `SMTP_HOST`: SMTP server hostname
- `SMTP_PORT`: SMTP port (587 for TLS, 465 for SSL)
- `SMTP_USER`: SMTP username
- `SMTP_PASS`: SMTP password
- `SMTP_FROM`: Sender email address
- `SUPABASE_URL` or `MY_SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` or `MY_SERVICE_ROLE_KEY`: Service role key

**Template Variables**: See [BACKEND.md](./BACKEND.md#edge-functions) for complete list

### `sync-odoo`

**Runtime**: Deno 2.x  
**Trigger**: Manual (admin-triggered) or scheduled cron job  
**Endpoint**: `POST /functions/v1/sync-odoo`

**Purpose**: Synchronizes member whitelist from Odoo ERP

**Authentication**: Requires `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>` header

**Request**: Empty body (or optional parameters)

**Response**:
```json
{
  "message": "Sync successful",
  "count": 1543
}
```

**Error Response**:
```json
{
  "error": "Missing Odoo configuration"
}
```

**Environment Variables**:
- `ODOO_URL`: Odoo instance URL
- `ODOO_DB`: Odoo database name
- `ODOO_USERNAME`: Odoo username
- `ODOO_PASSWORD`: Odoo password
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key

**Logic**: See [BACKEND.md](./BACKEND.md#edge-functions) for detailed flow

## Server Actions (Next.js)

Server Actions are server-side functions that can be called directly from Client Components.

### Public Server Actions

#### `checkTcknStatus(tckn: string, campaignId?: string)`

**Location**: `app/basvuru/actions.ts`

**Purpose**: Validates TCKN and checks member whitelist status

**Parameters**:
- `tckn` (string): 11-digit TCKN
- `campaignId` (string, optional): Campaign ID

**Returns**:
```typescript
{
  status: 'NEW_MEMBER' | 'EXISTS' | 'BLOCKED' | 'NOT_FOUND' | 'INVALID' | 'ERROR';
  message: string;
  memberId?: UUID;
  sessionToken?: string; // HMAC token, only on NEW_MEMBER
}
```

**Logic**:
1. Validate TCKN format and Mod10/Mod11 algorithm
2. Call RPC `verify_member(p_tckn_plain)`
3. Check for existing application via RPC `check_existing_application()`
4. Generate HMAC session token if new member
5. Return status and token

#### `submitApplication(prevState: FormState, formData: FormData)`

**Location**: `app/basvuru/actions.ts`

**Purpose**: Submits application with session token validation

**Parameters**:
- `prevState` (FormState): Previous form state (React Hook Form)
- `formData` (FormData): Form data including session token

**Returns**:
```typescript
{
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
}
```

**Validation**:
- Session token verification (HMAC signature check)
- Zod schema validation
- Rate limiting check
- Duplicate application check (via RPC)

**Logic**:
1. Verify session token signature and expiration
2. Validate form data with Zod schema
3. Check rate limit via RPC
4. Submit via RPC `submit_application_secure()`
5. Return success/error response

#### `getCampaignBySlug(slug: string)`

**Location**: `app/kampanya/actions.ts`

**Purpose**: Fetches campaign configuration by slug

**Parameters**:
- `slug` (string): Campaign slug

**Returns**:
```typescript
{
  id: UUID;
  campaign_code: string;
  name: string;
  slug: string;
  form_schema: FormField[];
  page_content: Record<string, any>;
  is_active: boolean;
  // ... other fields
} | null
```

### Admin Server Actions

#### `adminLogin(formData: FormData)`

**Location**: `app/admin/actions.ts`

**Purpose**: Authenticates admin user

**Parameters**: FormData with `email` and `password`

**Returns**:
```typescript
{
  success: boolean;
  message: string;
  redirectUrl?: string;
}
```

**Logic**:
1. Authenticate via Supabase Auth `signInWithPassword()`
2. Verify admin role in `admins` table
3. Set HttpOnly cookies with JWT tokens
4. Return success with redirect URL

#### `getApplications(campaignId?: string, page?: number)`

**Location**: `app/admin/actions.ts`

**Purpose**: Fetches applications with pagination

**Parameters**:
- `campaignId` (string, optional): Filter by campaign
- `page` (number, optional): Page number (default: 1)

**Returns**:
```typescript
{
  data: Application[];
  count: number;
}
```

**Pagination**: Currently client-side (backend pagination planned)

#### `updateApplicationStatus(id: string, status: string)`

**Location**: `app/admin/actions.ts`

**Purpose**: Updates application status

**Parameters**:
- `id` (string): Application ID
- `status` (string): New status (`'PENDING' | 'APPROVED' | 'REJECTED' | 'REVIEWING'`)

**Returns**:
```typescript
{
  success: boolean;
  message?: string;
}
```

**Authorization**: Requires admin role (not viewer)

## Error Handling

### Standard Error Responses

All API endpoints return consistent error formats:

**Success**:
```json
{
  "success": true,
  "data": { ... }
}
```

**Error**:
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE" // Optional
}
```

### Error Codes

- `INVALID_TCKN`: TCKN validation failed
- `MEMBER_NOT_FOUND`: TCKN not in whitelist
- `DUPLICATE_APPLICATION`: Application already exists
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `SESSION_EXPIRED`: Session token expired
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `VALIDATION_ERROR`: Form validation failed
- `SYSTEM_ERROR`: Internal server error

## Rate Limiting

**Implementation**: PostgreSQL-based rate limiting via `check_rate_limit()` RPC

**Default Limits**:
- `submit_application`: 100 requests per 60 minutes per IP

**Headers**: No rate limit headers returned (check via RPC response)

**Error Response**: `{ success: false, message: 'Rate limit exceeded' }`

## CORS

**Public Endpoints**: CORS enabled for all origins (configured in Supabase)

**Admin Endpoints**: Cookie-based authentication (no CORS needed)

**Edge Functions**: CORS headers configured in function code

---

**Next**: See [DEVELOPMENT.md](./DEVELOPMENT.md) for setup and contribution guidelines.
