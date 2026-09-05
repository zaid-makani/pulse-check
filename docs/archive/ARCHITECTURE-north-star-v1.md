# PulseCheck - North Star Architecture

> **Purpose**: This document outlines the future-state architecture for PulseCheck as a multi-tenant, enterprise-ready platform. We are NOT building this now, but keeping it in mind so current technical decisions don't paint us into a corner.

---

## Vision

PulseCheck becomes the go-to tool for engineering teams to:
1. **Capture** - Voice-first status updates with AI extraction
2. **Track** - Collaborative views for delivery management
3. **Query** - Natural language interface to understand team status

As adoption grows (your team of 16 → other teams → org-wide), the platform needs to support multiple teams with isolation, proper access control, and enterprise auth.

---

## Multi-Tenancy Model

### Concept: Organizations & Teams

```
Organization (Tenant)
├── Team A (Engineering)
│   ├── Members (Developers, QA)
│   ├── Updates (isolated)
│   ├── Views (isolated)
│   └── Settings
├── Team B (Platform)
│   ├── Members
│   ├── Updates
│   └── Views
└── Org Admins (cross-team visibility)
```

### Key Decisions

| Decision | Recommendation | Rationale |
|----------|----------------|-----------|
| Data isolation | Schema-level (team_id on all tables) | Simpler than separate DBs, good enough for internal tool |
| Cross-team visibility | Org admins only | Directors need cross-team views |
| Team creation | Self-service OR admin-only | TBD based on rollout strategy |

### Schema Impact (Future)

```prisma
model Organization {
  id        String   @id @default(cuid())
  name      String   // "Acme Corp"
  slug      String   @unique // "acme-corp"
  teams     Team[]
  createdAt DateTime @default(now())
}

model Team {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(...)
  name           String       // "Engineering", "Platform"
  slug           String       // "engineering"
  members        TeamMember[]
  updates        StatusUpdate[]
  views          View[]
  createdAt      DateTime     @default(now())

  @@unique([organizationId, slug])
}

model TeamMember {
  id        String   @id @default(cuid())
  teamId    String
  team      Team     @relation(...)
  userId    String
  user      User     @relation(...)
  role      TeamRole // MEMBER, LEAD, MANAGER
  createdAt DateTime @default(now())

  @@unique([teamId, userId])
}
```

### Current Code Implications

**What to do NOW:**
- Nothing. Current schema is fine for single-team use.
- When we add Views, don't hardcode assumptions about "one team"

**What to do LATER (when multi-tenant):**
- Add Organization, Team, TeamMember models
- Add teamId to StatusUpdate, View, WorkItem
- Migration script to assign existing data to a default team

---

## Authentication Strategy

### Options Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **Email/Password** | Simple to implement | No SSO, password management burden | Skip |
| **Magic Link** | No passwords, decent UX | Still managing our own auth | Maybe for early access |
| **Okta/SAML** | Enterprise standard, your org uses it | Complex setup | Target for production |
| **NextAuth.js** | Supports multiple providers | Flexible, can add Okta later | **Recommended** |

### Recommended Approach

**Phase 1 (Now):** No auth - internal tool, trust the network
**Phase 2 (Wider rollout):** NextAuth.js with:
- Google OAuth (quick win, most orgs have Google Workspace)
- Magic link as fallback

**Phase 3 (Enterprise):** Add Okta/SAML provider to NextAuth
- Okta integration for SSO
- SCIM for user provisioning (auto-add/remove users)

### NextAuth.js Setup (Future)

```typescript
// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import OktaProvider from "next-auth/providers/okta"

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    // Add later for enterprise
    OktaProvider({
      clientId: process.env.OKTA_CLIENT_ID,
      clientSecret: process.env.OKTA_CLIENT_SECRET,
      issuer: process.env.OKTA_ISSUER,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Auto-create user in our DB if doesn't exist
      // Auto-assign to team based on email domain
    },
    async session({ session, token }) {
      // Add teamId, role to session
    },
  },
}
```

### Current Code Implications

**What to do NOW:**
- Keep the user selector dropdown (fine for dev/demo)
- Structure API routes so adding auth middleware later is easy

**What to do LATER:**
- Add NextAuth.js
- Wrap API routes with auth check
- Replace user selector with session user

---

## Role-Based Access Control (RBAC)

### Roles

| Role | Can Submit Updates | Can Edit Own Updates | Can View Team Dashboard | Can Edit Views | Can Query Chat | Can Admin Team |
|------|-------------------|---------------------|------------------------|---------------|----------------|----------------|
| **MEMBER** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **LEAD** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **MANAGER** | ❌ (optional) | ✅ | ✅ | ✅ | ✅ | ✅ |
| **ORG_ADMIN** | ❌ | ❌ | ✅ (all teams) | ✅ | ✅ | ✅ (all teams) |

### Key Insight from User

> "Manager and above roles will have a different view because they are not going to be the ones using this tool to push an update. They are going to be the ones using this tool to query for results."

This means:
- **Developers/QA**: Submit updates, edit views, participate in scrum calls
- **Managers/Directors**: Query via chat, view dashboards, oversee multiple teams
- **Product**: View-only? Or can they add items to views? (TBD)

