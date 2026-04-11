export interface Currency {
  code: string
  name: string
  symbol: string
  locale: string
  decimal_digits: number
}

/**
 * Formats a number as a currency string using the currency's locale.
 *
 * formatCurrency(1234.56, 'INR') → '₹1,234.56'
 * formatCurrency(1234.56, 'USD') → '$1,234.56'
 * formatCurrency(1234,    'JPY') → '¥1,234'
 */
export function formatCurrency(
  amount: number,
  currency: Pick<Currency, 'code' | 'locale' | 'decimal_digits'>
): string {
  try {
    return new Intl.NumberFormat(currency.locale, {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: currency.decimal_digits,
      maximumFractionDigits: currency.decimal_digits,
    }).format(amount)
  } catch {
    // Fallback if Intl fails (e.g. unsupported locale on older devices)
    return `${amount.toFixed(currency.decimal_digits)}`
  }
}

/**
 * Convenience overload — pass just the currency code if you already have
 * the full Currency object available from the store.
 *
 * Usage: formatAmount(1234.56, currencyStore.current)
 */
export function formatAmount(amount: number, currency: Currency): string {
  return formatCurrency(amount, currency)
}
