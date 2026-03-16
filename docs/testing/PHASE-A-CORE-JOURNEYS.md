# Phase A: Core User Journey Tests

**Goal:** Verify the app doesn't crash and core flows work end-to-end before anything else.

**How this works:** Walk through each scenario in order. After each step, report what you see. We'll compare against expected behavior and fix issues before moving on.

**Pre-requisites:**
- `npm run dev` running on localhost:3000
- Database freshly reset (already done)
- No existing users/teams in the system

---

## Scenario 1: First User — Manager Signup & Team Creation

This is the very first person to ever use PulseCheck. They're a team lead/manager.

### Step 1.1: Landing Page
- **Go to:** `localhost:3000`
- **Expected:** Landing page with PulseCheck branding, feature overview, CTA to get started
- **Report:** Does it load? Any broken UI?

### Step 1.2: Sign Up
- **Go to:** `localhost:3000/signup`
- **Enter:**
  - Name: `Zaid Makani`
  - Email: `zaid@company.com`
  - Password: `Test1234!`
  - Confirm: `Test1234!`
- **Expected:** Success → redirected to `/login` with a "Registration successful" message
- **Report:** Did signup work? Any validation errors?

### Step 1.3: Log In
- **Go to:** `localhost:3000/login`
- **Enter:** `zaid@company.com` / `Test1234!`
- **Expected:** Redirected to `/onboarding` (since onboarding not completed)
- **Report:** Where did you land? Did the sidebar appear?

### Step 1.4: Onboarding — Create a Team
- **Expected:** Onboarding page with two options: "Create a new team" and "Join an existing team"
- **No "Skip for now" button should exist**
- **Click:** "Create a new team"
- **Enter:**
  - Team Name: `Platform Team`
  - Description: `Core platform and infrastructure`
- **Click:** "Create Team"
- **Expected:** Moves to Tips step showing 3 feature tips, then "Get Started" button
- **Click:** "Get Started"
- **Expected:** Redirected to `/dashboard`
- **Report:** Did the full flow work? Did the sidebar appear on dashboard?

### Step 1.5: Dashboard — Empty State
- **Expected:** Dashboard shows "Platform Team" header with 0 members info, empty insights ("All clear"), empty Team Pulse table, Weekly Digest section
- **Report:** What do you see? Is "Platform Team" shown in the header and/or a team switcher?

### Step 1.6: Submit First Update
- **Go to:** `/submit` (via sidebar)
- **Expected:** "Posting to: Platform Team" indicator visible above the recording area
- **Type in textarea:** `Finished setting up the CI/CD pipeline yesterday. Working on database migration scripts today. Blocked on getting AWS credentials from DevOps team.`
- **Click:** "Submit Update"
- **Expected:** Loading state "Analyzing with AI...", then success view showing AI summary, extracted completed/in-progress/blockers
- **Report:** Did AI extraction work? What did it extract?

### Step 1.7: Check My Updates
- **Go to:** `/my-updates` (via sidebar)
- **Expected:** Shows the update you just submitted with summary, sentiment badge, timestamp
- **Click** to expand it
- **Expected:** Shows raw transcript, completed items, in-progress items, blockers
- **Report:** Is the update there? Can you expand it?

### Step 1.8: Check Dashboard Again
- **Go to:** `/dashboard`
- **Expected:** Should now show your update in Team Pulse table, insights may flag something, Weekly Digest should auto-generate
- **Report:** Did the dashboard populate? What does the digest say?

### Step 1.9: Try Chat
- **Go to:** `/chat` (via sidebar)
- **Expected:** Chat interface with "Platform Team Chat" header, scope selector (Current team / All my teams), suggested questions
- **Click** a suggested question like "Who has blockers this week?"
- **Expected:** Streaming AI response referencing your blocker about AWS credentials
- **Report:** Did chat work? Was the response relevant?

---

## Scenario 2: Second User — Developer Joins Existing Team

This person heard about PulseCheck and wants to join the Platform Team.

### Step 2.1: Sign Up (use incognito/different browser)
- **Go to:** `localhost:3000/signup`
- **Enter:**
  - Name: `Priya Patel`
  - Email: `priya@company.com`
  - Password: `Test1234!`
- **Expected:** Redirected to login

### Step 2.2: Log In & Onboarding
- **Log in** with priya@company.com
- **Expected:** Redirected to `/onboarding`
- **Expected:** Both "Create a new team" and "Join an existing team" visible
- **Click:** "Join an existing team"
- **Expected:** Shows "Platform Team" with member count (1 member)
- **Click** "Platform Team" to join
- **Expected:** Tips step → "Get Started" → Dashboard
- **Report:** Did the join flow work? Did it show the Platform Team?

### Step 2.3: Submit Update as Priya
- **Go to:** `/submit`
- **Expected:** "Posting to: Platform Team"
- **Type:** `Reviewed Zaid's auth PR and left comments. Working on the new user dashboard redesign. No blockers currently.`
- **Submit**
- **Report:** Did it submit successfully? What did AI extract?

### Step 2.4: Check Dashboard as Priya
- **Go to:** `/dashboard`
- **Expected:** Shows 2 members, 2 updates. Team Pulse should show both Zaid and Priya's latest updates
- **Report:** Do you see both members? Both updates?

### Step 2.5: Check My Updates as Priya
- **Go to:** `/my-updates`
- **Expected:** Only Priya's update shown (she's a MEMBER, not LEAD/MANAGER)
- **Report:** Can Priya see only her own updates, or can she see Zaid's too?

---

## Scenario 3: Multi-Team — Create Second Team & Cross-Team Isolation

