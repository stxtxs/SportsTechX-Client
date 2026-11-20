/**
 * GSTVCR26 number formats (Nov 2026): every dollar amount and percentage the
 * report computes is shown to exactly one decimal place, whatever the unit.
 *   money(12979) → "$13.0B" · money(412) → "$412.0M" · money(3.4) → "$3.4M"
 *   pctText(57.64) → "57.6%"
 * Amounts arrive in millions of USD. Editorial copy (quotes, prices, CMS text)
 * is left as written.
 */

const ONE_DECIMAL = { minimumFractionDigits: 1, maximumFractionDigits: 1 } as const;

/** Round to one decimal place, as a number. */
export const round1 = (n: number): number => Math.round(n * 10) / 10;

/** "$13.0B" from 1,000M up, "$412.0M" below. */
export function money(m: number): string {
  if (Math.abs(m) >= 1000) return `$${(m / 1000).toFixed(1)}B`;
  return `$${m.toFixed(1)}M`;
}

/** A millions figure for columns already headed "($M)": "1,234.0". */
export function millions(m: number): string {
  return m.toLocaleString('en-US', ONE_DECIMAL);
}

/** part as a share of whole, rounded to one decimal (0 when whole is 0). */
export function pctOf(part: number, whole: number): number {
  return whole > 0 ? round1((part / whole) * 100) : 0;
}

/** A percentage value (already ×100) as "57.6%". */
export function pctText(n: number): string {
  return `${n.toFixed(1)}%`;
}
