import { db } from './db'
import { auditLog } from './schema'
import { v4 as uuid } from 'uuid'

export interface AuditEntry {
  userId: string
  patientId?: string
  action: string
  fieldAccessed?: string
  authorized: boolean
  outcome: 'success' | 'denied' | 'attempted'
  ipAddress?: string
  userAgent?: string
  sessionId?: string
}

export async function writeAuditLog(entry: AuditEntry) {
  await db.insert(auditLog).values({
    id: uuid(),
    userId: entry.userId,
    patientId: entry.patientId ?? null,
    action: entry.action,
    fieldAccessed: entry.fieldAccessed ?? null,
    authorized: entry.authorized,
    outcome: entry.outcome,
    ipAddress: entry.ipAddress ?? null,
    userAgent: entry.userAgent ?? null,
    sessionId: entry.sessionId ?? null,
    timestamp: new Date(),
  })
}
