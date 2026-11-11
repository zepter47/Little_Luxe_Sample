// Numeric release IDs make the compatibility policy unambiguous.
export const APP_VERSION = 1
export function requiresUpdate(policy: unknown, current = APP_VERSION): boolean {
  if (!policy || typeof policy !== 'object') return false
  const minimum = (policy as { minimumSupportedVersion?: unknown }).minimumSupportedVersion
  return typeof minimum === 'number' && Number.isSafeInteger(minimum) && minimum > current
}
