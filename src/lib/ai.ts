import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/db'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export { anthropic }

export interface ExtractedStatus {
  completed: string[]
  inProgress: string[]
  blockers: string[]
  needsHelp: string[]
  sentiment: string
  riskFlags: string[]
  summary: string
}

const EXTRACTION_PROMPT = `You are an AI assistant that extracts structured information from developer status updates.

Analyze the following status update and extract:
1. completed: List of tasks/items that have been completed
2. inProgress: List of tasks/items currently being worked on
3. blockers: List of things blocking progress (waiting on someone, dependencies, etc.)
4. needsHelp: List of areas where help or escalation is needed
5. sentiment: One of "positive", "neutral", "frustrated", "concerned" based on the tone
6. riskFlags: List of potential risks or concerns (scope creep, timeline issues, etc.)
7. summary: A one-sentence professional summary of the update

Respond ONLY with a valid JSON object in this exact format:
{
  "completed": ["item1", "item2"],
  "inProgress": ["item1", "item2"],
  "blockers": ["item1"],
  "needsHelp": ["item1"],
  "sentiment": "neutral",
  "riskFlags": ["risk1"],
  "summary": "Brief summary here"
}

If a category has no items, use an empty array [].
Do not include any text outside the JSON object.`

export async function extractStatusFromTranscript(transcript: string): Promise<ExtractedStatus> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `${EXTRACTION_PROMPT}\n\nStatus update to analyze:\n"${transcript}"`,
      },
    ],
  })

  const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

  try {
    const extracted = JSON.parse(responseText) as ExtractedStatus
    return extracted
  } catch {
    // If parsing fails, return a default structure with the transcript as summary
    return {
      completed: [],
      inProgress: [],
      blockers: [],
      needsHelp: [],
      sentiment: 'neutral',
      riskFlags: [],
      summary: transcript.slice(0, 200),
    }
  }
}

const DIGEST_PROMPT = `You are an AI assistant that creates team status digests for engineering managers.

Given a list of status updates from team members, create a concise digest that highlights:
1. Key accomplishments across the team
2. Work currently in progress
3. Blockers that need attention (group by type if multiple people have similar blockers)
4. Items that may need manager attention
5. Overall team health/sentiment

IMPORTANT FORMATTING RULES:
- Use ## headers for each major section (e.g., ## 🎉 Key Accomplishments)
- Add a blank line before and after each section header
- Use bullet points (- ) for items within sections
- Add a horizontal rule (---) between major sections for visual separation
- Keep each section clearly separated with whitespace
- Be concise and actionable

Example structure:
## 🎉 Key Accomplishments

- **Person**: accomplishment

---

## 🏗️ Work in Progress

- **Person**: current work

---

## 🚨 Blockers Requiring Attention

### Category Name
- **Person**: blocker details

---

## ⚠️ Manager Attention Required

- Item needing attention

---

## 📊 Team Health & Sentiment

Summary of team mood and recommendations.`

export async function generateTeamDigest(updates: Array<{ userName: string; summary: string; blockers: string[]; sentiment: string }>): Promise<string> {
  const updatesText = updates
    .map((u) => `**${u.userName}**: ${u.summary}\nBlockers: ${u.blockers.length > 0 ? u.blockers.join(', ') : 'None'}\nSentiment: ${u.sentiment}`)
    .join('\n\n')

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `${DIGEST_PROMPT}\n\nTeam Updates:\n${updatesText}`,
      },
    ],
  })

  return message.content[0].type === 'text' ? message.content[0].text : 'Unable to generate digest.'
}

export interface WorkItemSuggestion {
  title: string
  suggestedOwner: string | null
  suggestedStatus: string
  suggestedBlocker: string | null
  suggestedJira: string | null
  confidence: 'high' | 'medium' | 'low'
  sourceUpdateIds: string[]
}

