import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

// Users / practitioners (simulated)
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  role: text('role', {
    enum: ['doctor', 'nurse', 'receptionist', 'auditor', 'admin'],
  }).notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  lastLogin: integer('last_login', { mode: 'timestamp' }),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
})

// Fake patients — all 18 HIPAA identifiers represented
export const patients = sqliteTable('patients', {
  id: text('id').primaryKey(),
  nameEncrypted: text('name_encrypted').notNull(),
  dobEncrypted: text('dob_encrypted').notNull(),
  ssnEncrypted: text('ssn_encrypted').notNull(),
  addressEncrypted: text('address_encrypted').notNull(),
  phoneEncrypted: text('phone_encrypted').notNull(),
  emailEncrypted: text('email_encrypted').notNull(),
  insuranceIdEncrypted: text('insurance_id_encrypted').notNull(),
  mrn: text('mrn').notNull().unique(),
  diagnosisCode: text('diagnosis_code'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

// Clinical notes — contain embedded PHI, stored encrypted
export const clinicalNotes = sqliteTable('clinical_notes', {
  id: text('id').primaryKey(),
  patientId: text('patient_id')
    .references(() => patients.id)
    .notNull(),
  authorId: text('author_id')
    .references(() => users.id)
    .notNull(),
  contentEncrypted: text('content_encrypted').notNull(),
  noteType: text('note_type', {
    enum: ['admission', 'progress', 'discharge', 'lab', 'prescription'],
  }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

// Audit log — every PHI access event, NEVER deleted
export const auditLog = sqliteTable('audit_log', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .references(() => users.id)
    .notNull(),
  patientId: text('patient_id').references(() => patients.id),
  action: text('action').notNull(),
  fieldAccessed: text('field_accessed'),
  authorized: integer('authorized', { mode: 'boolean' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
  sessionId: text('session_id'),
  outcome: text('outcome', {
    enum: ['success', 'denied', 'attempted'],
  }).notNull(),
})

// Consent records
export const consentRecords = sqliteTable('consent_records', {
  id: text('id').primaryKey(),
  patientId: text('patient_id')
    .references(() => patients.id)
    .notNull(),
  consentType: text('consent_type', {
    enum: ['treatment', 'research', 'marketing', 'third_party'],
  }).notNull(),
  granted: integer('granted', { mode: 'boolean' }).notNull(),
  grantedAt: integer('granted_at', { mode: 'timestamp' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  recordedBy: text('recorded_by').references(() => users.id),
})

// PHI challenge attempts — training scores
export const challengeAttempts = sqliteTable('challenge_attempts', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .references(() => users.id)
    .notNull(),
  challengeType: text('challenge_type', {
    enum: ['phi_detection', 'breach_response', 'rbac_quiz'],
  }).notNull(),
  score: integer('score').notNull(),
  maxScore: integer('max_score').notNull(),
  clinicalText: text('clinical_text'),
  userSelections: text('user_selections'),
  aiFeedback: text('ai_feedback'),
  completedAt: integer('completed_at', { mode: 'timestamp' }).notNull(),
})

// Breach incident log
export const breachIncidents = sqliteTable('breach_incidents', {
  id: text('id').primaryKey(),
  reportedBy: text('reported_by')
    .references(() => users.id)
    .notNull(),
  scenarioId: text('scenario_id'),
  affectedPatientCount: integer('affected_patient_count'),
  phiTypesExposed: text('phi_types_exposed'),
  userResponse: text('user_response'),
  aiEvaluation: text('ai_evaluation'),
  hipaaScore: integer('hipaa_score'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})
