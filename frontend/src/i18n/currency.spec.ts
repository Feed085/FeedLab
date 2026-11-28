import { describe, it, expect } from 'vitest';
import { formatAZN } from './currency';

describe('Frontend formatAZN Utility', () => {
  it('formats 0 as "Pulsuz" when showFree is true', () => {
    expect(formatAZN(0)).toBe('Pulsuz');
  });

  it('formats 0 as "0.00 ₼" when showFree is false', () => {
    expect(formatAZN(0, { showFree: false })).toBe('0.00 ₼');
  });

  it('formats positive values with AZN symbol by default', () => {
    expect(formatAZN(25)).toBe('25.00 ₼');
    expect(formatAZN(10.5)).toBe('10.50 ₼');
    expect(formatAZN(100.99)).toBe('100.99 ₼');
  });

  it('formats with AZN code when useCode is true', () => {
    expect(formatAZN(25, { useCode: true })).toBe('25.00 AZN');
  });

  it('handles negative values correctly', () => {
    expect(formatAZN(-15)).toBe('-15.00 ₼');
  });

  it('handles NaN gracefully', () => {
    expect(formatAZN(NaN)).toBe('Pulsuz');
    expect(formatAZN(NaN, { showFree: false })).toBe('0.00 ₼');
  });

  it('handles null safely without throwing TypeError', () => {
    expect(formatAZN(null)).toBe('Pulsuz');
    expect(formatAZN(null, { showFree: false })).toBe('0.00 ₼');
    expect(formatAZN(null, { showFree: false, useCode: true })).toBe('0.00 AZN');
  });

  it('handles undefined safely without throwing TypeError', () => {
    expect(formatAZN(undefined)).toBe('Pulsuz');
    expect(formatAZN(undefined, { showFree: false })).toBe('0.00 ₼');
  });

  it('handles non-number types gracefully', () => {
    expect(formatAZN('not-a-number' as any)).toBe('Pulsuz');
    expect(formatAZN({} as any, { showFree: false })).toBe('0.00 ₼');
  });
});
