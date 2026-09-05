# Product review · 5 September 2026

Method: walk every screen in the running build as two people, a director who manages the team (Zaid) and an engineer with no reports (Rahul), and for every card, button, label, and section ask who it is for, what it does, what happens on a second press, and how a human reads it cold.

Legend: **Fixed** = changed in this pass. **Kept** = judged fine, with the reason. **Later** = real, but after the pilot.

## Today (`/home`)

| Element | Persona | Finding | Resolution |
|---|---|---|---|
| Whole page | Member | Rahul sees the manager's briefing, which names him as frustrated, plus "Needs a look" flagging colleagues as "Fed up" and "Quiet". This is the manager's private view served to everyone, and it would poison trust on day one. | **Fixed.** Members get a different Today: did I post, my open threads, what the team said. Briefing, flags, and sentiment are lead/manager only. |
| Briefing refresh icon | Manager | Unlabeled. Pressing it rewrites the briefing into different words each time with no reason to. | **Fixed.** Briefing is written once a day, automatically on first open. The only action is "Update · N new updates since", shown only when there are new updates. |
| Feed day headers | Both | "Today: Zaid. Yesterday: Rahul." reads as if each day belongs to one person. | **Fixed.** Section titled "What the team said", each day header carries its count, feed limited to the last five days. |
| Needs a look | Manager | Lists the manager themself as "Fed up". | **Fixed.** Own updates are excluded from flags. |
| Reports panel | Manager | "Standup brief" and "Delivery report" write a new, different document on every click. Jarring and costly. | **Fixed.** Panel shows the latest of each with its age and an "Open" link; "Write new" is a separate, explicit action. Standup brief and briefing reuse today's copy. |
| Roster sentiment dots | Member | Colleagues' mood exposed to peers with no legend. | **Fixed.** Dots only in the manager view, with a legend on hover. |

## Person (`/people/[id]`)

| Element | Persona | Finding | Resolution |
|---|---|---|---|
| Self-review button | Manager viewing someone | A manager can generate another person's self-review. It is not theirs to write. | **Fixed.** Self-review lives only on Me. |
| 1-on-1 prep button | Member viewing a peer | Shown to everyone; the API refuses it for peers, so the button just errors. | **Fixed.** Shown only to leads and managers. |
| Past reports list | Member viewing a peer | Would list 1-on-1 preps about that person if any existed. | **Fixed.** Only shown to the person and their leads/managers. |
| Timeline of a peer's updates | Member | Visible. | **Kept.** Updates are said to the team; that transparency is the point. Sentiment dots are hidden for peers. |

## Me (`/me`)

| Element | Persona | Finding | Resolution |
|---|---|---|---|
| My week / Self-review | Both | Regenerate a new document on every click. | **Fixed.** "Open latest" when one exists, "Write new" otherwise or on demand. Past reports listed. |
| Summary text "The person built…" | Both | Prompt defect. | **Fixed** earlier in the prompt; old rows stay as they are. |

## Threads (`/threads`, `/threads/[id]`)

| Element | Persona | Finding | Resolution |
|---|---|---|---|
| Status filter labels | Both | Clear once the subtitle is read. | **Kept.** |
| Status select and Re-summarize | Both | Unlabeled controls. | **Fixed.** Labeled "Status", tooltip on Re-summarize. |
| Members can rename and merge | Member | Reasonable; the people doing the work know the names. | **Kept.** |

## Ask (`/ask`)

| Element | Persona | Finding | Resolution |
|---|---|---|---|
| Starter questions | Member | "What has Rahul been doing" offered to Rahul. | **Fixed.** Starters differ by role. |

## AI spend (`/admin/costs`)

| Element | Persona | Finding | Resolution |
|---|---|---|---|
| Whole page and nav item | Member | Members see the bill and a masked API key. Not theirs. | **Fixed.** Leads, managers, and org admins only; nav item hidden otherwise. |

## Team settings

| Element | Persona | Finding | Resolution |
|---|---|---|---|
| Read-only form for members | Member | Works, but "Team settings" is a strange name for what a member can do there. | **Kept** for the pilot; members mostly want to see who is on the team. |

## Landing, sign in, sign up, onboarding, create/join team, password reset

| Element | Persona | Finding | Resolution |
|---|---|---|---|
| All of them | Everyone | Still the v1 purple design and v1 copy: "Submit Update", "Team Dashboard", "AI-Powered Team Status Updates". First impression contradicts the product. | **Fixed.** Rebuilt in the current design with current copy. Signed-in visitors to `/` go to Today. |
| Onboarding tips | New user | Described features that no longer exist. | **Fixed.** Three tips: reply to the nudge, ask instead of chasing, your record is yours. |

## Missing entirely

| Gap | Resolution |
|---|---|
| No place to see all reports for a team or for yourself | **Fixed.** `/reports` lists them, in the sidebar. |
| No org-level view for a VP or CTO | **Later.** Lifeline, after the pilot. Org admins can already switch to any team. |
| No way for a member to correct a wrong thread link on their own update | **Later.** Merge and rename cover most cases in the pilot. |
