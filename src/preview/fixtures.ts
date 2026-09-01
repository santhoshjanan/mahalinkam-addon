/**
 * Fixture data for the popup preview harness. Shapes mirror the real API
 * (`src/lib/apiClient.ts`): flat `Folder[]`, flat `Tag[]`, `Paginated<Bookmark>`.
 */
import type { Bookmark, Folder, Tag } from '../lib/apiClient';

export const folders: Folder[] = [
  { id: 1, parent_id: null, name: 'Reading', position: 0 },
  { id: 2, parent_id: 1, name: 'Tech & Engineering', position: 0 },
  { id: 3, parent_id: 1, name: 'Fiction', position: 1 },
  { id: 9, parent_id: 2, name: 'Design Systems', position: 0 },
  { id: 4, parent_id: null, name: 'Work', position: 1 },
  { id: 5, parent_id: 4, name: 'Clients', position: 0 },
  { id: 6, parent_id: 5, name: 'Acme Corp', position: 0 },
  { id: 7, parent_id: null, name: 'Recipes', position: 2 },
  { id: 8, parent_id: null, name: 'Archive', position: 3 },
];

export const tags: Tag[] = [
  { id: 1, name: 'reference' },
  { id: 2, name: 'to-read' },
  { id: 3, name: 'rust' },
  { id: 4, name: 'typescript' },
  { id: 5, name: 'ux' },
  { id: 6, name: 'inspiration' },
];

const FAVICONS = [
  // small inline SVG discs so rows look real offline / under CSP
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22%3E%3Ccircle cx=%228%22 cy=%228%22 r=%227%22 fill=%22%23f97316%22/%3E%3C/svg%3E',
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22%3E%3Crect width=%2216%22 height=%2216%22 rx=%223%22 fill=%22%232563eb%22/%3E%3C/svg%3E',
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22%3E%3Ccircle cx=%228%22 cy=%228%22 r=%227%22 fill=%22%2316a34a%22/%3E%3C/svg%3E',
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22%3E%3Crect width=%2216%22 height=%2216%22 rx=%228%22 fill=%22%23db2777%22/%3E%3C/svg%3E',
  null,
];

const TITLES: Record<number | 'unfiled', string[]> = {
  1: ['The Timeless Way of Building', 'How to Read a Book', 'On Writing Well'],
  2: [
    'Designing Data-Intensive Applications',
    'The Rust Programming Language, 2024 edition — an unusually long title to test truncation behaviour in the row',
    'What Every Programmer Should Know About Memory',
    'A Philosophy of Software Design',
    'The Morning Paper archive',
  ],
  3: ['Piranesi', 'The Left Hand of Darkness', 'Blindsight', 'Klara and the Sun'],
  9: [
    'Material Design 3 guidelines',
    'Refactoring UI',
    'Practical Typography',
    'Every Layout',
    'Radix Primitives',
    'Inclusive Components',
  ],
  4: ['Q3 planning doc', 'Team handbook', 'On-call runbook'],
  5: ['Client roster spreadsheet', 'Standard MSA template'],
  6: ['Acme rebrand brief', 'Acme design review notes', 'Acme staging environment'],
  7: [
    'Weeknight dal',
    'No-knead bread',
    'Sichuan mapo tofu',
    'Roast chicken, the only recipe',
    'Olive oil cake',
  ],
  8: ['Old blog (2011)', 'Defunct startup landing page', 'Conference talk that aged badly'],
  unfiled: [
    'Something I opened once and never filed',
    'A GitHub issue thread',
    'Tab I meant to read at lunch',
    'Stack Overflow answer about timezones',
  ],
};

const HOSTS = [
  'example.com',
  'github.com',
  'developer.mozilla.org',
  'news.ycombinator.com',
  'arxiv.org',
  'smashingmagazine.com',
];

function makeBookmarks(key: number | 'unfiled', count: number): Bookmark[] {
  const base = TITLES[key] ?? [];
  const out: Bookmark[] = [];
  for (let i = 0; i < count; i++) {
    const seed = (typeof key === 'number' ? key : 99) * 1000 + i;
    const title = base[i] ?? `${base[i % Math.max(base.length, 1)] ?? 'Saved link'} (${i + 1})`;
    const hostBase = HOSTS[seed % HOSTS.length];
    out.push({
      id: seed,
      url: `https://${hostBase}/p/${seed}`,
      normalized_url: `https://${hostBase}/p/${seed}`,
      title,
      description: null,
      favicon_url: FAVICONS[seed % FAVICONS.length],
      folder_id: typeof key === 'number' ? key : null,
      tags: [],
      metadata_status: 'done',
      created_at: new Date(Date.UTC(2026, 7, 1 + (seed % 27))).toISOString(),
      updated_at: new Date(Date.UTC(2026, 7, 1 + (seed % 27))).toISOString(),
    });
  }
  return out;
}

/** Per-folder bookmark stores. "Tech & Engineering" is deliberately large to
 *  exercise the "Load more" paging control. */
export const bookmarksByFolder: Record<string, Bookmark[]> = {
  '1': makeBookmarks(1, 3),
  '2': makeBookmarks(2, 63),
  '3': makeBookmarks(3, 4),
  '9': makeBookmarks(9, 6),
  '4': makeBookmarks(4, 3),
  '5': makeBookmarks(5, 2),
  '6': makeBookmarks(6, 3),
  '7': makeBookmarks(7, 12),
  '8': makeBookmarks(8, 3),
  unfiled: makeBookmarks('unfiled', 7),
};

export const allBookmarks: Bookmark[] = Object.values(bookmarksByFolder).flat();

export const PER_PAGE = 50;
