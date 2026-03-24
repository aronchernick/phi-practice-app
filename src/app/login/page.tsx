'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const DEMO_ACCOUNTS = [
  { email: 'doctor@example.com', role: 'Doctor', icon: '🩺' },
  { email: 'nurse@example.com', role: 'Nurse', icon: '💉' },
  { email: 'receptionist@example.com', role: 'Receptionist', icon: '📋' },
  { email: 'auditor@example.com', role: 'Auditor', icon: '🔍' },
  { email: 'admin@example.com', role: 'Admin', icon: '⚙️' },
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent, loginEmail?: string) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await signIn('credentials', {
      email: loginEmail || email,
      password: loginEmail ? 'password123' : password,
      redirect: false,
    })

    if (result?.error) {
      setError('Invalid credentials. Demo password is: password123')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">🏥 PHI Shield</h1>
          <p className="text-sm text-gray-500 mt-1">HIPAA Training Simulator</p>
        </div>

        {/* Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 text-xs text-amber-800">
          ⚠️ <strong>Training Environment Only.</strong> This app uses entirely fictional data for
          training purposes only. No real PHI is used or stored.
        </div>

        {/* Login form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Sign In</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="doctor@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="password123"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Quick login buttons */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-3">Quick Demo Login</h3>
          <div className="grid gap-2">
            {DEMO_ACCOUNTS.map((acct) => (
              <button
                key={acct.email}
                onClick={(e) => handleLogin(e, acct.email)}
                disabled={loading}
                className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                <span className="text-lg">{acct.icon}</span>
                <div className="text-left">
                  <p className="font-medium text-gray-800">{acct.role}</p>
                  <p className="text-xs text-gray-500">{acct.email}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
