# Frontend Documentation

## Architecture Overview

The frontend is a **Next.js 16.1** application using the **App Router** architecture pattern. It is designed to be purely data-driven, meaning new campaigns and forms can be launched via database configuration (`form_schema` JSONB) without requiring code changes.

### Key Architectural Principles

1. **Hybrid Rendering**: Server Components for SEO/performance, Client Components for interactivity
2. **Type Safety**: TypeScript throughout with Zod schemas for runtime validation
3. **Server Actions**: Business logic executed server-side, keeping API keys secure
4. **Dynamic Forms**: Campaign-specific forms rendered from JSONB schemas stored in database
5. **Progressive Enhancement**: Forms work without JavaScript, enhanced with React for better UX

## Directory Structure

```
web/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (Server Component)
│   ├── page.tsx                  # Homepage (Server Component)
│   ├── globals.css               # Global styles (Tailwind CSS v4)
│   │
│   ├── basvuru/                  # Legacy static application form
│   │   ├── page.tsx              # Application page (Server Component)
│   │   ├── form.tsx              # Application form (Client Component)
│   │   ├── actions.ts            # Server Actions (TCKN check, submission)
│   │   └── campaign.ts           # Campaign resolution helper
│   │
│   ├── kampanya/[slug]/          # Dynamic campaign pages
│   │   ├── page.tsx              # Campaign renderer (Server Component)
│   │   └── actions.ts            # Campaign fetching Server Actions
│   │
│   ├── kredi/                    # Credit campaign form
│   │   ├── page.tsx              # Credit application page
│   │   ├── form.tsx              # Credit form component
│   │   └── actions.ts            # Credit-specific Server Actions
│   │
│   ├── login/                    # Member login flow
│   │   ├── page.tsx              # Login page
│   │   ├── form.tsx              # Login form (TCKN → OTP flow)
│   │   └── providers.tsx         # Auth providers wrapper
│   │
│   ├── admin/                    # Admin dashboard
│   │   ├── login/                # Admin login
│   │   ├── dashboard/           # Main dashboard (Server Component)
│   │   ├── campaigns/            # Campaign management
│   │   ├── whitelist/            # Member whitelist management
│   │   ├── settings/             # System settings
│   │   ├── components/           # Admin-specific components
│   │   │   ├── ApplicationTable.tsx
│   │   │   ├── CampaignManager.tsx
│   │   │   ├── EmailConfig.tsx
│   │   │   └── ...
│   │   └── actions.ts            # Admin Server Actions
│   │
│   └── api/                      # API Routes (Next.js)
│       └── auth/
│           ├── check/route.ts    # TCKN verification endpoint
│           └── verify/route.ts  # OTP verification endpoint
│
├── components/                   # Shared components
│   ├── DynamicForm.tsx           # Dynamic form renderer
│   ├── PrivateCardBenefits.tsx   # Campaign-specific component
│   └── ui/                       # UI primitives
│       ├── Alert.tsx
│       ├── Badge.tsx
│       ├── Button.tsx
│       ├── Card.tsx
│       └── Input.tsx
│
├── lib/                          # Utility libraries
│   ├── config-validation.ts      # Environment config validation
│   ├── email-templates.ts        # Email template helpers
│   ├── logger.ts                 # Structured logging
│   └── smtp.ts                   # SMTP client (legacy)
│
└── scripts/                     # Utility scripts
    ├── create-admin-user.js
    ├── seed-campaign.js
    └── ...
```

## Component Hierarchy

### Public-Facing Components

#### 1. Root Layout (`app/layout.tsx`)

**Type**: Server Component  
**Purpose**: Root HTML structure, global providers, footer

**Features**:
- Config validation on server-side render
- Global toast notifications (Sonner)
- Footer with DenizBank branding
- Font loading (Geist Sans, Geist Mono)

#### 2. Homepage (`app/page.tsx`)

**Type**: Server Component  
**Purpose**: Landing page with campaign links

**Data Fetching**: Server-side fetch of active campaigns

#### 3. Application Form (`app/basvuru/form.tsx`)

**Type**: Client Component  
**Purpose**: Multi-step application form with TCKN verification

**State Management**:
- `useState` for form stages (`'INIT' | 'FORM'`)
- `useForm` (React Hook Form) for form state
- `useSearchParams` for URL query parameters (TCKN prefill)

