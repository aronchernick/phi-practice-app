'use client'

import { useState } from 'react'
import { FIELD_LABELS } from '@/lib/rbac'

interface PHIFieldProps {
  patientId: string
  field: string
  maskedValue: string
  canAccess: boolean
}

export default function PHIField({ patientId, field, maskedValue, canAccess }: PHIFieldProps) {
  const [revealed, setRevealed] = useState(false)
  const [value, setValue] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [violation, setViolation] = useState<string | null>(null)

  const handleReveal = async () => {
    if (revealed) {
      setRevealed(false)
      setValue(null)
      return
    }

    setLoading(true)
    setViolation(null)

    try {
      const res = await fetch(`/api/patients/${patientId}/phi?field=${encodeURIComponent(field)}`)
      const data = await res.json()

      if (res.status === 403) {
        setViolation(data.message)
      } else if (res.ok) {
        setValue(data.value)
        setRevealed(true)
      }
    } catch {
      setViolation('Failed to fetch PHI field.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100">
      <div className="flex-1">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {FIELD_LABELS[field] || field}
        </span>
        <p className={`mt-0.5 text-sm font-mono ${revealed ? 'text-gray-900' : 'text-gray-400'}`}>
          {revealed && value ? value : maskedValue}
        </p>
      </div>
      <button
        onClick={handleReveal}
        disabled={loading}
        className={`ml-3 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
          !canAccess
            ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
            : revealed
            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            : 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100'
        } disabled:opacity-50`}
      >
        {loading ? '...' : revealed ? 'Hide' : canAccess ? 'Reveal' : '🔒 Restricted'}
      </button>
      {violation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md mx-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">⚠️</span>
              <h3 className="text-lg font-bold text-red-700">HIPAA Violation</h3>
            </div>
            <p className="text-sm text-gray-700 mb-4">{violation}</p>
            <p className="text-xs text-gray-500 mb-4">
              This access attempt has been recorded in the audit log. Under HIPAA, unauthorized
              access to PHI can result in fines ranging from $100 to $50,000 per violation, up to
              $1.5 million per year.
            </p>
            <button
              onClick={() => setViolation(null)}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
            >
              I Understand
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
