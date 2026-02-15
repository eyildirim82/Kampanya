# Development Guide

## Prerequisites

Ensure you have the following installed before starting:

- **Node.js**: v18.17+ (LTS recommended)
- **npm**: v9+ or **pnpm** v8+
- **Docker Desktop**: Required for running local Supabase stack
- **Git**: For version control
- **Supabase CLI**: Optional, for local backend development (`npm install -g supabase`)

## Initial Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd member-verification-system
```

### 2. Install Dependencies

```bash
cd web
npm install
```

### 3. Environment Configuration

Create `.env.local` file in the `web` directory:

```bash
cp web/.env.example web/.env.local
```

**Required Variables**:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Server-side only
SUPABASE_INTERNAL_URL=http://127.0.0.1:54321  # For Docker networking

# Session Security
SESSION_SECRET=your-random-secret-key-min-32-chars

# SMTP Configuration (for Edge Functions)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@talpa.org

# Odoo Integration (optional, for sync-odoo Edge Function)
ODOO_URL=https://odoo.example.com
ODOO_DB=odoo_database
ODOO_USERNAME=odoo_user
ODOO_PASSWORD=odoo_password
```

**For Local Development with Supabase**:

1. Start local Supabase:
   ```bash
   npx supabase start
   ```

2. Copy the output URLs and keys to `.env.local`:
   - `API URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role key` → `SUPABASE_SERVICE_ROLE_KEY`

### 4. Database Setup

**Apply Migrations**:

```bash
npx supabase db reset
```

This will:
- Apply all migrations from `supabase/migrations/`
- Seed the database (if `supabase/seed.sql` exists)
- Reset the database to a clean state

**Manual Migration**:

```bash
npx supabase migration up
```

### 5. Start Development Server

**Option A: Standalone Frontend** (requires remote Supabase):

```bash
cd web
npm run dev
```

Access at `http://localhost:3000`

**Option B: Docker Compose** (includes frontend container):

```bash
docker-compose up --build
```

Access at `http://localhost:3000`

**Option C: Full Local Stack**:

1. Start Supabase:
   ```bash
   npx supabase start
   ```

2. Serve Edge Functions:
   ```bash
   npx supabase functions serve
   ```

3. Start Frontend:
   ```bash
   cd web
   npm run dev
   ```

## NPM Scripts

### Development Scripts

- **`npm run dev`**: Starts Next.js development server with hot-reloading
- **`npm run build`**: Compiles the application for production
- **`npm run start`**: Runs the built application locally (production mode)
- **`npm run lint`**: Runs ESLint to check for code quality issues

### Testing Scripts

- **`npm run test`**: Runs Jest unit tests
- **`npm run test:watch`**: Runs Jest in watch mode
- **`npm run test:coverage`**: Generates test coverage report
- **`npm run test:e2e`**: Runs Playwright end-to-end tests
- **`npm run test:e2e:ui`**: Runs Playwright tests with UI mode
- **`npm run test:e2e:headed`**: Runs Playwright tests in headed browser

## Local Backend Development

### Supabase CLI Commands

**Start Local Supabase**:
```bash
npx supabase start
```

**Stop Local Supabase**:
```bash
npx supabase stop
```

**Reset Database**:
```bash
npx supabase db reset
```

**Create Migration**:
```bash
npx supabase migration new migration_name
```

**Apply Migrations**:
```bash
npx supabase migration up
```

**Generate TypeScript Types**:
```bash
npx supabase gen types typescript --local > web/types/supabase.ts
```

**Serve Edge Functions Locally**:
```bash
npx supabase functions serve
```

**Deploy Edge Function**:
```bash
npx supabase functions deploy function-name
```

### Database Management

**Access Local Database**:

- **Studio UI**: `http://localhost:54323` (after `supabase start`)
- **Direct Connection**: `postgresql://postgres:postgres@localhost:54322/postgres`

**Useful SQL Queries**:

```sql
-- View all applications
SELECT * FROM applications ORDER BY created_at DESC LIMIT 10;

-- View active campaigns
SELECT * FROM campaigns WHERE is_active = true;

-- Check rate limits
SELECT * FROM rate_limit ORDER BY window_start DESC;

-- View audit logs
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 20;
```

## Project Structure

