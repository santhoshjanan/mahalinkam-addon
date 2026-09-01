import { it, expect } from 'vitest';
import { redactToken } from '../redact';

it('keeps the last 4 characters and masks the rest', () => {
  expect(redactToken('abcdefghijklmnop3f9a')).toBe('••••••••••••3f9a');
});

it('caps the bullet run so a very long token does not overflow', () => {
  const r = redactToken('x'.repeat(80));
  expect(r.endsWith('xxxx')).toBe(true);
  expect(r.length).toBe(16); // 12 bullets + 4
});

it('fully masks short strings', () => {
  expect(redactToken('ab')).toBe('••••');
  expect(redactToken('abcd')).toBe('••••');
  expect(redactToken('')).toBe('••••');
});

it('trims surrounding whitespace before measuring', () => {
  expect(redactToken('  wxyz  ')).toBe('••••');
});
