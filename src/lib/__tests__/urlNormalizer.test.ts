import { describe, it, expect } from 'vitest';
import { normalize, InvalidUrlError } from '../urlNormalizer';
import fixtures from '../__fixtures__/url-normalizer.json';

describe('normalize (shared fixture table)', () => {
  for (const c of fixtures as Array<{ in: string; out?: string; throws?: boolean }>) {
    it(`${c.in}`, () => {
      if (c.throws) {
        expect(() => normalize(c.in)).toThrow(InvalidUrlError);
      } else {
        expect(normalize(c.in)).toBe(c.out);
      }
    });
  }
});

it('rejects an over-long result', () => {
  expect(() => normalize('https://example.com/' + 'a'.repeat(900))).toThrow(InvalidUrlError);
});
