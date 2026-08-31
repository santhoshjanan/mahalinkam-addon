import { vi } from 'vitest';

const store: Record<string, unknown> = {};

export const browserMock = {
  storage: {
    local: {
      get: vi.fn(async (keys?: string | string[]) => {
        if (!keys) return { ...store };
        const list = Array.isArray(keys) ? keys : [keys];
        return Object.fromEntries(list.filter((k) => k in store).map((k) => [k, store[k]]));
      }),
      set: vi.fn(async (obj: Record<string, unknown>) => {
        Object.assign(store, obj);
      }),
      remove: vi.fn(async (keys: string | string[]) => {
        (Array.isArray(keys) ? keys : [keys]).forEach((k) => delete store[k]);
      }),
    },
    onChanged: { addListener: vi.fn() },
  },
  permissions: {
    request: vi.fn(async () => true),
    contains: vi.fn(async () => false),
  },
  tabs: {
    query: vi.fn(async () => [
      { url: 'https://a.test/x', title: 'X', favIconUrl: 'https://a.test/f.png' },
    ]),
    create: vi.fn(),
  },
  runtime: {
    openOptionsPage: vi.fn(),
  },
  __reset() {
    for (const k of Object.keys(store)) delete store[k];
  },
};

vi.mock('webextension-polyfill', () => ({ default: browserMock }));
