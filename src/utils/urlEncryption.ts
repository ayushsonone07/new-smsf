import { getSession } from '../app/auth/session'

const SECRET_KEY = 'mbg_customer_details_2025'

export function encryptUrlParam(text: string, key: string = SECRET_KEY): string {
  if (!text) return ''

  const utf8Bytes = new TextEncoder().encode(text)
  const keyBytes = new TextEncoder().encode(key)

  const encryptedBytes = new Uint8Array(utf8Bytes.length)
  for (let i = 0; i < utf8Bytes.length; i++) {
    encryptedBytes[i] = utf8Bytes[i] ^ keyBytes[i % keyBytes.length]
  }

  let binaryString = ''
  for (let i = 0; i < encryptedBytes.length; i++) {
    binaryString += String.fromCharCode(encryptedBytes[i])
  }

  return btoa(binaryString)
}

export function decryptUrlParam(encryptedText: string, key: string = SECRET_KEY): string {
  if (!encryptedText) return ''

  try {
    const decoded = atob(encryptedText)
    let result = ''
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length))
    }
    if (result && result.length > 0) {
      return result
    }
  } catch {
    // Old method fallback below
  }

  try {
    const decoded = atob(encryptedText)
    const keyBytes = new TextEncoder().encode(key)

    const encryptedBytes = new Uint8Array(decoded.length)
    for (let i = 0; i < decoded.length; i++) {
      encryptedBytes[i] = decoded.charCodeAt(i)
    }

    const decryptedBytes = new Uint8Array(encryptedBytes.length)
    for (let i = 0; i < encryptedBytes.length; i++) {
      decryptedBytes[i] = encryptedBytes[i] ^ keyBytes[i % keyBytes.length]
    }

    return new TextDecoder().decode(decryptedBytes)
  } catch (error) {
    console.error('Failed to decrypt URL parameter:', error)
    return ''
  }
}

export function encryptUrlParams(params: Record<string, string>): string {
  const encryptedParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      encryptedParams.set(key, encryptUrlParam(value))
    }
  })
  return encryptedParams.toString()
}

export function decryptUrlParams(searchParams: URLSearchParams): Record<string, string> {
  const decrypted: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    const decryptedValue = decryptUrlParam(value)
    if (decryptedValue) {
      decrypted[key] = decryptedValue
    }
  })
  return decrypted
}

/**
 * Builds the encrypted customer details form URL matching SMSF parity.
 * Resulting URL: `/customer-details?contact=${encryptedPhone}&validation=${encryptedToken}`
 */
export function getCustomerFormUrl(phone?: string | null, isDuplicate = false): string {
  const contact = (phone && phone !== '-' ? phone : '').trim()
  if (!contact) return ''

  const session = getSession()
  const rawToken =
    session?.token ||
    (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('token') : '') ||
    ''

  const validation = rawToken && rawToken.split('.').length === 3 ? rawToken : 'customer'

  const encryptedParams = encryptUrlParams({
    contact,
    validation,
    ...(isDuplicate ? { isDuplicate: 'true' } : {}),
  })

  return `/customer-details?${encryptedParams}`
}
