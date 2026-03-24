import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { patients } from '@/lib/schema'
import { decryptPHI, maskPHI } from '@/lib/phi-crypto'
import { canAccess } from '@/lib/rbac'
import { writeAuditLog } from '@/lib/audit'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = session.user.role
  const allPatients = await db.select().from(patients)

  const result = allPatients.map((p) => {
    const masked: Record<string, string | null> = {
      id: p.id,
      mrn: p.mrn,
    }

    // Always mask by default — only show what role can access, still masked
    if (canAccess(role, 'name')) {
      masked.name = maskPHI(decryptPHI(p.nameEncrypted), 8)
    }
    if (canAccess(role, 'diagnosis')) {
      masked.diagnosisCode = p.diagnosisCode
    }

    return masked
  })

  await writeAuditLog({
    userId: session.user.id,
    action: 'VIEW_PATIENT_LIST',
    authorized: true,
    outcome: 'success',
  })

  return NextResponse.json(result)
}
