import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { breachIncidents } from '@/lib/schema'
import { v4 as uuid } from 'uuid'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { scenario, answers } = body as {
    scenario: { description: string; phiExposed: string[]; patientsAffected: number }
    answers: Record<string, string>
  }

  if (!scenario || !answers) {
    return NextResponse.json({ error: 'scenario and answers required' }, { status: 400 })
  }

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: `You are a HIPAA breach response trainer. Evaluate the user's answers about a data breach scenario. Score them on:

1. Correctly identifying exposed PHI types
2. Knowing notification requirements (patients, HHS OCR, media if >500 affected)
3. Understanding the 60-day notification deadline 
4. Proposing appropriate remediation steps

Key HIPAA breach notification rules:
- Individual notification: within 60 days of discovery
- HHS notification: within 60 days if <500 affected (annual log OK), immediately if ≥500
- Media notification: required if ≥500 individuals in a state/jurisdiction
- Must include: description of breach, PHI types involved, steps to protect, what entity is doing, contact info

Respond in JSON:
{
  "score": <0-100>,
  "breakdown": [
    {"category": "PHI Identification", "score": <0-25>, "feedback": "..."},
    {"category": "Notification Requirements", "score": <0-25>, "feedback": "..."},
    {"category": "Timeline Knowledge", "score": <0-25>, "feedback": "..."},
    {"category": "Remediation Steps", "score": <0-25>, "feedback": "..."}
  ],
  "summary": "...",
  "correctAnswers": {
    "phiExposed": "...",
    "whoToNotify": "...",
    "timeline": "...",
    "remediation": "..."
  }
}`,
  })

  const result = await model.generateContent(`Breach Scenario:\n${scenario.description}\n\nAffected patients: ${scenario.patientsAffected}\nPHI exposed: ${JSON.stringify(scenario.phiExposed)}\n\nUser's Answers:\n${JSON.stringify(answers, null, 2)}`)
  const raw = result.response.text()

  let evaluation
  try {
    evaluation = JSON.parse(raw)
  } catch {
    evaluation = { raw, score: 0 }
  }

  // Persist the breach incident
  await db.insert(breachIncidents).values({
    id: uuid(),
    reportedBy: session.user.id,
    affectedPatientCount: scenario.patientsAffected,
    phiTypesExposed: JSON.stringify(scenario.phiExposed),
    userResponse: JSON.stringify(answers),
    aiEvaluation: JSON.stringify(evaluation),
    hipaaScore: evaluation.score ?? 0,
    createdAt: new Date(),
  })

  return NextResponse.json(evaluation)
}
