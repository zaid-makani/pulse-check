# Provisioning PulseCheck in the org

> For the Claude session (and the human) doing the org deployment. Everything
> here is generic to Kubernetes + ArgoCD + CircleCI + AWS; replace the
> `<placeholders>` with the org's real values, and prefer the org's existing
> conventions (copy from another internal app's manifests) over anything here.

Blocking order: **Postgres → deploy → scheduler → Slack**. The Slack app cannot
be finished until the app has a public HTTPS hostname.

---

## 1. Postgres (blocks everything)

Requirements:

- PostgreSQL 15 or 16 (RDS or Aurora Postgres both work).
- The `vector` extension (pgvector) available and permitted. On RDS it is in
  the supported extension list; the DBA may need to allow it.
- A database and a user for PulseCheck. The first migration runs
  `CREATE EXTENSION IF NOT EXISTS vector`, so either:
  - the user has permission to create extensions, or
  - the DBA runs `CREATE EXTENSION vector;` on the database once beforehand.
- Network path from the cluster to the database (security group / subnet).

Ask the DBA for, verbatim:

> A Postgres 16 database named `pulsecheck` with the `vector` extension
> created, a user `pulsecheck` with full rights on that database, reachable
> from the `<cluster name>` Kubernetes cluster. Please share the connection
> string.

Connection string shape (goes into the `DATABASE_URL` secret):

```
postgresql://pulsecheck:<password>@<host>:5432/pulsecheck?schema=public&sslmode=require
```

Verify before deploying:

```
psql "$DATABASE_URL" -c "select extname from pg_extension where extname='vector';"
```

Migrations run automatically at container start (`docker-entrypoint.sh`
runs `prisma migrate deploy`). Nothing to run by hand.

---

## 2. Secrets

Create one Kubernetes Secret (or use the org's secret manager integration)
with these keys. Never commit values.

| Key | Value | Notes |
|---|---|---|
| `DATABASE_URL` | from step 1 | |
| `NEXTAUTH_URL` | `https://<public hostname>` | Must match the URL people use, or sign-in breaks |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` | |
| `ANTHROPIC_API_KEY` | org key | All Claude calls |
| `OPENAI_API_KEY` | org key | Whisper transcription + embeddings only. If the org has no OpenAI key, tell Claude before deploying and it will swap providers |
| `CRON_SECRET` | `openssl rand -hex 24` | Shared with the CronJob in step 4 |
| `SLACK_BOT_TOKEN` | `xoxb-…` from step 5 | Can be added after first deploy |
| `SLACK_SIGNING_SECRET` | from step 5 | Can be added after first deploy |
| `PULSE_KEY_OWNER` | `org` | Shown on the AI spend page |
| `PULSE_FAST_MODEL` | `claude-sonnet-5` | Optional override |
| `PULSE_SMART_MODEL` | `claude-opus-5` | Optional override |
| `RESEND_API_KEY`, `FROM_EMAIL` | optional | Password-reset email only; skip for the pilot |

Do **not** set `SLACK_APP_TOKEN` in production; that is Socket Mode, for
laptops only.

Example (adapt to the org's tooling):

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: pulsecheck-env
  namespace: <namespace>
type: Opaque
stringData:
  DATABASE_URL: "postgresql://..."
  NEXTAUTH_URL: "https://pulsecheck.<org-domain>"
  NEXTAUTH_SECRET: "..."
  ANTHROPIC_API_KEY: "..."
  OPENAI_API_KEY: "..."
  CRON_SECRET: "..."
  PULSE_KEY_OWNER: "org"
```

---

## 3. Image build and deploy

The `Dockerfile` at the repo root builds a self-contained image
(Next.js standalone, migrations on start, listens on `:3000`). No build
args are needed; `DATABASE_URL` is only read at runtime.

### CircleCI (shape; copy the org's real config)

```yaml
version: 2.1
jobs:
  build-and-push:
    docker:
      - image: cimg/base:stable
    steps:
      - checkout
      - setup_remote_docker
      - run: docker build -t <ecr-registry>/pulsecheck:${CIRCLE_SHA1} .
      - run: aws ecr get-login-password | docker login --username AWS --password-stdin <ecr-registry>
      - run: docker push <ecr-registry>/pulsecheck:${CIRCLE_SHA1}
workflows:
  main:
    jobs:
      - build-and-push:
          filters: { branches: { only: master } }
```

### Kubernetes manifests (for ArgoCD to sync)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata: { name: pulsecheck, namespace: <namespace> }
spec:
  replicas: 1                       # one is enough for the pilot; migrations on start are safe with more
  selector: { matchLabels: { app: pulsecheck } }
  template:
    metadata: { labels: { app: pulsecheck } }
    spec:
      containers:
        - name: web
          image: <ecr-registry>/pulsecheck:<sha>
          ports: [{ containerPort: 3000 }]
          envFrom: [{ secretRef: { name: pulsecheck-env } }]
          readinessProbe: { httpGet: { path: /login, port: 3000 }, initialDelaySeconds: 15 }
          resources:
            requests: { cpu: 250m, memory: 512Mi }
            limits:   { cpu: "1",  memory: 1Gi }
---
apiVersion: v1
kind: Service
metadata: { name: pulsecheck, namespace: <namespace> }
spec:
  selector: { app: pulsecheck }
  ports: [{ port: 80, targetPort: 3000 }]
---
# Ingress: use the org's standard (ALB / nginx) with TLS. It must expose
# HTTPS on the hostname in NEXTAUTH_URL. A load-balancer hostname is fine
# on day one; a friendly domain can come later.
```

ArgoCD: an Application pointing at the manifests' path, auto-sync on
`master`. Copy the org's existing Application spec.

Model calls can take 20 to 60 seconds (reports, ask). Make sure the ingress
or load balancer idle timeout is at least 120 seconds; the API routes declare
`maxDuration` up to 300s.

---

## 4. Scheduler

Nudges, morning briefings, and Friday recaps are triggered by calling one
endpoint every 15 minutes. The endpoint decides per team, in the team's
timezone, what is due.

```yaml
apiVersion: batch/v1
kind: CronJob
metadata: { name: pulsecheck-tick, namespace: <namespace> }
spec:
  schedule: "*/15 * * * *"
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: Never
          containers:
            - name: tick
              image: curlimages/curl:8.8.0
              envFrom: [{ secretRef: { name: pulsecheck-env } }]
              command: ["sh", "-c"]
              args:
                - curl -sS -X POST -H "Authorization: Bearer $CRON_SECRET" http://pulsecheck.<namespace>.svc/api/cron/tick
```

Manual checks once deployed:

```
curl -X POST -H "Authorization: Bearer $CRON_SECRET" "https://<host>/api/cron/tick?dry=1"        # what would run now
curl -X POST -H "Authorization: Bearer $CRON_SECRET" "https://<host>/api/cron/tick?force=briefing" # write briefings now
```

---

## 5. Slack app in the org workspace (IT ticket)

Give IT `slack/manifest.json` with two edits for production:

1. `"socket_mode_enabled": false`
2. Add request URLs:
   - Event Subscriptions → Request URL: `https://<host>/api/slack/events`
     (Slack verifies it with a challenge; the app must be deployed first)
   - Slash Commands → `/pulse` → Request URL: `https://<host>/api/slack/commands`

Scopes the manifest asks for and why, in case IT questions them:

| Scope | Why |
|---|---|
| `chat:write` | Reply to people, send nudges and documents |
| `im:history`, `im:read`, `im:write` | Read and open DMs with the bot |
| `app_mentions:read` | Answer `@PulseCheck` in channels |
| `files:read` | Download voice clips people send |
| `users:read`, `users:read.email` | Match a Slack user to their PulseCheck account by email |
| `commands` | The `/pulse` command |

If `users:read.email` is refused: tell Claude; it will add a fallback where a
person links their account by DMing the bot once and confirming their email.

Back from IT you need the **Bot User OAuth Token** (`xoxb-…`) and the
**Signing Secret**; put them in the secret and restart the deployment.

Test after install: DM the bot "hello". It should answer that it does not
know you until you sign up with the same email, or, if you already have an
account, it should record the update.

---

## 6. First run

1. Open `https://<host>/signup` and create the first account with the pilot
   lead's work email (the same email as their Slack profile).
2. On onboarding, start the first team. The creator becomes its lead. The
   first person to create a team also becomes org admin of an org named
   after the email domain.
3. Team settings → add people by email once they have signed up (or let
   them join the team themselves from onboarding), set timezone, nudge
   time, briefing time.
4. Overview → "Org-wide view" to grant VP/CTO-level visibility to anyone who
   should see every team.
5. Ask everyone to sign up with their Slack email. Nothing else is required
   of them; the nightly nudge does the rest.

Auth for the pilot is username and password. Okta comes at org rollout
(NextAuth provider; see `src/lib/auth.ts`).

---

## 7. Verification checklist

- [ ] `/login` returns 200 over HTTPS at `NEXTAUTH_URL`
- [ ] Container log shows "Applying database migrations…" then "Ready"
- [ ] Sign up, sign in, create a team, capture a text update on `/capture`
- [ ] The update shows on Today and is linked to a thread within a minute
- [ ] `/admin/costs` shows the calls and the key owner as "org"
- [ ] `tick?dry=1` returns JSON with `"slack": true` once Slack secrets are set
- [ ] DM the bot: text update recorded; a question is answered
- [ ] Voice clip DM: transcribed and recorded
- [ ] `tick?force=briefing` DMs the briefing to leads
- [ ] Ask on the web answers across the teams you can see

---

## What you do not need

Redis, a job queue, object storage, a vector database service, or a second
container. Postgres with pgvector and the single web image are the whole
system.
