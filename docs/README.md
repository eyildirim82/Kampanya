# Member Verification System - Technical Wiki

## Project Overview

The **Member Verification System (MVS)** is a production-grade, full-stack web application designed to manage and verify membership applications for **Talpa** (Türkiye Havayolu Pilotları Derneği) and **DenizBank** partnership campaigns. The system provides a secure, digital interface for pilots to apply for specific banking campaigns (e.g., Private Card, Credit Campaigns) while validating their eligibility against a member whitelist.

### Core Purpose

- **Digital Campaign Management**: Enable multiple simultaneous campaigns with custom logic and dynamic form configurations
- **Secure Member Verification**: Validate TCKN (Turkish Identity Number) against a whitelist with Mod10/Mod11 algorithm validation
- **Automated Workflows**: Transactional email notifications via Edge Functions with dynamic template injection
- **Admin Operations**: Comprehensive dashboard for application review, campaign management, and reporting
- **ERP Integration**: Architecture supports syncing members and campaigns with Odoo ERP system

## Technology Stack

### Frontend
- **Framework**: Next.js 16.1 (App Router) with React 19.2
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS v4, Lucide React icons
- **Forms & Validation**: React Hook Form 7.71, Zod 4.3
- **State Management**: React Server Components (RSC) + Client Components hybrid
- **Testing**: Playwright (E2E), Jest (Unit), React Testing Library

### Backend & Infrastructure
- **Platform**: Supabase (Managed PostgreSQL + Auth + Edge Functions)
- **Database**: PostgreSQL 17 with Row-Level Security (RLS)
- **Compute**: Supabase Edge Functions (Deno 2.x runtime)
- **Authentication**: Supabase Auth (JWT-based) for admin panel
- **Email**: Nodemailer via Edge Functions
- **Containerization**: Docker & Docker Compose for local development

### External Integrations
- **Odoo ERP**: XML-RPC integration for member synchronization
- **SMTP**: Configurable SMTP server for transactional emails

## Quick Start

### Prerequisites
- Node.js 18.17+ 
- Docker Desktop (for local Supabase)
- Supabase CLI (optional, for local backend development)
- Git

### Local Development Setup

1. **Clone Repository**:
   ```bash
   git clone <repository-url>
   cd member-verification-system
   ```

2. **Install Dependencies**:
   ```bash
   cd web
   npm install
   ```

3. **Environment Configuration**:
   ```bash
   cp web/.env.example web/.env.local
   ```
   Configure the following variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
   - `SESSION_SECRET`
   - `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`

4. **Start Supabase Locally** (Optional):
   ```bash
   npx supabase start
   ```
   This will output local URLs and keys for `.env.local`

5. **Start Frontend**:
   ```bash
   cd web
   npm run dev
   ```
   Access at `http://localhost:3000`

6. **Start with Docker** (Alternative):
   ```bash
   docker-compose up --build
   ```

## Documentation Index

This technical wiki is organized into specialized documents:

- **[ARCHITECTURE.md](./ARCHITECTURE.md)**: System design, tech stack, data flow diagrams, and infrastructure patterns
- **[BACKEND.md](./BACKEND.md)**: Comprehensive guide to PostgreSQL schema, RPC functions, Edge Functions, security policies, and business logic
- **[FRONTEND.md](./FRONTEND.md)**: Detailed breakdown of React components, hooks, routing, state management, and styling methodology
- **[API_REFERENCE.md](./API_REFERENCE.md)**: Complete documentation of all endpoints, RPC functions, request/response shapes, and authentication flows
- **[DEVELOPMENT.md](./DEVELOPMENT.md)**: Setup procedures, environment variables, npm scripts, testing protocols, CI/CD, and contribution guidelines

## Key Architectural Decisions

1. **Serverless/JAMstack Architecture**: Stateless application layer leveraging Supabase as the single source of truth
2. **Thick Database, Thin API**: Business logic primarily in PostgreSQL functions (RLS, triggers, RPC) rather than application code
3. **Dynamic Campaign System**: Campaigns and forms are data-driven via JSONB schemas, enabling new campaigns without code deployments
4. **Security-First Design**: Row-Level Security (RLS) policies enforce data access at the database level, HMAC session tokens prevent replay attacks
5. **Hybrid Rendering**: Server Components for SEO and performance, Client Components for interactivity

## System Capabilities

- ✅ Multi-campaign support with dynamic form schemas
- ✅ TCKN validation (Mod10/Mod11 algorithm)
- ✅ Member whitelist verification
- ✅ Rate limiting (IP-based, endpoint-specific)
- ✅ Transactional email system with template injection
- ✅ Admin dashboard with role-based access (admin/viewer)
- ✅ Audit logging for sensitive operations
- ✅ Odoo ERP synchronization
- ✅ Application status workflow (PENDING, APPROVED, REJECTED, REVIEWING)

## Production Considerations

- **Environment Variables**: All secrets must be configured in production environment
- **Database Migrations**: Applied via Supabase CLI or dashboard
- **Edge Functions**: Deployed via Supabase CLI (`supabase functions deploy`)
- **Frontend Deployment**: Optimized for Vercel (recommended) or Docker containers
- **Monitoring**: Supabase dashboard provides logs, metrics, and error tracking

## Support & Maintenance

For operational procedures, security notes, and handover documentation, refer to:
- `HANDOVER.md` - Operational runbook for new teams
- `PRODUCTION.md` - Production deployment and maintenance guide
- `SECURITY_AND_PRIVACY_NOTES.md` - Security considerations and compliance notes

---

**Last Updated**: February 2026  
**Maintained By**: Development Team  
**License**: Proprietary
