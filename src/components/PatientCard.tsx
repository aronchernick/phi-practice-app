'use client'

interface PatientCardProps {
  patient: {
    id: string
    mrn: string
    name?: string
    diagnosisCode?: string | null
  }
  selected: boolean
  onClick: () => void
}

export default function PatientCard({ patient, selected, onClick }: PatientCardProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
        selected
          ? 'bg-blue-50 border-blue-300 border'
          : 'bg-white border border-gray-200 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-bold">
          {(patient.name || patient.mrn).charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {patient.name || 'Name restricted'}
          </p>
          <p className="text-xs text-gray-500">{patient.mrn}</p>
        </div>
      </div>
      {patient.diagnosisCode && (
        <span className="inline-block mt-1.5 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
          {patient.diagnosisCode}
        </span>
      )}
    </button>
  )
}
