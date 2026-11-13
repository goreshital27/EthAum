/**
 * Formats monetary amounts stored in integer cents to USD string
 * Example: 450000 -> "$4,500"
 */
export function formatCentsToUSD(cents) {
  if (cents === null || cents === undefined || isNaN(cents)) {
    return null;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default formatCentsToUSD;
