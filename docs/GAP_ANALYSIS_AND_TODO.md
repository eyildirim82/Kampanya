# Gap Analysis & TODO Roadmap

## 1. Purpose

This document captures **known gaps, risks, and pending work** in the Member Verification System.  
It is intended as a **starting point for the new owning team** to plan hardening, refactoring, and feature-complete work.

> **Scope**: Only items that are observable in the current codebase and migrations are listed. No hypothetical or speculative features are included.

---

## 2. Security & Compliance Gaps

### 2.1 Plaintext TCKN vs Legacy Encryption/Hashing

**Current State**

- TCKN is stored **in plaintext** in:
  - `member_whitelist.tckn`
  - `applications.tckn`
- Migrations show an earlier design based on:
  - `tckn_hash` (SHA-256)
  - `encrypt_tckn` / `decrypt_tckn` functions using `pgcrypto`
- Some legacy functions and validation logic (e.g. `SECRET_SALT`, `TCKN_ENCRYPTION_KEY` in `config-validation.ts`) are still present but **not aligned** with the final plaintext design.

**Risks / Impact**

- Potential confusion for future developers and auditors about whether TCKN is expected to be encrypted/hashed or not.
- Risk of erroneously reusing legacy encryption paths or assuming encryption is in place when it is not.

**Actions**

- **Documentation**
  - [ ] In `BACKEND.md`, add a **“Historical Encryption Design (Deprecated)”** subsection explicitly stating that:
    - The system **used to** store hashed/encrypted TCKN.
    - It was intentionally migrated to **plaintext storage** (with rationale and date).
    - Legacy functions (`encrypt_tckn`, `decrypt_tckn`, `tckn_hash` columns) are no longer part of the active flow.
  - [ ] In `SECURITY_AND_PRIVACY_NOTES.md`, document the privacy/security implications and compensating controls (RLS, audit logs, limited admin access).
- **Code**
  - [ ] If encryption is not planned to return, mark legacy functions as **deprecated** in comments, or schedule their removal in a controlled migration.
  - [ ] Align `config-validation.ts` with the actual usage:
    - Either remove `SECRET_SALT` / `TCKN_ENCRYPTION_KEY` requirements,
    - Or clearly mark them as **unused** until encryption is re-enabled.

### 2.2 Dynamic Campaign Flow Security (DynamicForm + submitDynamicApplication)

**Current State**

- Dynamic campaigns use `components/DynamicForm.tsx` (client) and server actions that call **`submit_dynamic_application_secure`** RPC (e.g. `app/actions.ts`). Direct `.from('applications').insert()` is no longer used for campaign submissions; anon direct INSERT was removed (migration `20260215135100`). The same RPC enforces whitelist, quota, duplicate check, and campaign status.
- **Resolved:** Kampanya akışı artık güvenli RPC kullanıyor; dokümantasyon BACKEND.md ve TECHNICAL_HEALTH ile güncellendi.

**Remaining (Documentation)**

- [ ] In `FRONTEND.md`, document that the dynamic campaign flow uses `submit_dynamic_application_secure` with the same business rules as `/basvuru`.

### 2.2a Sorgula TCKN Validasyonu

**Current State**

- `app/actions.ts` içindeki `queryApplicationStatus` TCKN’i yalnızca `length === 11` ile kontrol ediyor. `lib/tckn.validateTckn` veya `lib/schemas.tcknSchema` kullanılmıyor.

**Risks / Impact**

- Geçersiz TCKN (Mod10/Mod11’e uymayan) ile sorgu yapılabilir; KVKK ve veri tutarlılığı açısından diğer akışlarla uyum sağlanmalı.

**Actions**

- [ ] `queryApplicationStatus` içinde TCKN için `validateTckn` veya `tcknSchema.safeParse` kullanın; hata mesajını kullanıcıya uygun dönün.

### 2.3 sync-odoo Authorization

**Current State**

- `supabase/functions/sync-odoo/index.ts`:
  - Expects `Authorization` header.
  - Builds a Supabase client with that header and calls `supabaseClient.auth.getUser()`.
  - Currently any authenticated Supabase user can, in principle, trigger the sync (TODO in code mentions “stricter Admin check”).

**Risks / Impact**

- Overly permissive access: any authenticated user capable of calling this Edge Function could trigger synchronization against Odoo.
- Could lead to unintended load, data inconsistency, or audit issues.

**Actions**

- **Short-Term**
  - [ ] In `BACKEND.md` Edge Functions section, clearly label `sync-odoo` as requiring hardening and indicate that **only admins** should be allowed to call it.
