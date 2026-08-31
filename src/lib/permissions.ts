/**
 * Runtime host-permission helpers.
 *
 * The manifest declares a broad `optional_host_permissions` entry but grants
 * nothing at install time. Before the extension can talk to the user's server
 * we must obtain a runtime grant for that server's origin. An MV3 extension
 * page/worker fetching a URL covered by a GRANTED host permission bypasses CORS
 * in both Chrome and Firefox, so once `requestOriginPermission` succeeds the
 * API client can reach the server with no server-side CORS configuration.
 */
import browser from 'webextension-polyfill';

/** `scheme://host[:port]/*` — origin only, any path the server URL carried is dropped. */
const originPattern = (serverUrl: string): string => `${new URL(serverUrl).origin}/*`;

/** Prompt the user to grant host access to the server's origin. Resolves to the grant result. */
export async function requestOriginPermission(serverUrl: string): Promise<boolean> {
  return browser.permissions.request({ origins: [originPattern(serverUrl)] });
}

/** Whether host access to the server's origin is already granted. */
export async function hasOriginPermission(serverUrl: string): Promise<boolean> {
  return browser.permissions.contains({ origins: [originPattern(serverUrl)] });
}
