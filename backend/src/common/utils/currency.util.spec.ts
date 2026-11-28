import { formatAZN } from './currency.util';

describe('formatAZN Currency Utility', () => {
  it('should format 0 as "Pulsuz" by default', () => {
    expect(formatAZN(0)).toBe('Pulsuz');
  });

  it('should format 0 as "0.00 ₼" when showFree is false', () => {
    expect(formatAZN(0, { showFree: false })).toBe('0.00 ₼');
  });

  it('should format standard amounts with ₼ symbol', () => {
    expect(formatAZN(25)).toBe('25.00 ₼');
    expect(formatAZN(14.5)).toBe('14.50 ₼');
    expect(formatAZN(99.99)).toBe('99.99 ₼');
  });

  it('should format with AZN code when useCode is true', () => {
    expect(formatAZN(25, { useCode: true })).toBe('25.00 AZN');
  });

  it('should format with custom decimal places', () => {
    expect(formatAZN(10.555, { decimals: 3 })).toBe('10.555 ₼');
    expect(formatAZN(10, { decimals: 0 })).toBe('10 ₼');
  });

  it('should handle negative numbers correctly', () => {
    expect(formatAZN(-25)).toBe('-25.00 ₼');
  });

  it('should handle NaN gracefully by defaulting to 0', () => {
    expect(formatAZN(NaN)).toBe('Pulsuz');
    expect(formatAZN(NaN, { showFree: false })).toBe('0.00 ₼');
  });

  it('should handle null safely without throwing TypeError', () => {
    expect(formatAZN(null)).toBe('Pulsuz');
    expect(formatAZN(null, { showFree: false })).toBe('0.00 ₼');
    expect(formatAZN(null, { showFree: false, useCode: true })).toBe('0.00 AZN');
  });

  it('should handle undefined safely without throwing TypeError', () => {
    expect(formatAZN(undefined)).toBe('Pulsuz');
    expect(formatAZN(undefined, { showFree: false })).toBe('0.00 ₼');
  });

  it('should handle non-number types gracefully', () => {
    expect(formatAZN('invalid' as any)).toBe('Pulsuz');
    expect(formatAZN({} as any, { showFree: false })).toBe('0.00 ₼');
  });
});
