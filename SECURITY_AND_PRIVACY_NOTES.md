# Security & Privacy Notes

## 1. Data Storage & Protection

### 1.1 TCKN Storage (Plaintext Decision)

**Decision**: The system currently stores TCKN (Turkish Identity Number) in **plaintext** in the `member_whitelist` and `applications` tables.

**Rationale**:
- **Business Requirement**: Direct matching and searchability of TCKN were prioritized for administrative operations and bulk uploads.
- **Legacy Encryption (Deprecated)**: Initial designs included a `tckn_hash` and `encrypted_tckn` column using `pgcrypto`. These columns exist in the schema but are **not currently used** as the primary source of truth.
- **Access Control**: Security is enforced via **Row-Level Security (RLS)** policies. Only authenticated admins with the `admin` role can view TCKNs. The `viewer` role is restricted.

**Risk Mitigation**:
- **RLS**: Strict database-level policies prevent unauthorized access.
- **Audit Logs**: All access to sensitive data is logged in the `audit_logs` table.
- **Limited Access**: Application server uses a Service Role key, but Client-side access is strictly limited via RLS.

### 1.2 Session Security

- **HMAC Tokens**: Multi-step forms (TCKN verification -> Application form) use signed HMAC tokens to ensure the TCKN validated in step 1 is the same one submitted in step 2.
- **Expiration**: Tokens are short-lived (15 minutes).

## 2. API Security

- **Rate Limiting**: IP-based rate limiting is implemented at the database level (`rate_limit` table) to prevent abuse of the TCKN verification endpoint.
- **Input Validation**: TCKN format is validated using Mod10/Mod11 algorithms before any database query.

## 3. Resolved Improvements

- ✅ **Odoo Sync Auth**: The `sync-odoo` Edge Function now enforces Service Role key validation. Unauthorized requests receive a 403 Forbidden response.
- ✅ **Dynamic Campaign Flow**: The dynamic campaign submission flow (`submitDynamicApplication`) has been hardened to use the `submit_application_secure` RPC with rate limiting and whitelist verification.

> **📖 Full Details**: See [`docs/BACKEND.md`](./docs/BACKEND.md) for comprehensive security documentation.
