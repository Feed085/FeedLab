export interface FormatAznOptions {
  showFree?: boolean;
  useCode?: boolean;
  decimals?: number;
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

export const formatAznPrice = (amount: number | null | undefined, options: FormatAznOptions = { useCode: true }): string => {
  return formatAZN(amount, options);
};
