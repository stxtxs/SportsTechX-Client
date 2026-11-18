/**
 * The one set of number and date formats on Atlas (dev handover v1 §4 Formats).
 *
 *   Amounts   millions with two decimals ($0.33M, $9.70M); from one billion up,
 *             billions with two decimals ($65.70B).
 *   Dates     full date "Nov 04, 2026"; month "Nov 2026". Deal tables show the
 *             month only.
 *
 * Every page formats through these, so a figure cannot read "$333,000" on one
 * page and "$0.3M" on the next. Pinned to en-US so the output does not drift
 * with the viewer's locale ("10/8/2026" was the locale default leaking through).
 *
 * Pure — `format.check.ts` runs it without React.
 */

import { convert, displayCurrency } from './currency.ts';

export type Currency = 'USD' | 'EUR';

const SYMBOL: Record<string, string> = { USD: '$', EUR: '€', GBP: '£' };

/**
 * Amount in the handover format, or `empty` when there is nothing to show.
 *
 * `currency` is the figure's OWN currency. USD and EUR figures are shown in the
 * viewer's chosen currency (lib/currency.ts), converted at the average rate of
 * `year` (the year the figure belongs to; the latest rate when unknown). Any
 * other currency is shown as it is.
 */
export function fmtAmount(n: number | string | null | undefined, currency: Currency | string = 'USD', empty = '—', year?: number | null): string {
	const raw = typeof n === 'string' ? Number(n) : n;
	if (raw == null || !Number.isFinite(raw) || raw <= 0) return empty;
	const source = (currency || 'USD').toUpperCase();
	const target = source === 'USD' || source === 'EUR' ? displayCurrency() : source;
	const v = convert(raw, source, target, year);
	const sym = SYMBOL[target] ?? `${target} `;
	return v >= 1e9 ? `${sym}${(v / 1e9).toFixed(2)}B` : `${sym}${(v / 1e6).toFixed(2)}M`;
}

/** The year a date-ish value falls in, for converting at that year's rate. */
export const yearOf = (d: string | number | Date | null | undefined): number | null => {
	if (d == null || d === '') return null;
	const y = toDate(d).getUTCFullYear();
	return Number.isFinite(y) ? y : null;
};

/** Parse a date-ish value without shifting a bare `YYYY-MM-DD` to the previous day in negative-offset zones. */
function toDate(d: string | number | Date): Date {
	if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return new Date(`${d}T00:00:00Z`);
	return d instanceof Date ? d : new Date(d);
}

const isBareDay = (d: unknown) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);

/** "Nov 04, 2026". */
export function fmtFullDate(d: string | number | Date | null | undefined, empty = '—'): string {
	if (d == null || d === '') return empty;
	const date = toDate(d);
	if (Number.isNaN(date.getTime())) return empty;
	return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric', ...(isBareDay(d) ? { timeZone: 'UTC' } : {}) });
}

/** "Nov 2026". */
export function fmtMonth(d: string | number | Date | null | undefined, empty = '—'): string {
	if (d == null || d === '') return empty;
	const date = toDate(d);
	if (Number.isNaN(date.getTime())) return empty;
	return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric', ...(isBareDay(d) ? { timeZone: 'UTC' } : {}) });
}

/** Keyboard shortcuts in both systems: "⌘K / Ctrl+K". */
export const shortcut = (key: string) => `⌘${key} / Ctrl+${key}`;
