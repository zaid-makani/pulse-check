import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

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