### Step 3.1: Create Second Team (as Zaid)
- **Switch back to Zaid's session**
- **Go to:** `/teams/new`
- **Create:** Team Name: `Frontend Squad`, Description: `React and UI components`
- **Expected:** Redirected to dashboard, team switcher now shows both teams
- **Report:** Can you switch between Platform Team and Frontend Squad?

### Step 3.2: Submit Update to Frontend Squad
- **Switch to** Frontend Squad (via team switcher if available)
- **Go to:** `/submit`
- **Expected:** "Posting to: Frontend Squad"
- **Type:** `Started the component library migration to shadcn/ui. Good progress today.`
- **Submit**
- **Report:** Does it show "Posting to: Frontend Squad"?

### Step 3.3: Verify Team Isolation on Dashboard
- **Switch to** Platform Team dashboard
- **Expected:** Should NOT show the "component library migration" update. Only shows the CI/CD pipeline update
- **Switch to** Frontend Squad dashboard
- **Expected:** Only shows the component library update
- **Report:** Is the data properly isolated between teams?

### Step 3.4: Have Priya Join Frontend Squad Too
- **Switch to Priya's session**
- **Go to:** `/teams/join`
- **Expected:** Shows "Frontend Squad" as available (Priya is already in Platform Team)
- **Join** Frontend Squad
- **Report:** Can Priya see both teams now? Can she switch between them?

### Step 3.5: Priya Submits to Frontend Squad
- **As Priya, switch to** Frontend Squad
- **Submit:** `Helping Zaid with the shadcn migration. Converted the Button and Card components.`
- **Check Platform Team dashboard** — this update should NOT appear there
- **Check Frontend Squad dashboard** — should show both Zaid's and Priya's Frontend Squad updates
- **Report:** Is cross-team isolation working correctly?

---

## Scenario 4: Views & AI Suggest

### Step 4.1: Create a View
- **As Zaid, on Platform Team**
- **Go to:** `/views` (via sidebar)
- **Expected:** Empty state or "Create a view" prompt
- **Create a new view:** Name: `Sprint Board`, Description: `Current sprint work items`
- **Expected:** View created with system columns (Title, Status, Owner, etc.)
- **Report:** Did the view create? What columns do you see?

### Step 4.2: AI Suggest Work Items
- **Inside the view, click** "AI Suggest" (or similar button)
- **Expected:** AI analyzes recent Platform Team updates and suggests work items (e.g., "CI/CD Pipeline Setup", "Database Migration Scripts", "AWS Credentials Request")
- **Report:** Did suggestions appear? Were they relevant to Platform Team only (not Frontend Squad)?

### Step 4.3: Add Items to View
- **Add** one or more suggested items to the view
- **Try** manually adding a row and editing cell values
- **Report:** Can you add rows? Edit cells? Change status?

---

## Scenario 5: Chat Scope

### Step 5.1: Current Team Chat
- **As Zaid, on Platform Team**
- **Go to:** `/chat`
- **Scope:** "Current team" (default)
- **Ask:** "What's everyone working on?"
- **Expected:** Response only mentions Platform Team activity (CI/CD, dashboard redesign, etc.)
- **Report:** Does it scope correctly?

### Step 5.2: All Teams Chat
- **Change scope to** "All my teams"
- **Ask:** "What's everyone working on?"
- **Expected:** Response mentions BOTH Platform Team and Frontend Squad activity
- **Report:** Does it include data from both teams?

---

## Scenario 6: Team Settings & Member Management

### Step 6.1: Access Team Settings
- **As Zaid (team lead), go to** `/teams/{platformTeamId}/settings`
- **Expected:** Team details, member list, notification settings
- **Report:** Can you access it? What sections do you see?

### Step 6.2: Check Priya's Role
- **Expected:** Priya listed as MEMBER
- **Try** changing her role to LEAD or MANAGER
- **Report:** Does role change work?

### Step 6.3: Notification Settings
- **Expected:** Update reminders (time, days), digest settings (enabled, schedule, time), Slack webhook
- **Note:** These won't actually send emails/Slack messages yet (Resend + Slack not configured). Just verify the UI saves settings.
- **Report:** Can you view and save notification settings?

---

## Scenario 7: Edge Cases

### Step 7.1: Submit Without Team
- **If possible**, test what happens when a user has no team and visits `/submit`
- **Expected:** "Join or create a team to submit updates" prompt with CTA buttons
- **Report:** Does the prompt show?

### Step 7.2: Direct URL Access
- **Try visiting** `/dashboard` while logged out
- **Expected:** Redirected to `/login`
- **Report:** Does middleware protection work?

### Step 7.3: Edit an Update
- **Go to** `/my-updates`
- **Click edit** on an existing update (if edit button exists)
- **Report:** Can you edit? What can you change?

### Step 7.4: Delete an Update
- **Try deleting** an update from `/my-updates`
- **Report:** Does it delete? Is there a confirmation?

---

## Quick Reference: What You'll Need

| Browser/Session | User | Teams |
|---|---|---|
| Browser 1 | Zaid (zaid@company.com) | Platform Team (LEAD), Frontend Squad (LEAD) |
| Browser 2 / Incognito | Priya (priya@company.com) | Platform Team (MEMBER), Frontend Squad (MEMBER) |

---

## After Phase A

Once we've gone through these scenarios, we'll know:
- Which core flows work
- Which are broken
- What UX feels off

Then we move to **Phase B (Integrations)** where we tackle:
- Resend email setup (you'll need an API key)
- Slack integration walkthrough
- Cron jobs: what they do, how to trigger them
- Forgot password flow (to be built)