- **Medium-Term**
  - [ ] Change auth model to one of:
    - Require **Service Role** key in `Authorization` header (no end-user calling).
    - Or require the Supabase user to be present in `admins` table with role `admin`.
  - [ ] Add explicit checks and clear error messages (`403 Forbidden`).

### 2.4 process-email Debug Instrumentation

**Current State**

- `process-email` Edge Function includes multiple calls to `http://127.0.0.1:7247/ingest/...` for internal debugging/agent logging.
- All are wrapped in `.catch(() => {})`, so they fail silently if the endpoint is not available.

**Risks / Impact**

- Extra network calls introduce avoidable latency and noise.
- Production logs and security posture may be impacted if this endpoint were ever exposed.

**Actions**

- **Short-Term**
  - [ ] In `BACKEND.md`, call out that `process-email` contains **debug logging** that should be disabled in production.
- **Medium-Term**
  - [ ] Behind a feature flag or `NODE_ENV` check, disable or remove all `127.0.0.1:7247` calls.

---

## 3. Functional Gaps & Partially Implemented Features

### 3.1 Admin Bulk Operations

**Current State**

- `app/admin/components/ApplicationTable.tsx` wires `bulkUpdateApplicationStatus` (from admin actions) for bulk approve/reject/review and `bulkDeleteApplications` for bulk delete. Bulk status updates are implemented and hooked.

**Actions**

- [ ] Add E2E tests covering bulk approve, bulk reject, and bulk delete.

### 3.2 DynamicForm Validation Strength

**Current State**

- `DynamicForm` uses React Hook Form with HTML `required` attributes.
- No Zod schema is generated from `form_schema`; client-side validation is basic.

**Risks / Impact**

- Inconsistent validation between static (`/basvuru`) and dynamic (`/kampanya/[slug]`) flows.
- Weak client-side validation for dynamic campaigns may increase invalid submissions.

**Actions**

- **Short-Term**
  - [ ] In `FRONTEND.md`, clearly list **limitations** of `DynamicForm`:
    - No schema-driven typed validation.
    - Only basic `required` checks.
- **Medium-Term**
  - [ ] Design a mapping from `form_schema` JSON → Zod schema.
  - [ ] Integrate `zodResolver` into `DynamicForm` to unify validation with the static flow.

### 3.3 Credit Campaign Flow Alignment

**Current State**

- `/kredi` path uses its own form (`kredi/form.tsx`) and schema (`creditFormSchema`).
- Business rules (e.g. consents, rate limiting, duplicate checks) may not be fully aligned with `/basvuru`.

**Risks / Impact**

- Divergent behavior between campaigns may violate business, UX, or legal expectations.

**Actions**

- **Short-Term**
  - [ ] Extend `FRONTEND.md` with a **“Credit Application Flow”** section detailing all differences from the main application flow.
- **Medium-Term**
  - [ ] Credit campaigns reuse `submit_dynamic_application_secure`; document any campaign-specific differences in FRONTEND.md or BACKEND.md.

---

## 4. Quality & Tooling Gaps

- [x] **Quality Gates**: `ignoreBuildErrors` and `ignoreDuringBuilds` have been removed. The project now enforces strict linting and type checking during build.
- Production builds can no longer succeed despite:
  - TypeScript type errors
  - ESLint rule violations
- Reduces risk of runtime failures and technical debt accumulation.

**Actions**

- **Short-Term**
  - [ ] In `DEVELOPMENT.md`, add a **“Quality Gates”** section explaining that these flags are **temporary** and should not be relied on long-term.
- **Medium-Term**
  - [ ] Gradually fix existing TS/ESLint issues and then:
    - Turn `ignoreDuringBuilds` and `ignoreBuildErrors` back to `false`.
  - [ ] Ensure CI pipeline always runs:
    - `npm run lint`
    - `npm run type-check`

### 4.2 Legacy Documentation vs Implementation

**Current State**

- **BACKEND.md vs implementation:** BACKEND.md has been updated (Feb 2026) to match the current schema: `applications` (active columns: id, campaign_id, tckn, phone, full_name, email, status, form_data, client_ip); `member_whitelist` PK = tckn; `submit_application_secure` removed; only `submit_dynamic_application_secure` is the active submission RPC. Legacy/deprecated fields are in a dedicated subsection.
- Root-level or duplicate docs may still contain outdated references. Authoritative technical documentation lives under `/docs`; CONVENTIONS.md and TECHNICAL_HEALTH_AND_ARCHITECTURE_MAP.md are the single source for migration and RPC references.