**Flow**:
1. **INIT Stage**: User enters TCKN
2. Server Action: `checkTcknStatus(tckn)` validates and checks whitelist
3. On success: Receives `sessionToken` (HMAC), transitions to FORM stage
4. **FORM Stage**: User fills application form
5. Submission: Includes `sessionToken` in payload for security

**Validation**:
- Client-side: Zod schema via `zodResolver`
- Server-side: Re-validation in Server Action

#### 4. Dynamic Campaign Page (`app/kampanya/[slug]/page.tsx`)

**Type**: Server Component  
**Purpose**: Renders campaign-specific landing pages with dynamic forms

**Data Flow**:
1. Extract `slug` from URL params
2. Server Action: `getCampaignBySlug(slug)` fetches campaign config
3. Extract `form_schema` and `page_content` from JSONB
4. Render `DynamicForm` component with schema

**SEO**: Dynamic metadata generation via `generateMetadata()`

#### 5. Dynamic Form Component (`components/DynamicForm.tsx`)
...

#### 6. Credit Campaign (`app/kredi/page.tsx`)

**Type**: Server/Client Hybrid
**Purpose**: Special landing page for credit applications with specific data requirements.

**Differences from Standard Flow**:
- **Campaign Identification**: Automatically resolves to campaign with code `CREDIT_2026` or name containing "kredi".
- **Data Mapping**:
    - `email`: Hardcoded to `no-email@denizbank-kredi.com` (field not requested from user).
    - `requestedAmount`: Mapped to `talep_edilen_limit` in dynamic data.
    - `isDenizbankCustomer`: Mapped to `musterisi_mi`.
- **Validation**: Uses standard `checkCreditTcknStatus` but submits via `submit_application_secure` RPC with specific payload structure.

**Type**: Client Component  
**Purpose**: Renders forms from JSONB schema definitions

**Props**:
```typescript
interface DynamicFormProps {
    schema: FormField[];
    campaignId: string;
    campaignSlug: string;
}

interface FormField {
    name: string;
    label: string;
    type: 'text' | 'email' | 'tel' | 'number' | 'select' | 'checkbox' | 'textarea';
    required?: boolean;
    placeholder?: string;
    options?: { label: string; value: string }[]; // For select
    className?: string;
}
```

**Features**:
- Dynamic field registration via React Hook Form
- HTML5 validation attributes (`required`)
- Support for all common input types
- Success state with reset option

**Limitations**:
- **Strict Requirement**: The form schema **MUST** include a field named `tckn` for member verification.
- **Validation**:
    - Client-side: Basic `required` checks (HTML5).
    - Server-side: **Strict Mod10/Mod11 TCKN validation** and Whitelist check via secure RPC.
    - Rate Limiting: Enforced per IP.

### Admin Components

#### 1. Admin Dashboard (`app/admin/dashboard/page.tsx`)

**Type**: Server Component  
**Purpose**: Main admin interface for viewing applications

**Authentication**: Cookie-based session check, redirects to `/admin/login` if unauthenticated

**Data Fetching**:
- Server Actions: `getApplications(campaignId, page)`, `getCampaigns()`
- Pagination: Client-side pagination (backend pagination planned)

**Features**:
- Campaign filtering via tabs
- Application table with search and status filters
- Export to Excel functionality
- Bulk actions (approve, reject, delete)

#### 2. Application Table (`app/admin/components/ApplicationTable.tsx`)

**Type**: Client Component  
**Purpose**: Displays applications with filtering, sorting, and bulk actions

**State Management**:
- `useState` for search term, status filter, selected IDs
- `useRouter` for navigation and refresh
- Client-side filtering (backend filtering planned)

**Features**:
- Search by name, TCKN, email
- Status filter (PENDING, APPROVED, REJECTED, REVIEWING)
- Row selection with bulk actions (Approve, Reject, Delete)
- Excel export (XLSX library)
- Application detail modal
- **Note**: Bulk operations currently provide feedback via alerts; enhanced modal reporting is planned.

#### 3. Campaign Manager (`app/admin/components/CampaignManager.tsx`)

**Type**: Client Component  
**Purpose**: CRUD operations for campaigns

**Features**:
- Create/edit campaigns
- Configure `form_schema` (JSON editor)
- Configure `page_content` (JSON editor)
- Toggle campaign active status

