export const PHI_ACCESS_RULES: Record<string, readonly string[]> = {
  doctor: ['name', 'dob', 'ssn', 'address', 'phone', 'email', 'insurance', 'diagnosis', 'notes'],
  nurse: ['name', 'dob', 'address', 'phone', 'email', 'diagnosis', 'notes'],
  receptionist: ['name', 'phone', 'email', 'insurance'],
  auditor: ['name', 'dob', 'ssn', 'address', 'phone', 'email', 'insurance', 'diagnosis'],
  admin: ['*'],
} as const

export type Role = keyof typeof PHI_ACCESS_RULES

export function canAccess(role: string, field: string): boolean {
  const allowed = PHI_ACCESS_RULES[role]
  if (!allowed) return false
  return allowed.includes('*') || allowed.includes(field)
}

/** Return the list of fields a role is allowed to access */
export function accessibleFields(role: string): string[] {
  const allowed = PHI_ACCESS_RULES[role]
  if (!allowed) return []
  if (allowed.includes('*')) {
    return ['name', 'dob', 'ssn', 'address', 'phone', 'email', 'insurance', 'diagnosis', 'notes']
  }
  return [...allowed]
}

/** Human-readable field labels */
export const FIELD_LABELS: Record<string, string> = {
  name: 'Full Name',
  dob: 'Date of Birth',
  ssn: 'Social Security Number',
  address: 'Address',
  phone: 'Phone Number',
  email: 'Email',
  insurance: 'Insurance ID',
  diagnosis: 'Diagnosis',
  notes: 'Clinical Notes',
}