```
member-verification-system/
├── docs/                    # Technical documentation (this wiki)
├── supabase/
│   ├── migrations/          # Database migrations (SQL files)
│   ├── functions/           # Edge Functions (Deno)
│   │   ├── process-email/
│   │   └── sync-odoo/
│   └── config.toml         # Supabase local configuration
├── web/                     # Next.js frontend application
│   ├── app/                 # App Router pages and routes
│   ├── components/          # React components
│   ├── lib/                 # Utility libraries
│   ├── scripts/             # Utility scripts
│   ├── __tests__/           # Unit tests
│   ├── e2e/                 # E2E tests (Playwright)
│   └── package.json
└── docker-compose.yml       # Docker Compose configuration
```

## Code Style & Conventions

### TypeScript

- **Strict Mode**: Enabled in `tsconfig.json`
- **Type Safety**: Prefer explicit types over `any`
- **Interfaces**: Use interfaces for object shapes
- **Enums**: Use string enums for constants

### React Components

- **Server Components**: Default, use `'use server'` for Server Actions
- **Client Components**: Mark with `'use client'` directive
- **Naming**: PascalCase for components, camelCase for functions
- **Props**: Define interfaces for component props

### File Naming

- **Components**: PascalCase (`ApplicationTable.tsx`)
- **Utilities**: camelCase (`config-validation.ts`)
- **Server Actions**: camelCase (`actions.ts`)
- **API Routes**: lowercase (`route.ts`)

### Code Organization

- **Co-location**: Keep related files together (e.g., `page.tsx` + `actions.ts`)
- **Barrel Exports**: Use `index.ts` for clean imports (if needed)
- **Separation of Concerns**: Business logic in Server Actions, UI in Components

## Testing

### Unit Tests

**Framework**: Jest with React Testing Library

**Location**: `web/__tests__/`

**Example**:
```typescript
import { validateTckn } from '@/app/basvuru/actions';

describe('TCKN Validation', () => {
  it('should validate correct TCKN', () => {
    expect(validateTckn('12345678901')).toBe(true);
  });
  
  it('should reject invalid TCKN', () => {
    expect(validateTckn('00000000000')).toBe(false);
  });
});
```

**Run Tests**:
```bash
npm run test
```

### E2E Tests

**Framework**: Playwright

**Location**: `web/e2e/`

**Example**:
```typescript
import { test, expect } from '@playwright/test';

test('application submission flow', async ({ page }) => {
  await page.goto('/basvuru');
  await page.fill('input[name="tckn"]', '12345678901');
  await page.click('button[type="submit"]');
  // ... assertions
});
```

**Run E2E Tests**:
```bash
npm run test:e2e
```

### Test Coverage

**Target**: 80%+ coverage for critical paths (TCKN validation, form submission)

**Generate Report**:
```bash
npm run test:coverage
```

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGc...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-only) | `eyJhbGc...` |
| `SESSION_SECRET` | HMAC secret for session tokens | Random 32+ char string |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SUPABASE_INTERNAL_URL` | Internal Supabase URL (Docker) | Same as public URL |
| `SMTP_HOST` | SMTP server hostname | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USER` | SMTP username | - |
| `SMTP_PASS` | SMTP password | - |
| `SMTP_FROM` | Sender email address | `noreply@talpa.org` |
| `ODOO_URL` | Odoo instance URL | - |
| `ODOO_DB` | Odoo database name | - |
| `ODOO_USERNAME` | Odoo username | - |
| `ODOO_PASSWORD` | Odoo password | - |

### Environment-Specific Files

- `.env.local`: Local development (gitignored)
- `.env.vercel`: Vercel deployment (optional)
- `.env.local.production`: Production overrides (gitignored)

## Database Migrations

### Creating Migrations

1. **Create Migration File**:
   ```bash
   npx supabase migration new add_new_feature
   ```

2. **Edit Migration File**:
   ```sql
   -- File: supabase/migrations/YYYYMMDDHHMMSS_add_new_feature.sql
   ALTER TABLE applications ADD COLUMN new_field TEXT;
   ```

3. **Test Locally**:
   ```bash
   npx supabase db reset
   ```

4. **Apply to Production**:
   ```bash
   npx supabase db push
   ```

### Migration Best Practices

- **Idempotent**: Use `IF NOT EXISTS` / `IF EXISTS` checks
- **Backward Compatible**: Avoid breaking changes when possible
- **Tested**: Test migrations locally before deploying
- **Documented**: Add comments explaining migration purpose
- **Sequential**: Migrations are applied in timestamp order

### Rollback Strategy

