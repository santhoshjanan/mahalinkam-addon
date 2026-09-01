import { AuthError, NetworkError, NotConfiguredError, ServerError } from './errors';

/** Plain-language message for a failed connection check (options page + the
 *  in-popup settings panel share this). */
export function pingErrorMessage(err: unknown): string {
  if (err instanceof NotConfiguredError) return 'Fill in both fields.';
  if (err instanceof AuthError) return 'The server rejected this token.';
  if (err instanceof NetworkError) {
    return "Couldn't reach the server (is the URL right? is it running?).";
  }
  if (err instanceof ServerError) return `Server error (HTTP ${err.status}).`;
  return err instanceof Error ? err.message : String(err);
}
