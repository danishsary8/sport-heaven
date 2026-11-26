import { describe, expect, it } from 'vitest';
import { EMPTY_PRINT, printChoice, printErrors } from './printState';

const filled = { ...EMPTY_PRINT, on: true, name: 'SOKHA', number: '7' };

describe('print studio checks', () => {
  it('sends nothing while printing is off', () => {
    expect(printChoice(EMPTY_PRINT)).toBeNull();
  });

  it('sends a trimmed name and a numeric number when the fields are valid', () => {
    expect(printChoice({ ...filled, name: ' SOKHA ' })).toEqual({ name: 'SOKHA', number: 7, patch: 'none', font: 'pro-condensed' });
  });

  it('holds Add to bag while a field is wrong', () => {
    expect(printChoice({ ...filled, name: '' })).toBe('invalid');
    expect(printChoice({ ...filled, number: '100' })).toBe('invalid');
  });

  it('names each problem', () => {
    expect(printErrors({ ...filled, name: '' }).name).toBe('nameRequired');
    expect(printErrors({ ...filled, name: 'ABCDEFGHIJKLMNO' }).name).toBe('nameLong');
    expect(printErrors({ ...filled, name: 'Sokha' }).name).toBe('nameChars');
    expect(printErrors({ ...filled, name: "O'NEIL-JR" }).name).toBeUndefined();
    expect(printErrors({ ...filled, number: '0' }).number).toBe('number');
    expect(printErrors({ ...filled, number: '7.5' }).number).toBe('number');
  });

  it('uses the limits from the API when given', () => {
    expect(printErrors({ ...filled, name: 'ABCDEFGHIJ' }, 8).name).toBe('nameLong');
    expect(printErrors({ ...filled, number: '0' }, 14, 0, 99).number).toBeUndefined();
  });
});