### UI Implications

| Role | Primary UI |
|------|-----------|
| Developer | Submit page, My Updates, Views (edit) |
| Manager | Dashboard, Chat (future), Views (view/filter) |
| Director | Cross-team dashboard, Chat, All Views |

Could have role-based navigation:
- Devs see: Submit, My Updates, Views
- Managers see: Dashboard, Team Pulse, Views, Chat
- Or: Same nav, but different default landing page

### Current Code Implications

**What to do NOW:**
- Keep the Role enum in schema (already have DEVELOPER, TESTER, LEAD, MANAGER)
- Don't hardcode role checks yet

**What to do LATER:**
- Add RBAC middleware
- Role-based UI rendering
- Permission checks on API routes

---

## Admin / Back-Office

### What Admins Need

| Function | Who | Description |
|----------|-----|-------------|
| Create Team | Org Admin | Set up new team space |
| Add Members | Team Admin/Manager | Invite users to team |
| Remove Members | Team Admin/Manager | Offboard users |
| Manage Roles | Team Admin | Promote/demote members |
| View Audit Log | Org Admin | Who did what when |
| Configure SSO | Org Admin | Set up Okta connection |
| Billing (if SaaS) | Org Admin | Subscription management |

### Build vs Buy

For internal tool: **Build minimal admin**
- Simple team management page
- User role assignment
- No billing needed

For SaaS product: **Consider admin frameworks**
- Retool for quick admin panels
- Or dedicated admin section in app

### Current Code Implications

**What to do NOW:**
- Nothing. Use seed script to manage users.

**What to do LATER:**
- `/admin` section with team/user management
- Protect with ORG_ADMIN role check

---

## Data Architecture Decisions

### Database

| Phase | Database | Rationale |
|-------|----------|-----------|
| **Now** | SQLite | Zero setup, good for dev |
| **Production** | PostgreSQL | Proper concurrency, backups, scalability |
| **Scale** | PostgreSQL + Read replicas | If needed |

**Migration path:** Prisma makes this easy - change connection string, run migrate.

### File Storage (Future)

If we add file attachments to updates:
- **Option A:** Store in DB as base64 (simple, limited size)
- **Option B:** S3/Cloudflare R2 (scalable, proper solution)

### Search (Future)

For chat feature to work well:
- **Option A:** PostgreSQL full-text search (good enough for <100k records)
- **Option B:** Elasticsearch/Typesense (if search becomes core feature)

---

## API Design Principles

### Current State
- REST APIs under `/api/*`
- No versioning
- No auth

### Future State
- Consider `/api/v1/*` prefix for versioning
- Auth middleware on all routes
- Rate limiting for chat endpoint (AI costs)
- Audit logging for sensitive operations

### Current Code Implications

**What to do NOW:**
- Keep REST structure
- Return consistent error formats

**What to do LATER:**
- Add auth middleware
- Add rate limiting
- Add request logging

---

## Deployment Architecture

### Development
```
Local machine
├── Next.js dev server
├── SQLite file
└── Direct API calls to OpenAI/Anthropic
```

### Production (Simple)
```
Vercel / Railway / Render
├── Next.js app
├── PostgreSQL (managed)
├── Environment variables for API keys
└── HTTPS by default
```

### Production (Enterprise)
```
Your infrastructure
├── Kubernetes / ECS
├── PostgreSQL (RDS/Cloud SQL)
├── Redis (session cache, rate limiting)
├── Okta integration
└── VPN/private network
```

---

## Security Considerations

| Concern | Mitigation |
|---------|------------|
| API keys in env | Never commit .env, use secrets manager in prod |
| SQL injection | Prisma ORM handles parameterization |
| XSS | React auto-escapes, be careful with dangerouslySetInnerHTML |
| CSRF | Next.js has built-in protections |
| Data isolation | Team-scoped queries, never trust client-provided teamId |
| AI prompt injection | Sanitize user input before sending to AI |
| Audit trail | Log who accessed/modified what (future) |

---

## Summary: What This Means For Now

### Do Now
1. ✅ Keep current simple schema
2. ✅ Keep user selector (no auth yet)
3. ✅ Keep Role enum for future use
4. ✅ Structure code so auth can be added as middleware
5. ✅ Don't hardcode single-team assumptions in Views feature

### Do Later (When Scaling)
1. Add NextAuth.js with Google OAuth
2. Add Organization/Team models
3. Add teamId to all relevant tables
4. Build minimal admin section
5. Migrate to PostgreSQL
6. Add Okta provider for enterprise SSO

### Do Much Later (Enterprise)
1. SCIM provisioning
2. Audit logging
3. Advanced RBAC
4. Cross-team analytics for directors

---

## Open Questions (Park for Later)

1. **Pricing model** - If this becomes a product, per-user? Per-team? Free tier?
2. **Data retention** - How long to keep old updates? Archival policy?
3. **Export** - Can users export their data? GDPR compliance?
4. **API access** - Do teams want to integrate PulseCheck with other tools?
5. **Mobile** - PWA enough, or native app needed?

---

*This document is a north star, not a roadmap. Revisit and refine as the product evolves.*
