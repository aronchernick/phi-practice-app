import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: `You are a HIPAA breach response trainer. Generate a short fictional data breach scenario at a healthcare organization. Include:
- What happened (e.g., laptop stolen, email sent to wrong recipient, ransomware)
- What types of PHI were potentially exposed
- How many patients were affected
- Any relevant context about the organization

Respond in JSON format:
{
  "scenarioTitle": "...",
  "description": "...", 
  "phiExposed": ["name", "ssn", ...],
  "patientsAffected": <number>,
  "questions": [
    "What PHI was exposed in this breach?",
    "Who must be notified under HIPAA?",
    "What is the required notification timeline?",
    "What remediation steps should be taken?"
  ]
}`,
    messages: [
      {
        role: 'user',
        content: 'Generate a new breach scenario for training.',
      },
    ],
  })

  const textBlock = message.content.find((b) => b.type === 'text')
  const raw = textBlock?.text ?? '{}'

  let scenario
  try {
    scenario = JSON.parse(raw)
  } catch {
    scenario = { raw, scenarioTitle: 'Breach Scenario', description: raw }
  }

  return NextResponse.json(scenario)
}
