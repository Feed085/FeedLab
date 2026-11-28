export interface FormatAznOptions {
  showFree?: boolean; // If true, 0 is rendered as "Pulsuz" instead of "0.00 ₼" (default: true)
  useCode?: boolean; // If true, appends "AZN" instead of "₼" (default: false)
  decimals?: number; // Number of decimal places (default: 2)
}

export function formatAZN(amount: number | null | undefined, options: FormatAznOptions = {}): string {
  const { showFree = true, useCode = false, decimals = 2 } = options;

  let numericAmount = amount;
  if (typeof numericAmount !== 'number' || isNaN(numericAmount)) {
    numericAmount = 0;
  }

  if (numericAmount === 0 && showFree) {
    return 'Pulsuz';
  }

  const formattedNumber = numericAmount.toFixed(decimals);
  const suffix = useCode ? 'AZN' : '₼';
  return `${formattedNumber} ${suffix}`;
}
