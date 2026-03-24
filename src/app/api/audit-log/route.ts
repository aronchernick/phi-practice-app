import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { auditLog } from '@/lib/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const role = session.user.role

  let logs
  if (role === 'auditor' || role === 'admin') {
    // Auditors see all entries
    logs = await db
      .select()
      .from(auditLog)
      .orderBy(desc(auditLog.timestamp))
      .limit(500)
  } else {
    // Everyone else sees only their own entries
    logs = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.userId, session.user.id))
      .orderBy(desc(auditLog.timestamp))
      .limit(100)
  }

  return NextResponse.json(logs)
}
