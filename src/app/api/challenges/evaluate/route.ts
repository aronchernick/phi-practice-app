import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { challengeAttempts } from '@/lib/schema'
import { v4 as uuid } from 'uuid'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { clinicalText, selections } = body as {
    clinicalText: string
    selections: string[]
  }

  if (!clinicalText || !Array.isArray(selections)) {
    return NextResponse.json({ error: 'clinicalText and selections[] required' }, { status: 400 })
  }

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: `You are a HIPAA compliance trainer. The user will give you a clinical note and a list of text segments they identified as PHI. Evaluate their selections against HIPAA's 18 identifiers:

1. Names
2. Geographic data (smaller than state)
3. Dates (except year) related to an individual
4. Phone numbers
5. Fax numbers
6. Email addresses
7. Social Security numbers
8. Medical record numbers
9. Health plan beneficiary numbers
10. Account numbers
11. Certificate/license numbers
12. Vehicle identifiers
13. Device identifiers
14. Web URLs
15. IP addresses
16. Biometric identifiers
17. Full-face photographs
18. Any other unique identifying number

Respond in JSON format:
{
  "correct": [{"text": "...", "phiType": "...", "explanation": "..."}],
  "missed": [{"text": "...", "phiType": "...", "explanation": "..."}],
  "falsePositives": [{"text": "...", "explanation": "..."}],
  "score": <number>,
  "maxScore": <number>,
  "summary": "..."
}`,
    messages: [
      {
        role: 'user',
        content: `Clinical Note:\n${clinicalText}\n\nUser's PHI selections:\n${JSON.stringify(selections)}`,
      },
    ],
  })

  const textBlock = message.content.find((b) => b.type === 'text')
  const rawFeedback = textBlock?.text ?? '{}'

  let feedback
  try {
    feedback = JSON.parse(rawFeedback)
  } catch {
    feedback = { raw: rawFeedback, score: 0, maxScore: 0 }
  }

  // Persist the attempt
  await db.insert(challengeAttempts).values({
    id: uuid(),
    userId: session.user.id,
    challengeType: 'phi_detection',
    score: feedback.score ?? 0,
    maxScore: feedback.maxScore ?? 0,
    clinicalText,
    userSelections: JSON.stringify(selections),
    aiFeedback: JSON.stringify(feedback),
    completedAt: new Date(),
  })

  return NextResponse.json(feedback)
}
