/**
 * Seed script — run with: npx tsx seed.ts
 * Populates the database with fake users and patients for training.
 */

import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { v4 as uuid } from 'uuid'
import bcrypt from 'bcryptjs'
import * as schema from './src/lib/schema'
import { encryptPHI } from './src/lib/phi-crypto'

// Load env
import 'dotenv/config'

async function seed() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  })
  const db = drizzle(client, { schema })

  // Create tables (raw SQL since we may not have run migrations)
  await client.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      last_login INTEGER,
      is_active INTEGER DEFAULT 1
    )
  `)

  await client.execute(`
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      name_encrypted TEXT NOT NULL,
      dob_encrypted TEXT NOT NULL,
      ssn_encrypted TEXT NOT NULL,
      address_encrypted TEXT NOT NULL,
      phone_encrypted TEXT NOT NULL,
      email_encrypted TEXT NOT NULL,
      insurance_id_encrypted TEXT NOT NULL,
      mrn TEXT NOT NULL UNIQUE,
      diagnosis_code TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  await client.execute(`
    CREATE TABLE IF NOT EXISTS clinical_notes (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      author_id TEXT NOT NULL REFERENCES users(id),
      content_encrypted TEXT NOT NULL,
      note_type TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `)

  await client.execute(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      patient_id TEXT REFERENCES patients(id),
      action TEXT NOT NULL,
      field_accessed TEXT,
      authorized INTEGER NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      timestamp INTEGER NOT NULL,
      session_id TEXT,
      outcome TEXT NOT NULL
    )
  `)

  await client.execute(`
    CREATE TABLE IF NOT EXISTS consent_records (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id),
      consent_type TEXT NOT NULL,
      granted INTEGER NOT NULL,
      granted_at INTEGER,
      expires_at INTEGER,
      recorded_by TEXT REFERENCES users(id)
    )
  `)

  await client.execute(`
    CREATE TABLE IF NOT EXISTS challenge_attempts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      challenge_type TEXT NOT NULL,
      score INTEGER NOT NULL,
      max_score INTEGER NOT NULL,
      clinical_text TEXT,
      user_selections TEXT,
      ai_feedback TEXT,
      completed_at INTEGER NOT NULL
    )
  `)

  await client.execute(`
    CREATE TABLE IF NOT EXISTS breach_incidents (
      id TEXT PRIMARY KEY,
      reported_by TEXT NOT NULL REFERENCES users(id),
      scenario_id TEXT,
      affected_patient_count INTEGER,
      phi_types_exposed TEXT,
      user_response TEXT,
      ai_evaluation TEXT,
      hipaa_score INTEGER,
      created_at INTEGER NOT NULL
    )
  `)

  console.log('Tables created.')

  // Seed users
  const password = await bcrypt.hash('password123', 10)
  const now = new Date()

  const seedUsers = [
    { id: uuid(), name: 'Dr. Sarah Mitchell', email: 'doctor@example.com', role: 'doctor' as const },
    { id: uuid(), name: 'Nurse James Wilson', email: 'nurse@example.com', role: 'nurse' as const },
    { id: uuid(), name: 'Amy Receptionist', email: 'receptionist@example.com', role: 'receptionist' as const },
    { id: uuid(), name: 'Mark Auditor', email: 'auditor@example.com', role: 'auditor' as const },
    { id: uuid(), name: 'Admin User', email: 'admin@example.com', role: 'admin' as const },
  ]

  for (const u of seedUsers) {
    await db.insert(schema.users).values({
      ...u,
      passwordHash: password,
      createdAt: now,
      isActive: true,
    }).onConflictDoNothing()
  }

  console.log('Users seeded.')

  // Seed patients (clearly fictional data)
  const seedPatients = [
    {
      name: 'John Testpatient',
      dob: '1985-03-15',
      ssn: '000-12-3456',
      address: '123 Fake St, Testville, TX 00000',
      phone: '(555) 000-0001',
      email: 'john.test@fakemail.com',
      insuranceId: 'INS-000-FAKE-001',
      mrn: 'MRN-00001',
      diagnosisCode: 'J06.9', // Acute upper respiratory infection
    },
    {
      name: 'Jane Sampleson',
      dob: '1990-07-22',
      ssn: '000-34-5678',
      address: '456 Mock Ave, Demotown, CA 00000',
      phone: '(555) 000-0002',
      email: 'jane.sample@fakemail.com',
      insuranceId: 'INS-000-FAKE-002',
      mrn: 'MRN-00002',
      diagnosisCode: 'E11.9', // Type 2 diabetes
    },
    {
      name: 'Robert Placeholder',
      dob: '1978-11-03',
      ssn: '000-56-7890',
      address: '789 Test Blvd, Fakesburg, NY 00000',
      phone: '(555) 000-0003',
      email: 'robert.place@fakemail.com',
      insuranceId: 'INS-000-FAKE-003',
      mrn: 'MRN-00003',
      diagnosisCode: 'I10', // Essential hypertension
    },
    {
      name: 'Maria Exampleberg',
      dob: '1995-01-30',
      ssn: '000-78-9012',
      address: '321 Demo Ln, Sampleville, FL 00000',
      phone: '(555) 000-0004',
      email: 'maria.example@fakemail.com',
      insuranceId: 'INS-000-FAKE-004',
      mrn: 'MRN-00004',
      diagnosisCode: 'M54.5', // Low back pain
    },
    {
      name: 'David Fictionworth',
      dob: '1982-09-14',
      ssn: '000-90-1234',
      address: '654 Pretend Dr, Testington, WA 00000',
      phone: '(555) 000-0005',
      email: 'david.fiction@fakemail.com',
      insuranceId: 'INS-000-FAKE-005',
      mrn: 'MRN-00005',
      diagnosisCode: 'F41.1', // Generalized anxiety disorder
    },
  ]

  for (const p of seedPatients) {
    await db.insert(schema.patients).values({
      id: uuid(),
      nameEncrypted: encryptPHI(p.name),
      dobEncrypted: encryptPHI(p.dob),
      ssnEncrypted: encryptPHI(p.ssn),
      addressEncrypted: encryptPHI(p.address),
      phoneEncrypted: encryptPHI(p.phone),
      emailEncrypted: encryptPHI(p.email),
      insuranceIdEncrypted: encryptPHI(p.insuranceId),
      mrn: p.mrn,
      diagnosisCode: p.diagnosisCode,
      createdAt: now,
      updatedAt: now,
    }).onConflictDoNothing()
  }

  console.log('Patients seeded.')

  // Seed a clinical note for the first patient
  const [firstPatient] = await db.select().from(schema.patients).limit(1)
  const [doctorUser] = await db.select().from(schema.users).limit(1)

  if (firstPatient && doctorUser) {
    const noteContent = `ADMISSION NOTE
Patient: John Testpatient
DOB: 03/15/1985
SSN: 000-12-3456
MRN: MRN-00001

Chief Complaint: Patient presents with persistent cough and low-grade fever for 5 days.

History of Present Illness: 39-year-old male presenting to ED with productive cough, fever (100.4°F), and mild shortness of breath. Patient reports symptoms started 5 days ago. He lives at 123 Fake St, Testville, TX 00000. Emergency contact can be reached at (555) 000-0001.

Insurance: INS-000-FAKE-001 (FakeHealth Insurance Co.)

Assessment: Acute upper respiratory infection (J06.9)
Plan: Prescribed amoxicillin 500mg TID x 10 days. Follow up in 7 days.`

    await db.insert(schema.clinicalNotes).values({
      id: uuid(),
      patientId: firstPatient.id,
      authorId: doctorUser.id,
      contentEncrypted: encryptPHI(noteContent),
      noteType: 'admission',
      createdAt: now,
    }).onConflictDoNothing()

    console.log('Clinical note seeded.')
  }

  console.log('Seed complete!')
  process.exit(0)
}

seed().catch((e) => {
  console.error('Seed failed:', e)
  process.exit(1)
})
