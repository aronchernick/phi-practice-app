import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { patients } from '@/lib/schema'
import { decryptPHI } from '@/lib/phi-crypto'
import { canAccess } from '@/lib/rbac'
import { writeAuditLog } from '@/lib/audit'
import { eq } from 'drizzle-orm'

/** GET /api/patients/[id]/phi?field=ssn
 *  Decrypts and returns a single PHI field. Logs the access.
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const field = searchParams.get('field')
  if (!field) {
    return NextResponse.json({ error: 'field parameter required' }, { status: 400 })
  }

  const role = session.user.role
  const authorized = canAccess(role, field)

  // Always log — authorized or not
  await writeAuditLog({
    userId: session.user.id,
    patientId: params.id,
    action: `REVEAL_${field.toUpperCase()}`,
    fieldAccessed: field,
    authorized,
    outcome: authorized ? 'success' : 'denied',
  })

  if (!authorized) {
    return NextResponse.json(
      {
        error: 'HIPAA_VIOLATION',
        message: `Role '${role}' is not authorized to access '${field}'. This attempt has been logged.`,
      },
      { status: 403 }
    )
  }

  const [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.id, params.id))
    .limit(1)

  if (!patient) {
    return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
  }

  // Map field name to encrypted column
  const fieldMap: Record<string, string | null> = {
    name: patient.nameEncrypted,
    dob: patient.dobEncrypted,
    ssn: patient.ssnEncrypted,
    address: patient.addressEncrypted,
    phone: patient.phoneEncrypted,
    email: patient.emailEncrypted,
    insurance: patient.insuranceIdEncrypted,
    diagnosis: patient.diagnosisCode, // not encrypted
  }

  const encrypted = fieldMap[field]
  if (encrypted === undefined) {
    return NextResponse.json({ error: 'Unknown field' }, { status: 400 })
  }

  // Diagnosis is stored in plaintext (ICD-10 codes aren't PHI alone)
  const value = field === 'diagnosis' ? encrypted : encrypted ? decryptPHI(encrypted) : null

  return NextResponse.json({ field, value })
}
