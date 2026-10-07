export function buildLoginLink(
  token: string,
): string {
  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : ''

  return `${origin}/login?token=${encodeURIComponent(token)}`
}
