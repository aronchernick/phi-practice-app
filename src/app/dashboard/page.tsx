'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import PatientCard from '@/components/PatientCard'
import PHIField from '@/components/PHIField'
import AuditLogTable from '@/components/AuditLogTable'
import RoleSelector from '@/components/RoleSelector'
import { canAccess } from '@/lib/rbac'

type View = 'patients' | 'challenges' | 'breach' | 'audit'

interface Patient {
  id: string
  mrn: string
  name?: string
  diagnosisCode?: string | null
}

interface AuditLogEntry {
  id: string
  userId: string
  patientId: string | null
  action: string
  fieldAccessed: string | null
  authorized: boolean
  timestamp: string
  outcome: string
}

interface PHIItem {
  text: string
  phiType?: string
  explanation: string
}

interface ChallengeFeedback {
  score: number
  maxScore: number
  summary?: string
  correct?: PHIItem[]
  missed?: PHIItem[]
  falsePositives?: PHIItem[]
}

interface BreachScenario {
  scenarioTitle?: string
  description: string
  phiExposed?: string[]
  patientsAffected?: number
  questions?: string[]
}

interface BreachBreakdown {
  category: string
  score: number
  feedback: string
}

interface BreachEvaluation {
  score: number
  summary?: string
  breakdown?: BreachBreakdown[]
  correctAnswers?: Record<string, string>
}