const WORK_ITEM_PROMPT = `You are an AI assistant that extracts concrete work items/deliverables from team status updates.

Analyze the status updates and extract discrete, trackable work items. Focus on:
- Concrete tasks or features being worked on
- Bug fixes or issues being addressed
- Projects or milestones mentioned
- Deliverables with clear outcomes

Skip routine activities like:
- Meetings or standups
- Code reviews (unless fixing specific issues)
- General communication
- Administrative tasks

For each work item, determine:
1. title: A clear, actionable title for the deliverable
2. suggestedOwner: The user ID of who appears to own this work (or null)
3. suggestedStatus: One of "Backlog", "In Progress", "In Review", "QA", "Done", "Blocked"
4. suggestedBlocker: Any blocker notes (or null)
5. suggestedJira: Any JIRA/ticket link mentioned (or null)
6. confidence: "high" if clearly stated, "medium" if inferred, "low" if uncertain
7. sourceUpdateIds: Array of update IDs this was extracted from

Respond ONLY with a valid JSON object:
{
  "suggestions": [
    {
      "title": "Implement user authentication",
      "suggestedOwner": "user-id-here",
      "suggestedStatus": "In Progress",
      "suggestedBlocker": "Waiting on API team",
      "suggestedJira": "https://jira.example.com/ABC-123",
      "confidence": "high",
      "sourceUpdateIds": ["update-id-1"]
    }
  ]
}

If no clear work items can be extracted, return {"suggestions": []}.
Do not include any text outside the JSON object.`

export interface UpdateSummary {
  id: string
  userId: string
  userName: string
  completed: string[]
  inProgress: string[]
  blockers: string[]
  summary: string | null
}

export async function suggestWorkItems(updates: UpdateSummary[]): Promise<WorkItemSuggestion[]> {
  if (updates.length === 0) {
    return []
  }

  const updatesText = updates
    .map((u) => `Update ID: ${u.id}\nUser ID: ${u.userId}\nUser: ${u.userName}\nCompleted: ${u.completed.join(', ') || 'None'}\nIn Progress: ${u.inProgress.join(', ') || 'None'}\nBlockers: ${u.blockers.join(', ') || 'None'}\nSummary: ${u.summary || 'N/A'}`)
    .join('\n\n---\n\n')

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `${WORK_ITEM_PROMPT}\n\nStatus Updates:\n${updatesText}`,
      },
    ],
  })

  const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

  try {
    const parsed = JSON.parse(responseText) as { suggestions: WorkItemSuggestion[] }
    return parsed.suggestions || []
  } catch {
    return []
  }
}

export interface ChatContext {
  systemPrompt: string
  usersCount: number
  updatesCount: number
}

export async function buildChatContext(days: number = 7): Promise<ChatContext> {
  const dateFilter = new Date()
  dateFilter.setDate(dateFilter.getDate() - days)

  const [users, updates] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { name: 'asc' },
    }),
    prisma.statusUpdate.findMany({
      where: {
        createdAt: { gte: dateFilter },
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  // Build team members section
  const teamMembersSection = users
    .map((u) => `- ${u.name} (${u.email}) - Role: ${u.role}`)
    .join('\n')

  // Build status updates section
  const updatesSection = updates
    .map((update) => {
      const date = update.createdAt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
      const completed = JSON.parse(update.completed) as string[]
      const inProgress = JSON.parse(update.inProgress) as string[]
      const blockers = JSON.parse(update.blockers) as string[]

      return `### ${update.user.name} - ${date}
Summary: ${update.summary || 'No summary'}
Completed: ${completed.length > 0 ? completed.join(', ') : 'None'}
In Progress: ${inProgress.length > 0 ? inProgress.join(', ') : 'None'}
Blockers: ${blockers.length > 0 ? blockers.join(', ') : 'None'}
Sentiment: ${update.sentiment || 'neutral'}`
    })
    .join('\n\n')

  const systemPrompt = `You are an AI assistant for PulseCheck, helping managers understand team status.

## Current Team Members
${teamMembersSection || 'No team members found.'}

## Recent Status Updates (Last ${days} Days)

${updatesSection || 'No recent status updates.'}

## Guidelines
- Reference specific team members and updates when answering questions
- Highlight blockers and risks proactively
- Use markdown for clarity (bullet points, bold for names, etc.)
- Be concise but thorough
- If asked about something not in the data, say you don't have that information
- When listing blockers or issues, group by team member or type as appropriate`

  return {
    systemPrompt,
    usersCount: users.length,
    updatesCount: updates.length,
  }
}
