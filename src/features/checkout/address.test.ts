import { describe, expect, it } from 'vitest';
import { toE164 } from '../account/phone';
import { looksLikePhone } from './address';

describe('looksLikePhone', () => {
  it.each(['012 345 678', '0961234567', '+855 12 345 678', '85512345678', '+66812345678'])('accepts %s', (v) => {
    expect(looksLikePhone(v)).toBe(true);
  });

  it.each(['', '12345', 'phone', '012 34', '+855 12'])('rejects %s', (v) => {
    expect(looksLikePhone(v)).toBe(false);
  });
});

describe('toE164', () => {
  it('normalises Cambodian numbers', () => {
    expect(toE164('012 345 678')).toBe('+85512345678');
    expect(toE164('(096) 123-4567')).toBe('+855961234567');
    expect(toE164('85512345678')).toBe('+85512345678');
    expect(toE164('12345678')).toBe('+85512345678');
  });

  it('keeps international numbers and refuses junk', () => {
    expect(toE164('+66812345678')).toBe('+66812345678');
    expect(toE164('hello')).toBeNull();
    expect(toE164('0123')).toBeNull();
  });
});