**Risks / Impact**

- Any doc that still claims TCKN is encrypted or references dropped RPCs can cause wrong assumptions. State plaintext storage and submit_dynamic_application_secure as the only submission path.

**Actions**

- [ ] In root README.md and/or HANDOVER.md, add a note:
    - “**Authoritative technical documentation lives under `/docs`. Root-level docs may contain legacy design notes.**”
- [ ] When adding or editing docs, cross-check BACKEND.md and CONVENTIONS.md for schema/RPC accuracy.

---

## 5. Testing & Observability Gaps

### 5.1 Coverage of Critical Flows

**Current State**

- There are Playwright E2E tests (`web/e2e/*.spec.ts`) and Jest unit tests.
- Not all critical paths are guaranteed to be covered (dynamic campaigns, admin bulk ops, Edge Functions).

**Risks / Impact**

- Regressions in:
  - Dynamic campaigns
  - Admin operations
  - Email sending
  - Odoo synchronization
  may go unnoticed.

**Actions**

- **Short-Term**
  - [ ] In `TESTING_STRATEGY.md` (or new section in `DEVELOPMENT.md`), explicitly list **critical flows** that must have E2E coverage:
    - `/basvuru` full flow
    - `/kredi` full flow
    - `/kampanya/[slug]` dynamic flow
    - Admin dashboard filtering + export
    - Admin bulk operations
  - [ ] Document how to run and interpret Edge Function logs via Supabase UI.
- **Medium-Term**
  - [ ] Add missing Playwright scenarios for the above flows.
  - [ ] Consider smoke tests for Edge Functions (trigger `process-email` and `sync-odoo` in a test environment).

---

## 6. Suggested Onboarding Path for the New Team

To take over the project efficiently, the new team should follow this sequence:

1. **High-Level Understanding**
   - Read: `docs/README.md`
   - Read: `SYSTEM_OVERVIEW_AND_FLOWS.md`
2. **Architecture & Data Flow**
   - Read: `docs/ARCHITECTURE.md`
   - Skim: `ARCHITECTURE.md` (root, for historical notes)\n3. **Backend & Security**
   - Read: `docs/BACKEND.md`
   - Read: `SECURITY_AND_PRIVACY_NOTES.md`
4. **Frontend & UX**
   - Read: `docs/FRONTEND.md`
   - Skim: `web/README.md`
5. **API & Integration**
   - Read: `docs/API_REFERENCE.md`
   - Skim: `OPERATIONS_RUNBOOK.md`, `PRODUCTION.md`
6. **Development Workflow**
   - Read: `docs/DEVELOPMENT.md`
   - Skim: `CONFIG_MATRIX.md`, `DEMO_CONFIG.md`
7. **Open Gaps (this document)**
   - Use this file as the **initial backlog** for hardening and refactoring work.

---

## 7. Summary of High-Priority TODOs

**Security-Critical**

- [x] **Dynamic Application Submission**: Refactored to use secure RPC (`submit_dynamic_application_secure`) with strict validation (TCKN, whitelist, campaign status, quota).
- [ ] **Plaintext TCKN**: Still a risk but accepted for now. Consider column-level encryption feature in Postgres or Supabase Vault in future.
- [x] **Rate Limiting**: Implemented at DB level via RPC for submissions (IP-based).
- [x] **Admin Auth**: Enforced at server action level.

**Functional**

- [x] **Campaign Management**: Full CRUD implemented (List, Create, Edit, Status transitions).
- [x] **Bulk Operations**: Implemented bulk status updates (Approve/Reject/Review) in admin panel via `bulkUpdateApplicationStatus`.
- [ ] **Reporting**: Basic export to Excel implemented. Advanced reporting still needed.
- [x] Align `/kredi` flow behavior with `/basvuru` where required by business rules (Unified via `submit_dynamic_application_secure`).
- [ ] Strengthen `DynamicForm` validation using schema-derived Zod.
- [ ] **Sorgula TCKN**: Use `validateTckn` or `tcknSchema` in `queryApplicationStatus` (currently only `length === 11`).

**Quality & Tooling**

- [x] Remove `ignoreBuildErrors` and `ignoreDuringBuilds` after fixing underlying issues.
- [ ] Consolidate documentation around `/docs` as the single source of truth (BACKEND.md and CONVENTIONS.md updated to match implementation).
- [ ] Increase E2E coverage for dynamic campaigns, admin operations, and Edge Functions.

This list should be kept **alive**: update items as they are completed, add new gaps as they are discovered, and use it as input for sprint and release planning.

