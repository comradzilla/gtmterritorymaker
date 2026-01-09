# GTM Territory Maker - Cloud Migration Roadmap

---

## IMPORTANT DISCLAIMER

> **DO NOT USE THIS DOCUMENT IN CLAUDE WORKING SESSIONS**
>
> This document is for **human planning and reference ONLY**. It should NOT be:
> - Referenced or used by Claude during coding sessions
> - Used as instructions for implementation
> - Treated as authoritative specifications
>
> When implementing any phase of this migration, provide fresh, explicit instructions to Claude. Do not point Claude to this file or ask it to "follow the roadmap."
>
> **This file exists purely for human stakeholder context and planning discussions.**

---

> **Purpose**: This document outlines the architecture and steps for transitioning from a local-only app to a cloud-hosted application using Vercel, Supabase, Google Auth, and Stripe.

---

## Current Architecture (Local-Only)

```
┌─────────────────────────────────────────────────────────┐
│                     Browser                              │
│  ┌─────────────────────────────────────────────────────┐│
│  │  React App (Vite)                                   ││
│  │  ┌──────────────┐  ┌──────────────┐                 ││
│  │  │ useAssignments│  │   useReps    │                 ││
│  │  │    Hook      │  │    Hook      │                 ││
│  │  └──────┬───────┘  └──────┬───────┘                 ││
│  │         │                 │                         ││
│  │         ▼                 ▼                         ││
│  │  ┌─────────────────────────────────────┐            ││
│  │  │         localStorage                │            ││
│  │  │  • territory-map-assignments        │            ││
│  │  │  • territory-map-reps               │            ││
│  │  └─────────────────────────────────────┘            ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘

External:
  • GeoJSON data fetched from GitHub (static files)
  • Export generates files client-side (PNG/JPEG/JSON/CSV)
```

### Current Data Models

| Model | Storage Key | Description |
|-------|-------------|-------------|
| `TerritoryAssignments` | `territory-map-assignments` | `{ [stateCode]: { repName, assignedAt } }` |
| `SalesRep[]` | `territory-map-reps` | `{ id, name, color, territoryName? }` |

---

## Target Architecture (Cloud)

```
┌──────────────────────────────────────────────────────────────────┐
│                          Vercel                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    React App (Static)                       │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │  │
│  │  │ useAssignments│  │   useReps    │  │   useAuth        │  │  │
│  │  │    Hook      │  │    Hook      │  │   (new)          │  │  │
│  │  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │  │
│  │         │                 │                   │             │  │
│  │         └─────────────────┼───────────────────┘             │  │
│  │                           ▼                                 │  │
│  │              ┌────────────────────────┐                     │  │
│  │              │   Supabase Client      │                     │  │
│  │              └───────────┬────────────┘                     │  │
│  └──────────────────────────┼─────────────────────────────────┘  │
└──────────────────────────────┼───────────────────────────────────┘
                               │
           ┌───────────────────┼───────────────────┐
           │                   │                   │
           ▼                   ▼                   ▼
    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
    │   Supabase   │    │   Supabase   │    │    Stripe    │
    │   Database   │    │     Auth     │    │   Payments   │
    │  (Postgres)  │    │ (Google SSO) │    │              │
    └──────────────┘    └──────────────┘    └──────────────┘
```

---

## Tech Stack Summary

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Hosting** | Vercel | Static site hosting, automatic deployments |
| **Database** | Supabase (Postgres) | Persistent storage for user data |
| **Auth** | Supabase Auth + Google OAuth | User authentication |
| **Payments** | Stripe | Paywall for premium features (export) |
| **Frontend** | React + Vite (unchanged) | No changes to existing framework |

---

## Migration Phases

### Phase 1: Deploy to Vercel (No Backend)
**Goal**: Get the current app live with zero code changes.

**Steps**:
1. Connect GitHub repo to Vercel
2. Configure build settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Deploy

**Result**: App works exactly as-is, using localStorage.

---

### Phase 2: Add Supabase Database
**Goal**: Persist territory data to cloud database.

**Supabase Tables**:

```sql
-- Users table (auto-created by Supabase Auth)
-- We reference auth.users

-- User's saved maps
CREATE TABLE maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Territory Map',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Territory assignments
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID REFERENCES maps(id) ON DELETE CASCADE,
  state_code TEXT NOT NULL,
  rep_name TEXT NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(map_id, state_code)
);

-- Sales rep configurations
CREATE TABLE reps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID REFERENCES maps(id) ON DELETE CASCADE,
  rep_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  territory_name TEXT,
  UNIQUE(map_id, rep_id)
);

-- Row Level Security (RLS)
ALTER TABLE maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reps ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can CRUD own maps" ON maps
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can CRUD own assignments" ON assignments
  FOR ALL USING (map_id IN (SELECT id FROM maps WHERE user_id = auth.uid()));

CREATE POLICY "Users can CRUD own reps" ON reps
  FOR ALL USING (map_id IN (SELECT id FROM maps WHERE user_id = auth.uid()));
```

**Hook Changes** (conceptual):

```typescript
// Current: useAssignments reads/writes localStorage
// New: useAssignments reads/writes Supabase

const useAssignments = (mapId: string) => {
  // Fetch from Supabase on mount
  // Save to Supabase on change (debounced)
  // Fallback to localStorage for offline support
}
```

---

### Phase 3: Add Google Authentication
**Goal**: Users can sign in and their data persists across devices.

**Supabase Auth Setup**:
1. Enable Google provider in Supabase Dashboard
2. Configure OAuth credentials in Google Cloud Console
3. Set redirect URLs

