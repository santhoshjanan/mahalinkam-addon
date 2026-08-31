import { it, expect, vi, beforeEach } from 'vitest';
import { browserMock } from '../../test/mockBrowser';
import { requestOriginPermission, hasOriginPermission } from '../permissions';

beforeEach(() => vi.clearAllMocks());

it('requests the origin derived from the server url', async () => {
  await requestOriginPermission('https://mhl.example.com/sub');
  expect(browserMock.permissions.request).toHaveBeenCalledWith({
    origins: ['https://mhl.example.com/*'],
  });
});

it('reports whether the permission is already held', async () => {
  browserMock.permissions.contains.mockResolvedValueOnce(true);
  expect(await hasOriginPermission('https://mhl.example.com')).toBe(true);
});
