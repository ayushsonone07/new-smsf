const STORAGE_PREFIX = 'smsf.mock.'

interface PersistedEnvelope<T> {
  version: number
  data: T
}

function storage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage
  } catch {
    return null
  }
}

/** Reads a versioned mock snapshot. Returns null when missing/stale/broken. */
export function readPersisted<T>(
  name: string,
  version: number,
): T | null {
  try {
    const raw = storage()?.getItem(`${STORAGE_PREFIX}${name}`)
    if (!raw) return null

    const parsed = JSON.parse(raw) as PersistedEnvelope<T>

    if (parsed.version !== version || !parsed.data) {
      return null
    }

    return parsed.data
  } catch {
    return null
  }
}

/** Writes a versioned mock snapshot. Never throws (quota / private mode). */
export function writePersisted<T>(
  name: string,
  version: number,
  data: T,
): void {
  try {
    storage()?.setItem(
      `${STORAGE_PREFIX}${name}`,
      JSON.stringify({ version, data }),
    )
  } catch {
    // ignore — mock data simply stays in memory
  }
}
