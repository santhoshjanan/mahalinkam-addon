/**
 * Dev-only stand-in for `webextension-polyfill`, used by the standalone popup
 * preview harness (`vite.preview.config.ts` aliases the package to this file).
 * NOT bundled into the shipped extension.
 */
const store: Record<string, unknown> = {
  // Pre-configured so the popup boots straight to the ready state instead of
  // the "Set up mahalinkam" screen. The URL is intercepted by fetchMock.ts.
  serverUrl: 'https://preview.mahalinkam.test',
  token: 'preview-token',
};

const activeTab = {
  url: 'https://news.ycombinator.com/',
  title: 'Hacker News',
  favIconUrl: 'https://news.ycombinator.com/favicon.ico',
};

const browserMock = {
  storage: {
    local: {
      async get(keys?: string | string[]) {
        if (!keys) return { ...store };
        const list = Array.isArray(keys) ? keys : [keys];
        return Object.fromEntries(list.filter((k) => k in store).map((k) => [k, store[k]]));
      },
      async set(obj: Record<string, unknown>) {
        Object.assign(store, obj);
      },
      async remove(keys: string | string[]) {
        (Array.isArray(keys) ? keys : [keys]).forEach((k) => delete store[k]);
      },
    },
    onChanged: { addListener() {} },
  },
  tabs: {
    async query() {
      return [activeTab];
    },
    create({ url }: { url: string }) {
      console.info('[preview] tabs.create', url);
      window.open(url, '_blank', 'noopener');
    },
  },
  runtime: {
    async sendMessage() {},
    openOptionsPage() {
      console.info('[preview] runtime.openOptionsPage');
    },
  },
  action: {
    setIcon() {},
    setBadgeText() {},
    setBadgeBackgroundColor() {},
  },
  notifications: {
    create() {},
  },
};

export default browserMock;
