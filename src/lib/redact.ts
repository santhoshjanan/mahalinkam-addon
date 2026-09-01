/**
 * Mask a secret for display: bullets for everything but the last 4 characters,
 * so a user can recognise which token is stored without it being copyable in
 * full. Short strings are fully masked.
 */
export function redactToken(token: string): string {
  const t = token.trim();
  if (t.length <= 4) return '•'.repeat(Math.max(t.length, 4));
  return '•'.repeat(Math.min(t.length - 4, 12)) + t.slice(-4);
}
