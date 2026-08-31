import { it, expect, vi } from 'vitest';
import { browserMock } from '../../test/mockBrowser';

(browserMock as unknown as { tabs: unknown }).tabs = {
  query: vi.fn(async () => [
    { url: 'https://a.test/x', title: 'X', favIconUrl: 'https://a.test/f.png' },
  ]),
  create: vi.fn(),
};

import { useActiveTab } from '../useActiveTab';

it('returns the active tab basics', async () => {
  const t = await useActiveTab();
  expect(t).toEqual({ url: 'https://a.test/x', title: 'X', favIconUrl: 'https://a.test/f.png' });
});
