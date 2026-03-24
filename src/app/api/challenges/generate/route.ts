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
    system: `You are a medical records simulator. Generate a realistic-sounding but entirely fictional clinical note containing multiple types of PHI (name, DOB, SSN, diagnosis, address, phone, insurance ID, email, medical record number). Make it read like a real clinical note. Use clearly fake data — names like "Testpatient", SSNs starting with 000-, addresses on "Fake St", zip codes of 00000. Include at least 8 distinct PHI elements. Return ONLY the clinical note text, no extra commentary.`,
    messages: [
      {
        role: 'user',
        content: 'Generate a new clinical note for the PHI detection challenge.',
      },
    ],
  })

  const textBlock = message.content.find((b) => b.type === 'text')
  const clinicalText = textBlock?.text ?? ''

  return NextResponse.json({ clinicalText })
}
