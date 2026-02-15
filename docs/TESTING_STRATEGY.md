# Testing Strategy

## Overview
This document defines the testing approach for the Member Verification System (MVS). All E2E tests use **Playwright** and live in `web/e2e/`.

## Critical Flows

| Flow | Spec File | Status |
|------|-----------|--------|
| Application Form (main) | `basvuru.spec.ts` | ✅ Implemented |
| Admin Login & Auth | `admin.spec.ts` | ✅ Implemented |
| Admin Bulk Operations | `admin-bulk.spec.ts` | ✅ Implemented (skipped without creds) |
| Dynamic Campaign Form | `kampanya.spec.ts` | ✅ Implemented |
| Credit Campaign Form | `kredi.spec.ts` | ✅ Implemented |

## Test Categories

### 1. Smoke Tests (No Backend Required)
These tests verify UI rendering without network calls:
- Form display & field visibility
- Login form rendering  
- Navigation / redirect behavior

### 2. Integration Tests (Backend Required)
These tests require a running Supabase instance:
- TCKN verification flow
- Application submission
- Admin login with valid credentials
- Bulk status updates

> **Note**: Integration tests that require credentials use `test.skip()` when `ADMIN_EMAIL` / `ADMIN_PASSWORD` env vars are missing.

## Running Tests

```bash
# Run all E2E tests (headless)
npx playwright test

# Run specific test file
npx playwright test e2e/basvuru.spec.ts

# Run with UI mode
npx playwright test --ui

# Run headed (visible browser)
npx playwright test --headed
```

## Environment Variables for Tests

| Variable | Purpose |
|----------|---------|
| `ADMIN_EMAIL` | Admin credentials for authenticated tests |
| `ADMIN_PASSWORD` | Admin credentials for authenticated tests |
| `BASE_URL` | Override base URL (default: `http://localhost:3000`) |

## Coverage Gaps & Future Work

- **Unit Tests**: Add Jest tests for `validateTckn`, `generateZodSchema` utilities
- **API Tests**: Direct testing of server actions via HTTP
- **Visual Regression**: Screenshot comparison for form layouts