#### 4. Email Configuration (`app/admin/components/EmailConfig.tsx`)

**Type**: Client Component  
**Purpose**: Manage email templates for campaigns

**Features**:
- Create/edit email configurations
- Template editor with `{{variable}}` placeholder support
- Recipient type selection (applicant, admin, custom)
- Campaign-specific or global templates

## State Management Strategy

### Server State (React Server Components)

**Pattern**: Direct database queries in Server Components

**Usage**:
- Campaign configurations (`getCampaignBySlug`)
- Application listings (`getApplications`)
- Admin data fetching

**Caching**: Next.js Data Cache with revalidation tags

**Example**:
```typescript
// Server Component
export default async function CampaignPage({ params }: { params: { slug: string } }) {
    const campaign = await getCampaignBySlug(params.slug);
    // Rendered on server, cached
}
```

### Client State

**Pattern**: React hooks (`useState`, `useForm`) for local UI state

**Usage**:
- Form state (React Hook Form)
- UI toggles (modals, dropdowns)
- Search/filter state
- Loading states

**No Global State Management**: No Redux, Zustand, or Context API needed due to:
- Server Components handling server state
- Forms managing their own state
- Minimal shared state between components

### Form State Management

**Library**: React Hook Form 7.71 with Zod validation

**Pattern**:
```typescript
const { register, handleSubmit, formState: { errors }, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { ... }
});
```

**Benefits**:
- Minimal re-renders
- Built-in validation integration
- Easy error handling
- Type-safe with TypeScript

## Routing & Navigation

### App Router Structure

Next.js 16 App Router uses file-system-based routing:

- `/` → `app/page.tsx` (Homepage)
- `/basvuru` → `app/basvuru/page.tsx` (Application form)
- `/basvuru?tckn=12345678901` → Pre-filled TCKN
- `/kampanya/[slug]` → `app/kampanya/[slug]/page.tsx` (Dynamic campaign)
- `/login` → `app/login/page.tsx` (Member login)
- `/admin/*` → `app/admin/*/page.tsx` (Admin routes)

### Dynamic Routes

**Campaign Pages**: `/kampanya/[slug]`
- `slug` extracted from URL params
- Fetches campaign by slug from database
- Renders dynamic content and form

**Admin Campaigns**: `/admin/campaigns/[id]`
- Campaign detail/edit page
- Form schema editor

### Navigation Hooks

- `useRouter()` from `next/navigation` for programmatic navigation
- `useSearchParams()` for URL query parameters
- `redirect()` from `next/navigation` for server-side redirects

## Styling Methodology

### Tailwind CSS v4

**Approach**: Utility-first CSS framework

**Configuration**: `postcss.config.mjs` with Tailwind PostCSS plugin

**Theme**:
- Primary Color: `#002855` (DenizBank Blue)
- Success Color: `#28a745` (Green)
- Custom color classes: `bg-[#002855]`, `text-[#002855]`

### Component Styling Patterns

**Utility Classes**: Inline Tailwind classes
```tsx
<button className="w-full py-3 px-4 rounded-lg text-white font-medium bg-[#002855] hover:bg-[#003366]">
```

**Conditional Styling**: `clsx` utility for dynamic classes
```tsx
className={clsx(
    "base-classes",
    condition && "conditional-classes",
    isActive ? "active-classes" : "inactive-classes"
)}
```

### Responsive Design

**Mobile-First**: Base styles for mobile, breakpoints for larger screens
- `sm:` → 640px+
- `md:` → 768px+
- `lg:` → 1024px+
- `xl:` → 1280px+

**Example**:
```tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
```

### UI Components

**Location**: `components/theme/`

**Primitives**:
- `Button.tsx`: Reusable button with variants
- `Input.tsx`: Form input wrapper
- `Card.tsx`: Card container
- `Badge.tsx`: Status badges
- `Alert.tsx`: Alert messages

**Pattern**: Composition over configuration, props for customization

## Form Validation

### Client-Side Validation

**Library**: Zod 4.3 with React Hook Form integration

