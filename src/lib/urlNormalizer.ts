// Port of the server's App\Services\UrlNormalizer (spec §5.1).
// RELEASE-BLOCKING cross-client contract: output must be byte-identical to the
// Laravel server for every case. The fixture table in src/lib/__fixtures__/
// url-normalizer.json must stay identical to the server's
// app/Support/url-normalizer-fixtures.php.

export class InvalidUrlError extends Error {}

export const MAX_LENGTH = 768;

export const TRACKING_PARAMS: string[] = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'gclid',
  'gbraid',
  'wbraid',
  'fbclid',
  'msclkid',
  'mc_cid',
  'mc_eid',
  'ref',
  'ref_src',
  'igshid',
  'si',
];

export function normalize(input: string): string {
  // 1. trim
  const trimmed = input.trim();

  // 2. parse
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new InvalidUrlError(`Unparseable URL: ${trimmed}`);
  }

  // 3. scheme
  const scheme = url.protocol.replace(/:$/, '').toLowerCase();
  if (scheme !== 'http' && scheme !== 'https') {
    throw new InvalidUrlError(`Unsupported scheme: ${scheme}`);
  }

  // 4. host + port
  const host = url.hostname.toLowerCase();
  let port = url.port;
  if ((scheme === 'http' && port === '80') || (scheme === 'https' && port === '443')) {
    port = '';
  }

  // 5. fragment: never re-added.
  // 6. userinfo: never re-added; URL is rebuilt from scheme/host/port/path/query only.

  // 7. query — drop tracking params, keep everything else verbatim, original order, no sort.
  let query = '';
  if (url.search.length > 1) {
    const kept: string[] = [];
    for (const seg of url.search.slice(1).split('&')) {
      if (seg === '') {
        continue;
      }
      const eq = seg.indexOf('=');
      const rawKey = eq === -1 ? seg : seg.slice(0, eq);
      if (TRACKING_PARAMS.includes(decodeURIComponent(rawKey).toLowerCase())) {
        continue;
      }
      kept.push(seg);
    }
    query = kept.join('&');
  }

  // 8. path — empty -> '/', otherwise strip trailing slash(es).
  let path = url.pathname;
  if (path === '') {
    path = '/';
  } else if (path !== '/' && path.endsWith('/')) {
    path = path.replace(/\/+$/, '');
  }

  // 9. reassemble
  const result = `${scheme}://${host}${port ? `:${port}` : ''}${path}${query ? `?${query}` : ''}`;

  // 10. length in Unicode code points
  if ([...result].length > MAX_LENGTH) {
    throw new InvalidUrlError(`Normalized URL exceeds ${MAX_LENGTH} characters`);
  }

  return result;
}
