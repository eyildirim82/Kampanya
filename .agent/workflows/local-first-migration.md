---
description: How to create and test database migrations locally before deploying to remote Supabase
---

# Local-First Migration Workflow

// turbo-all

All database changes MUST be tested locally before applying to remote Supabase.

## Prerequisites
- Docker Desktop running
- Local Supabase running: `npx supabase start`

## Steps

### 1. Write the migration file
Create a new SQL file under `supabase/migrations/` with timestamp prefix:
```
supabase/migrations/YYYYMMDDHHMMSS_description.sql
```

### 2. Apply to local database
```bash
npx supabase migration up --local
```

### 3. Verify locally
Connect to local DB and verify the changes:
```bash
docker exec -i supabase_db_member-verification-system psql -U postgres -d postgres -c "YOUR_VERIFICATION_SQL"
```

### 4. Test the application against local
```bash
# Run web app pointing to local Supabase
docker compose up -d
# Or: cd web && npm run dev (with .env.local pointing to localhost:54321)
```

### 5. If something goes wrong — reset local
```bash
# Option A: Rollback by editing/removing the migration file, then:
npx supabase db reset --local

# Option B: Write a reverse migration and apply it
npx supabase migration up --local
```

### 6. Push to remote (only after local verification)
```bash
# Option A: Supabase CLI (requires `supabase link`)
npx supabase db push

# Option B: Manual — copy SQL to Supabase Dashboard > SQL Editor

# Option C: Agent uses apply_migration MCP tool (ONLY after user confirms local test passed)
```

## IMPORTANT Rules for the Agent
- **NEVER** use `apply_migration` MCP tool without first writing the local migration file
- **NEVER** apply to remote before user confirms local testing passed
- Always write migration SQL to `supabase/migrations/` first
- Use `--local` flag for all Supabase CLI database commands during development
- Remote deployment is a separate explicit step that requires user approval

## Useful Commands Reference
```bash
# Start local Supabase
npx supabase start

# Stop local Supabase
npx supabase stop

# Apply pending migrations to local
npx supabase migration up --local

# Reset local DB (re-applies ALL migrations from scratch)
npx supabase db reset --local

# List migration status
npx supabase migration list --local

# Connect to local postgres
docker exec -i supabase_db_member-verification-system psql -U postgres -d postgres

# See schema diff between local and remote
npx supabase db diff --local
```
