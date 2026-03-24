'use client'

import { useSession } from 'next-auth/react'

const ROLES = [
  { value: 'doctor', label: 'Doctor', icon: '🩺' },
  { value: 'nurse', label: 'Nurse', icon: '💉' },
  { value: 'receptionist', label: 'Receptionist', icon: '📋' },
  { value: 'auditor', label: 'Auditor', icon: '🔍' },
]

export default function RoleSelector() {
  const { data: session } = useSession()
  const currentRole = session?.user?.role || 'doctor'

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-gray-500">ROLE:</span>
      <div className="flex gap-1">
        {ROLES.map((r) => (
          <span
            key={r.value}
            className={`px-2.5 py-1 text-xs font-medium rounded-full ${
              currentRole === r.value
                ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            {r.icon} {r.label}
          </span>
        ))}
      </div>
    </div>
  )
}