const PHI_FIELDS = ['name', 'dob', 'ssn', 'address', 'phone', 'email', 'insurance', 'diagnosis']
const MASKED_DEFAULTS: Record<string, string> = {
  name: '***** *****',
  dob: '****-**-**',
  ssn: '***-**-****',
  address: '**** **** **, *********, ** *****',
  phone: '(***) ***-****',
  email: '****@****.***',
  insurance: 'INS-***-****-***',
  diagnosis: '***.**',
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [view, setView] = useState<View>('patients')
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
  const [loadingAudit, setLoadingAudit] = useState(false)

  // Challenge state
  const [challengeText, setChallengeText] = useState('')
  const [challengeLoading, setChallengeLoading] = useState(false)
  const [selectedPHI, setSelectedPHI] = useState<string[]>([])
  const [phiInput, setPhiInput] = useState('')
  const [challengeFeedback, setChallengeFeedback] = useState<ChallengeFeedback | null>(null)
  const [evaluating, setEvaluating] = useState(false)

  // Breach state
  const [breachScenario, setBreachScenario] = useState<BreachScenario | null>(null)
  const [breachLoading, setBreachLoading] = useState(false)
  const [breachAnswers, setBreachAnswers] = useState<Record<string, string>>({})
  const [breachEvaluation, setBreachEvaluation] = useState<BreachEvaluation | null>(null)
  const [breachEvaluating, setBreachEvaluating] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  const fetchPatients = useCallback(async () => {
    const res = await fetch('/api/patients')
    if (res.ok) {
      const data = await res.json()
      setPatients(data)
    }
  }, [])

  useEffect(() => {
    if (session) fetchPatients()
  }, [session, fetchPatients])

  const fetchAuditLog = async () => {
    setLoadingAudit(true)
    const res = await fetch('/api/audit-log')
    if (res.ok) setAuditLogs(await res.json())
    setLoadingAudit(false)
  }

  const generateChallenge = async () => {
    setChallengeLoading(true)
    setChallengeText('')
    setSelectedPHI([])
    setChallengeFeedback(null)
    const res = await fetch('/api/challenges/generate', { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      setChallengeText(data.clinicalText)
    }
    setChallengeLoading(false)
  }

  const evaluateChallenge = async () => {
    if (selectedPHI.length === 0) return
    setEvaluating(true)
    const res = await fetch('/api/challenges/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clinicalText: challengeText, selections: selectedPHI }),
    })
    if (res.ok) setChallengeFeedback(await res.json())
    setEvaluating(false)
  }

  const generateBreach = async () => {
    setBreachLoading(true)
    setBreachScenario(null)
    setBreachEvaluation(null)
    setBreachAnswers({})
    const res = await fetch('/api/breaches/scenario', { method: 'POST' })
    if (res.ok) setBreachScenario(await res.json())
    setBreachLoading(false)
  }

  const evaluateBreach = async () => {
    setBreachEvaluating(true)
    const res = await fetch('/api/breaches/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: breachScenario, answers: breachAnswers }),
    })
    if (res.ok) setBreachEvaluation(await res.json())
    setBreachEvaluating(false)
  }

  const addPHISelection = () => {
    const trimmed = phiInput.trim()
    if (trimmed && !selectedPHI.includes(trimmed)) {
      setSelectedPHI([...selectedPHI, trimmed])
    }
    setPhiInput('')
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  if (!session) return null

  const role = session.user.role

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">🏥 PHI Shield</h1>
          <span className="text-xs text-gray-400">HIPAA Training Simulator</span>
        </div>
        <div className="flex items-center gap-4">
          <RoleSelector />
          <div className="text-right">
            <p className="text-sm font-medium text-gray-700">{session.user.name}</p>
            <p className="text-xs text-gray-400">{session.user.email}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Disclaimer bar */}
      <div className="bg-amber-50 border-b border-amber-200 px-6 py-1.5 text-xs text-amber-700 text-center">
        ⚠️ Training environment — all patient data is entirely fictional. No real PHI is used or stored.
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
          {/* Navigation */}
          <nav className="p-3 space-y-1 border-b border-gray-100">
            {[
              { key: 'patients' as const, label: 'Patient Dashboard', icon: '👥' },
              { key: 'challenges' as const, label: 'PHI Detection', icon: '🎯' },
              { key: 'breach' as const, label: 'Breach Simulator', icon: '🚨' },
              { key: 'audit' as const, label: 'Audit Log', icon: '📜' },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  setView(item.key)
                  if (item.key === 'audit') fetchAuditLog()
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                  view === item.key
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          {/* Patient list (only when in patients view) */}
          {view === 'patients' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider px-1">
                Patients
              </h3>
              {patients.map((p) => (
                <PatientCard
                  key={p.id}
                  patient={p}
                  selected={selectedPatient?.id === p.id}
                  onClick={() => setSelectedPatient(p)}
                />
              ))}
              {patients.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">No patients loaded</p>
              )}
            </div>
          )}
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* PATIENT DETAIL VIEW */}
          {view === 'patients' && (
            <>
              {selectedPatient ? (
                <div className="max-w-2xl">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">Patient Record</h2>
                      <p className="text-sm text-gray-500">MRN: {selectedPatient.mrn}</p>
                    </div>
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-full">
                      {role.charAt(0).toUpperCase() + role.slice(1)} View
                    </span>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Protected Health Information
                    </h3>
                    <p className="text-xs text-gray-400 mb-4">
                      Each field reveal is logged to the audit trail. Restricted fields will trigger
                      a HIPAA violation warning.
                    </p>

                    <div className="space-y-0">
                      {PHI_FIELDS.map((field) => (
                        <PHIField
                          key={field}
                          patientId={selectedPatient.id}
                          field={field}
                          maskedValue={MASKED_DEFAULTS[field] || '********'}
                          canAccess={canAccess(role, field)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* RBAC access matrix for current role */}
                  <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Access Matrix — {role.charAt(0).toUpperCase() + role.slice(1)}
                    </h3>
                    <div className="grid grid-cols-4 gap-2">
                      {PHI_FIELDS.map((field) => (
                        <div
                          key={field}
                          className={`px-3 py-2 rounded text-xs text-center ${
                            canAccess(role, field)
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : 'bg-red-50 text-red-600 border border-red-200'
                          }`}
                        >
                          {canAccess(role, field) ? '✅' : '❌'} {field}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <p className="text-4xl mb-3">👈</p>
                    <p className="text-sm">Select a patient from the sidebar to view their record</p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* PHI DETECTION CHALLENGE */}
          {view === 'challenges' && (
            <div className="max-w-3xl">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-gray-900">🎯 PHI Detection Challenge</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Identify all Protected Health Information in the clinical note below. HIPAA defines
                  18 types of PHI identifiers.
                </p>
              </div>

              <button
                onClick={generateChallenge}
                disabled={challengeLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 mb-4"
              >
                {challengeLoading ? 'Generating...' : challengeText ? 'New Challenge' : 'Generate Clinical Note'}
              </button>

              {challengeText && (
                <>
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Clinical Note</h3>
                    <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed bg-gray-50 rounded-lg p-4">
                      {challengeText}
                    </pre>
                  </div>

                  {/* PHI input area */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">
                      Your PHI Selections
                    </h3>
                    <p className="text-xs text-gray-400 mb-3">
                      Type each piece of PHI you found and press Add. Include the exact text from
                      the note.
                    </p>
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={phiInput}
                        onChange={(e) => setPhiInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addPHISelection()}
                        placeholder='e.g., "John Testpatient" or "000-12-3456"'
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={addPHISelection}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedPHI.map((item, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs"
                        >
                          &quot;{item}&quot;
                          <button
                            onClick={() => setSelectedPHI(selectedPHI.filter((_, j) => j !== i))}
                            className="text-blue-400 hover:text-blue-600"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>

                    <button
                      onClick={evaluateChallenge}
                      disabled={selectedPHI.length === 0 || evaluating}
                      className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                      {evaluating ? 'Evaluating...' : 'Submit for Evaluation'}
                    </button>
                  </div>

                  {/* Feedback */}
                  {challengeFeedback && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">
                        📊 Results: {challengeFeedback.score}/{challengeFeedback.maxScore}
                      </h3>
                      {challengeFeedback.summary && (
                        <p className="text-sm text-gray-600 mb-4">{challengeFeedback.summary}</p>
                      )}

                      {(challengeFeedback.correct?.length ?? 0) > 0 && (
                        <div className="mb-4">
                          <h4 className="text-xs font-semibold text-green-700 uppercase mb-2">
                            ✅ Correctly Identified
                          </h4>
                          {challengeFeedback.correct?.map((c: PHIItem, i: number) => (
                            <div key={i} className="text-sm text-gray-700 mb-1">
                              <span className="font-mono bg-green-50 px-1 rounded">{c.text}</span>
                              <span className="text-gray-400"> — {c.phiType}: {c.explanation}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {(challengeFeedback.missed?.length ?? 0) > 0 && (
                        <div className="mb-4">
                          <h4 className="text-xs font-semibold text-red-700 uppercase mb-2">
                            ❌ Missed PHI
                          </h4>
                          {challengeFeedback.missed?.map((m: PHIItem, i: number) => (
                            <div key={i} className="text-sm text-gray-700 mb-1">
                              <span className="font-mono bg-red-50 px-1 rounded">{m.text}</span>
                              <span className="text-gray-400"> — {m.phiType}: {m.explanation}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {(challengeFeedback.falsePositives?.length ?? 0) > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-yellow-700 uppercase mb-2">
                            ⚠️ False Positives
                          </h4>
                          {challengeFeedback.falsePositives?.map((f: PHIItem, i: number) => (
                            <div key={i} className="text-sm text-gray-700 mb-1">
                              <span className="font-mono bg-yellow-50 px-1 rounded">{f.text}</span>
                              <span className="text-gray-400"> — {f.explanation}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* BREACH SIMULATOR */}
          {view === 'breach' && (
            <div className="max-w-3xl">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-gray-900">🚨 Data Breach Scenario Simulator</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Practice responding to HIPAA breach scenarios. Test your knowledge of notification
                  requirements, timelines, and remediation steps.
                </p>
              </div>

              <button
                onClick={generateBreach}
                disabled={breachLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 mb-4"
              >
                {breachLoading ? 'Generating Scenario...' : breachScenario ? 'New Scenario' : 'Simulate Breach'}
              </button>

              {breachScenario && (
                <>
                  <div className="bg-red-50 rounded-xl border border-red-200 p-5 mb-4">
                    <h3 className="text-sm font-bold text-red-800 mb-2">
                      🚨 {breachScenario.scenarioTitle || 'Breach Incident'}
                    </h3>
                    <p className="text-sm text-red-900 leading-relaxed">
                      {breachScenario.description}
                    </p>
                    {breachScenario.patientsAffected && (
                      <p className="text-xs text-red-700 mt-2">
                        Potentially affected patients: <strong>{breachScenario.patientsAffected}</strong>
                      </p>
                    )}
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Your Response</h3>
                    {(breachScenario.questions || [
                      'What PHI was exposed in this breach?',
                      'Who must be notified under HIPAA?',
                      'What is the required notification timeline?',
                      'What remediation steps should be taken?',
                    ]).map((q: string, i: number) => (
                      <div key={i} className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">{q}</label>
                        <textarea
                          value={breachAnswers[`q${i}`] || ''}
                          onChange={(e) =>
                            setBreachAnswers({ ...breachAnswers, [`q${i}`]: e.target.value })
                          }
                          placeholder="Type your answer..."
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                      </div>
                    ))}
                    <button
                      onClick={evaluateBreach}
                      disabled={breachEvaluating || Object.keys(breachAnswers).length === 0}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                      {breachEvaluating ? 'Evaluating...' : 'Submit Response'}
                    </button>
                  </div>

                  {breachEvaluation && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">
                        📊 Score: {breachEvaluation.score}/100
                      </h3>
                      {breachEvaluation.summary && (
                        <p className="text-sm text-gray-600 mb-4">{breachEvaluation.summary}</p>
                      )}

                      {breachEvaluation.breakdown?.map((b: BreachBreakdown, i: number) => (
                        <div key={i} className="mb-3 p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">{b.category}</span>
                            <span className="text-sm font-bold text-blue-600">{b.score}/25</span>
                          </div>
                          <p className="text-xs text-gray-500">{b.feedback}</p>
                        </div>
                      ))}

                      {breachEvaluation.correctAnswers && (
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                          <h4 className="text-xs font-semibold text-blue-700 uppercase mb-2">
                            Correct Answers
                          </h4>
                          {Object.entries(breachEvaluation.correctAnswers).map(([key, val]) => (
                            <div key={key} className="text-sm text-blue-900 mb-1">
                              <strong>{key}:</strong> {val as string}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* AUDIT LOG */}
          {view === 'audit' && (
            <div className="max-w-5xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">📜 Audit Log</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {role === 'auditor' || role === 'admin'
                      ? 'Full audit trail — all user actions are visible.'
                      : 'Showing your actions only. Auditors can see the full log.'}
                  </p>
                </div>
                <button
                  onClick={fetchAuditLog}
                  disabled={loadingAudit}
                  className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-md text-xs hover:bg-gray-200"
                >
                  {loadingAudit ? 'Loading...' : 'Refresh'}
                </button>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <AuditLogTable logs={auditLogs} />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