**Auth Flow**:
```
User clicks "Sign In with Google"
        │
        ▼
Supabase Auth redirects to Google
        │
        ▼
User authenticates with Google
        │
        ▼
Redirect back to app with session
        │
        ▼
App fetches user's saved maps from DB
```

**New Components Needed**:
- `AuthProvider` - Wraps app with auth context
- `SignInButton` - Google sign-in trigger
- `UserMenu` - Show user info, sign out option

**Anonymous Users**:
- Allow usage without sign-in (localStorage mode)
- Prompt to save when they try to close
- Offer to migrate localStorage data on first sign-in

---

### Phase 4: Add Stripe Paywall for Export
**Goal**: Free users can create maps, paid users can export.

**Pricing Model Options**:

| Model | Description |
|-------|-------------|
| **Per-Export** | $X per image/CSV/JSON export |
| **Subscription** | $X/month for unlimited exports |
| **One-Time** | $X lifetime access to exports |

**Stripe Integration**:
1. Create Stripe product and price in Dashboard
2. Add Stripe.js to frontend
3. Create checkout flow

**Gating Logic**:
```typescript
// In ExportImportToolbar.tsx

const handleExport = async (format: 'png' | 'jpeg' | 'json' | 'csv') => {
  const user = await supabase.auth.getUser();

  if (!user) {
    // Prompt sign-in
    return showAuthModal();
  }

  const hasAccess = await checkExportAccess(user.id);

  if (!hasAccess) {
    // Show Stripe checkout
    return redirectToCheckout();
  }

  // Proceed with export
  exportMap(format);
};
```

**Supabase Table for Subscriptions**:
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT, -- 'active', 'canceled', 'past_due'
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Stripe Webhook Handler** (Vercel serverless function):
```
/api/stripe-webhook.ts
  - Listens for: checkout.session.completed
  - Updates subscriptions table in Supabase
  - Grants export access
```

---

## Environment Variables

```bash
# Vercel Environment Variables

# Supabase
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

# Stripe (public key for frontend)
VITE_STRIPE_PUBLIC_KEY=pk_live_xxxxx

# Stripe (secret key for API routes only)
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

---

## File Structure (New/Modified)

```
src/
├── lib/
│   ├── supabase.ts          # Supabase client init
│   └── stripe.ts            # Stripe client init
├── hooks/
│   ├── useAssignments.ts    # Modified: Supabase sync
│   ├── useReps.ts           # Modified: Supabase sync
│   ├── useAuth.ts           # NEW: Auth state management
│   └── useSubscription.ts   # NEW: Check export access
├── components/
│   ├── AuthProvider.tsx     # NEW: Auth context wrapper
│   ├── SignInButton.tsx     # NEW: Google sign-in
│   ├── UserMenu.tsx         # NEW: User dropdown
│   └── PaywallModal.tsx     # NEW: Upgrade prompt
api/                          # Vercel serverless functions
├── stripe-webhook.ts        # Handle Stripe events
└── create-checkout.ts       # Create Stripe checkout session
```

---

## Deployment Checklist

### Vercel Setup
- [ ] Connect GitHub repository
- [ ] Set build command: `npm run build`
- [ ] Set output directory: `dist`
- [ ] Add environment variables
- [ ] Configure custom domain (optional)

### Supabase Setup
- [ ] Create new project
- [ ] Run database migrations (tables above)
- [ ] Enable Row Level Security
- [ ] Configure Google OAuth provider
- [ ] Set site URL and redirect URLs

### Stripe Setup
- [ ] Create Stripe account
- [ ] Create product and price
- [ ] Set up webhook endpoint
- [ ] Configure webhook events: `checkout.session.completed`, `customer.subscription.updated`

### Google Cloud Setup
- [ ] Create OAuth 2.0 credentials
- [ ] Add authorized redirect URIs (Supabase callback URL)
- [ ] Configure consent screen

---

## Cost Estimates

| Service | Free Tier | Paid Tier |
|---------|-----------|-----------|
| **Vercel** | 100GB bandwidth, unlimited deploys | $20/month (Pro) |
| **Supabase** | 500MB DB, 50K auth users | $25/month (Pro) |
| **Stripe** | N/A | 2.9% + $0.30 per transaction |
| **Google Cloud** | OAuth is free | N/A |

**Estimated Monthly Cost (Low Traffic)**: $0 (all free tiers)
**Estimated Monthly Cost (Growing)**: ~$45/month + Stripe fees

---

## Security Considerations

1. **Row Level Security**: All Supabase tables use RLS - users can only access their own data
2. **API Keys**: Only `VITE_*` keys are exposed to frontend (anon key is safe)
3. **Stripe Webhooks**: Verify webhook signatures to prevent spoofing
4. **OAuth**: Use PKCE flow (Supabase default) for security
5. **HTTPS**: Vercel provides automatic SSL

---

## Future Enhancements (Out of Scope)

- Team/organization accounts with shared maps
- Real-time collaboration (multiple users editing same map)
- Map templates and sharing
- Custom GeoJSON uploads (other regions)
- Analytics dashboard
- API access for integrations

---

## Summary

This migration follows a **lift-and-shift** approach:

1. **Phase 1**: Deploy as-is to Vercel (zero code changes)
2. **Phase 2**: Add Supabase for persistent storage
3. **Phase 3**: Add Google Auth for user accounts
4. **Phase 4**: Add Stripe paywall for export monetization

Each phase can be deployed independently, allowing incremental progress without breaking the existing app.
