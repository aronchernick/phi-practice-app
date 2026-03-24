'use client'

interface AuditEntry {
  id: string
  userId: string
  patientId: string | null
  action: string
  fieldAccessed: string | null
  authorized: boolean
  timestamp: string
  outcome: string
}

export default function AuditLogTable({ logs }: { logs: AuditEntry[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-left">
            <th className="px-4 py-2 font-medium text-gray-600">Timestamp</th>
            <th className="px-4 py-2 font-medium text-gray-600">Action</th>
            <th className="px-4 py-2 font-medium text-gray-600">Field</th>
            <th className="px-4 py-2 font-medium text-gray-600">Patient</th>
            <th className="px-4 py-2 font-medium text-gray-600">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {logs.map((log) => (
            <tr key={log.id} className={!log.authorized ? 'bg-red-50' : ''}>
              <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">
                {new Date(log.timestamp).toLocaleString()}
              </td>
              <td className="px-4 py-2 font-mono text-xs">{log.action}</td>
              <td className="px-4 py-2 text-xs text-gray-600">{log.fieldAccessed || '—'}</td>
              <td className="px-4 py-2 text-xs text-gray-500 font-mono">
                {log.patientId ? log.patientId.slice(0, 8) + '...' : '—'}
              </td>
              <td className="px-4 py-2">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    log.outcome === 'success'
                      ? 'bg-green-100 text-green-700'
                      : log.outcome === 'denied'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {log.outcome === 'denied' && '⚠ '}
                  {log.outcome}
                </span>
              </td>
            </tr>
          ))}
          {logs.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                No audit entries yet. Interact with patient records to generate entries.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