**Manual Rollback**:
1. Create new migration to reverse changes
2. Apply migration: `npx supabase migration up`

**Note**: Supabase doesn't support automatic rollbacks. Always test migrations in staging first.

## Edge Functions Development

### Local Development

1. **Serve Functions Locally**:
   ```bash
   npx supabase functions serve
   ```

2. **Test Function**:
   ```bash
   curl -X POST http://localhost:54321/functions/v1/process-email \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     -d '{"type":"INSERT","table":"applications","record":{...}}'
   ```

### Deploying Functions

```bash
npx supabase functions deploy process-email
npx supabase functions deploy sync-odoo
```

### Function Environment Variables

Set via Supabase Dashboard:
1. Go to Project Settings → Edge Functions → Secrets
2. Add secrets: `SMTP_HOST`, `SMTP_USER`, etc.

Or via CLI:
```bash
npx supabase secrets set SMTP_HOST=smtp.gmail.com
```

## Debugging

### Frontend Debugging

**Browser DevTools**:
- React DevTools extension
- Next.js DevTools (built-in)
- Network tab for API calls

**Server-Side Debugging**:
- `console.log()` in Server Actions (visible in terminal)
- `logger.error()` for structured logging

### Database Debugging

**Supabase Studio**:
- Access at `http://localhost:54323` (local) or dashboard (production)
- View tables, run queries, check RLS policies

**SQL Debugging**:
```sql
-- Enable query logging
SET log_statement = 'all';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'applications';
```

### Edge Function Debugging

**Local Logs**:
```bash
npx supabase functions serve --debug
```

**Production Logs**:
- View in Supabase Dashboard → Edge Functions → Logs

## CI/CD Pipeline

### GitHub Actions (Example)

```yaml
name: CI

on:
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd web && npm ci
      - run: cd web && npm run lint
      - run: cd web && npm run test
      - run: cd web && npm run build
```

### Vercel Deployment

**Automatic Deployment**:
- Push to `main` branch → Production deployment
- Push to other branches → Preview deployment

**Manual Deployment**:
```bash
vercel --prod
```

**Environment Variables**:
- Set in Vercel Dashboard → Project Settings → Environment Variables
- Separate values for Production, Preview, Development

## Contribution Guidelines

### Branching Strategy

- **`main`**: Production-ready code
- **`develop`**: Integration branch (optional)
- **Feature branches**: `feature/feature-name`
- **Bug fixes**: `fix/bug-description`
- **Hotfixes**: `hotfix/critical-fix`

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add dynamic campaign form support
fix: resolve TCKN validation edge case
docs: update API reference
chore: update dependencies
refactor: simplify form validation logic
```

### Pull Request Process

1. **Create Feature Branch**: `git checkout -b feature/new-feature`
2. **Make Changes**: Write code, add tests
3. **Run Tests**: `npm run test && npm run lint`
4. **Commit Changes**: Use conventional commit format
5. **Push Branch**: `git push origin feature/new-feature`
6. **Create PR**: Include description, screenshots (if UI changes)
7. **Code Review**: Address reviewer feedback
8. **Merge**: Squash and merge (preferred)

### Code Review Checklist

- [ ] Code follows project conventions
- [ ] Tests added/updated
- [ ] Documentation updated (if needed)
- [ ] No console.logs or debug code
- [ ] Environment variables documented
- [ ] Migration tested locally
- [ ] Edge Functions tested (if modified)

## Troubleshooting

### Common Issues

**Port Already in Use**:
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

**Supabase Connection Errors**:
- Check `.env.local` variables
- Verify Supabase project is running: `npx supabase status`
- Check network connectivity

**Migration Errors**:
- Ensure migrations are sequential (timestamp order)
- Check for syntax errors in SQL
- Verify database state matches migration expectations

**Edge Function Errors**:
- Check environment variables are set
- Verify function code syntax (Deno)
- Check Supabase logs for detailed errors

**Build Errors**:
- Clear `.next` directory: `rm -rf web/.next`
- Clear node_modules: `rm -rf web/node_modules && npm install`
- Check TypeScript errors: `npm run type-check`

## Resources

- **Next.js Docs**: https://nextjs.org/docs
- **Supabase Docs**: https://supabase.com/docs
- **React Hook Form**: https://react-hook-form.com/
- **Zod**: https://zod.dev/
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Playwright**: https://playwright.dev/

---

**Last Updated**: February 2026
