/**
 * Typed errors surfaced by {@link module:lib/apiClient}. Callers switch on the
 * class to decide UX: re-auth, show field errors, retry manually, etc.
 */

/** Settings (server URL + token) are missing — the extension is not set up yet. */
export class NotConfiguredError extends Error {
  constructor(message = 'Extension is not configured.') {
    super(message);
    this.name = 'NotConfiguredError';
  }
}

/** The `fetch` call itself rejected (offline, DNS, CORS, TLS…). No response. */
export class NetworkError extends Error {
  constructor(message = 'Network request failed.') {
    super(message);
    this.name = 'NetworkError';
  }
}

/** Server replied `401` — the token is missing, wrong, or revoked. */
export class AuthError extends Error {
  constructor(message = 'Unauthenticated.') {
    super(message);
    this.name = 'AuthError';
  }
}

/** Any other non-2xx response (`500`, `404`, `429`, …). Carries the HTTP status. */
export class ServerError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ServerError';
  }
}

/** Server replied `422` — Laravel validation failure. `fields` is `{errors}`. */
export class ValidationError extends Error {
  constructor(
    message: string,
    public fields: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}