**Schema Definition**:
```typescript
const formSchema = z.object({
    tckn: z.string().length(11, "TCKN 11 haneli olmalıdır."),
    fullName: z.string().min(2, "Ad Soyad en az 2 karakter olmalıdır."),
    phone: z.string().regex(/^5[0-9]{9}$/, "Geçerli telefon numarası giriniz."),
    email: z.string().email("Geçerli e-posta adresi giriniz.").optional(),
    // ...
}).superRefine((data, ctx) => {
    // Custom validation logic
    if (data.deliveryMethod === 'address' && !data.address) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Adres zorunludur.", path: ["address"] });
    }
});
```

**Integration**:
```typescript
const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
});
```

### Server-Side Validation

**Location**: Server Actions (`app/*/actions.ts`)

**Pattern**: Re-validate with Zod schema before database operations

**Example**:
```typescript
export async function submitApplication(formData: FormData) {
    const validated = formSchema.safeParse(rawData);
    if (!validated.success) {
        return { success: false, errors: validated.error.flatten().fieldErrors };
    }
    // Proceed with database operation
}
```

## Custom Hooks

### No Custom Hooks Currently

The application uses standard React hooks (`useState`, `useEffect`, `useCallback`, `useMemo`) directly in components. No custom hooks have been abstracted yet.

**Potential Future Hooks**:
- `useCampaign(slug)` - Fetch campaign data
- `useApplications(filters)` - Fetch applications with filters
- `useAuth()` - Authentication state management

## API Routes (Next.js)

### `/api/auth/check` (POST)

**Purpose**: Verify TCKN and initiate OTP flow

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
  "emailMasked": "a***@example.com" // If OTP_SENT
}
```

**Logic**:
1. Call RPC `check_member_status(input_tckn)`
2. If member exists and has application: Return `REDIRECT_FORM`
3. If member exists: Send OTP via Supabase Auth, return `OTP_SENT`

### `/api/auth/verify` (POST)

**Purpose**: Verify OTP and create session

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
  "session": { ... } // Supabase session object
}
```

**Logic**:
1. Get member email via RPC
2. Verify OTP via Supabase Auth
3. Return session object

## Server Actions

### Public Actions

**Location**: `app/basvuru/actions.ts`, `app/kampanya/actions.ts`

**Functions**:
- `checkTcknStatus(tckn: string, campaignId?: string)` - Verify TCKN and check whitelist
- `submitApplication(formData: FormData)` - Submit application with session token validation
- `getCampaignBySlug(slug: string)` - Fetch campaign configuration
- `submitDynamicApplication(formData: FormData)` - Submit dynamic campaign form

**Security**: Session token validation, rate limiting, TCKN validation

### Admin Actions

**Location**: `app/admin/actions.ts`

**Functions**:
- `adminLogin(formData: FormData)` - Admin authentication
- `adminLogout()` - Clear session cookies
- `getApplications(campaignId?: string, page?: number)` - Fetch applications with pagination
- `getCampaigns()` - Fetch all campaigns
- `updateApplicationStatus(id: string, status: string)` - Update application status
- `deleteApplication(id: string)` - Delete application
- `bulkUpdateStatus(ids: string[], status: string)` - Bulk status update
- `bulkDeleteApplications(ids: string[])` - Bulk delete

**Security**: Cookie-based session validation, admin role checking

## Performance Optimizations

### Server Components

- Data fetching on server reduces client-side JavaScript
- Automatic code splitting per route
- Streaming SSR for faster initial render

### Image Optimization

- Next.js `Image` component with automatic optimization
- Lazy loading for below-fold images

### Code Splitting

- Automatic route-based code splitting
- Dynamic imports for heavy components (if needed)

### Caching Strategy

- Next.js Data Cache for Server Component data
- Revalidation tags for cache invalidation
- Static generation for campaign pages (if applicable)

## Testing Strategy

### Unit Tests

**Framework**: Jest with React Testing Library

**Location**: `__tests__/`

**Coverage**:
- Utility functions (TCKN validation)
- Component rendering (basic)

**Command**: `npm run test`

### E2E Tests

**Framework**: Playwright

**Location**: `e2e/`

**Coverage**:
- Application submission flow (`basvuru.spec.ts`)
- Admin dashboard (`admin.spec.ts`)

**Commands**:
- `npm run test:e2e` - Run headless
- `npm run test:e2e:ui` - Run with Playwright UI
- `npm run test:e2e:headed` - Run in browser

---

**Next**: See [API_REFERENCE.md](./API_REFERENCE.md) for complete API documentation.
