# Federated Context Architecture (Post-MVP)

> **Status:** Vision / Future Feature
> **Priority:** Post-MVP
> **Author:** Zaid
> **Date:** Feb 2026

---

## The Insight

PulseCheck captures **process knowledge** - blockers, progress, sentiment, team dynamics. But it lacks **product knowledge** - the codebase, architecture docs, design decisions, historical context.

The gap: We can tell you "Rahul is blocked on payment integration" but we can't tell you "...and here's how to fix it."

## The Vision

Each team connects their own **context source** via MCP (Model Context Protocol). PulseCheck becomes an orchestration layer that combines:

- **Process context** (blockers, updates, team status) - from PulseCheck
- **Product context** (code, docs, architecture) - from team's MCP server

This is **federated**, not centralized:
- No single system holds everyone's code
- Each team controls their own MCP server
- Security and access control delegated to teams
- Scales infinitely (teams bring their own compute)

## Example Interaction

**Without product context:**
> "Who has blockers this week?"
>
> "Rahul has been blocked on payment timeout for 3 days. Priya reported a similar issue last sprint."

**With product context (team's MCP connected):**
> "Who has blockers this week and how might we solve them?"
>
> "Rahul has been blocked on payment timeout for 3 days. Looking at your codebase:
> - `src/services/payment.ts:142` has a hardcoded 5s timeout
> - HLD-23 mentions retry logic was descoped from v1
> - Priya fixed something similar in PR #456 by adding exponential backoff
>
> Suggested approach: Review PR #456's pattern and apply to payment.ts. Want me to summarize that PR?"

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            PulseCheck                                   │
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
│  │   Team A    │  │   Team B    │  │   Team C    │  │   Team D    │   │
│  │  Settings   │  │  Settings   │  │  Settings   │  │  Settings   │   │
│  │             │  │             │  │             │  │             │   │
│  │ MCP: ✓      │  │ MCP: ✓      │  │ MCP: ✗      │  │ MCP: ✓      │   │
│  └──────┬──────┘  └──────┬──────┘  └─────────────┘  └──────┬──────┘   │
│         │                │                                  │          │
└─────────┼────────────────┼──────────────────────────────────┼──────────┘
          │                │                                  │
          ▼                ▼                                  ▼
   ┌─────────────┐  ┌─────────────┐                    ┌─────────────┐
   │  Team A's   │  │  Team B's   │                    │  Team D's   │
   │ MCP Server  │  │ MCP Server  │                    │ MCP Server  │
   │             │  │             │                    │             │
   │ - GitHub    │  │ - GitLab    │                    │ - GitHub    │
   │ - Confluence│  │ - Notion    │                    │ - Jira      │
   │ - Jira      │  │ - Linear    │                    │ - Sharepoint│
   └─────────────┘  └─────────────┘                    └─────────────┘
        │                │                                  │
        ▼                ▼                                  ▼
   [Team A's        [Team B's                         [Team D's
    Codebase]        Codebase]                         Codebase]
```

## MCP Server Tools (Reference)

Each team's MCP server could expose tools like:

```typescript
// Code search
search_codebase(query: string): SearchResult[]

// Document retrieval
get_document(source: 'confluence' | 'notion', id: string): Document

// PR/MR lookup
get_pull_request(repo: string, number: number): PullRequest

// Issue search
find_similar_issues(description: string): Issue[]

// Architecture docs
get_architecture_doc(name: string): ArchDoc

// File content
read_file(repo: string, path: string): FileContent
```

## Implementation Plan

### Phase 1: MCP Client Integration
- Add MCP client to PulseCheck
- Team settings UI for MCP configuration (URL, auth token)
- Store MCP config per team in database

### Phase 2: Chat Integration
- Detect user's team when using Chat
- If team has MCP configured, initialize connection
- Pass MCP tools to Claude alongside process context
- Handle MCP errors gracefully (fallback to process-only)

### Phase 3: Reference MCP Server
- Create template MCP server repository
- Support common integrations:
  - GitHub/GitLab (code search, PRs, issues)
  - Confluence/Notion (docs)
  - Jira/Linear (tickets)
- Documentation for teams to fork and customize

### Phase 4: Enhanced Features
- Proactive suggestions: Agent detects blockers and auto-queries MCP for context
- Cross-reference: "This blocker matches pattern from PR #X"
- Knowledge base building: Learn from resolved blockers

## Security Considerations

- **No code storage**: PulseCheck never stores code/docs, only connects
- **Team-controlled access**: Each team manages their MCP server auth
- **Credential isolation**: MCP tokens stored per-team, never shared
- **Audit logging**: Log all MCP queries for compliance
- **Optional feature**: Teams without MCP still get full process features

## Why MCP?

- **Standard protocol**: Anthropic-backed, growing ecosystem
- **Flexible**: Teams can implement however they want
- **Secure**: Auth and access control built into protocol
- **Tool-based**: Natural fit for Claude's tool use capabilities
- **Already exists**: Don't need to invent new integration pattern

## Success Metrics

- Time to resolve blockers (should decrease with context)
- User engagement with contextual suggestions
- Number of teams connecting MCP servers
- Quality of AI suggestions (user feedback)

## Open Questions

1. **Hosting**: Do we provide hosted MCP servers or only self-hosted?
2. **Templates**: Which integrations are most common/valuable?
3. **Pricing**: Is this a premium feature?
4. **Demo**: How do we showcase this without real customer code?

---

## Notes

- This transforms PulseCheck from "status visibility" to "intelligent assistance"
- Competitive moat: Process + Product context in one place
- Scales because context is federated, not centralized
- Each team's AI gets smarter about THEIR codebase
