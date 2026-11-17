/**
 * Display currency (handover v1 §4 Formats; fix list 17 Nov, 1.5).
 *
 * The user picks USD or EUR in Preferences; the default is USD. Every amount on
 * the platform goes through `fmtAmount` (lib/format.ts), which converts from
 * the figure's own currency into this one at the average rate of the year the
 * figure belongs to.
 *
 * Two stop-gaps until the backend serves them (see the Notion backend notes):
 *   - RATES is a client table of yearly averages. Values up to 2024 are the ECB
 *     annual reference averages; 2025 and 2026 are provisional and must be
 *     replaced with the published figures.
 *   - The choice is stored in this browser, not on the account, so it does not
 *     follow the user to another device.
 *
 * Pure apart from the storage helpers, which no-op outside a browser, so the
 * node self-checks keep the USD default.
 */

export type DisplayCurrency = 'USD' | 'EUR';

/** US dollars per euro, yearly average. */
export const USD_PER_EUR: Record<number, number> = {
	2010: 1.3257, 2011: 1.392, 2012: 1.2848, 2013: 1.3281, 2014: 1.3285,
	2015: 1.1095, 2016: 1.1069, 2017: 1.1297, 2018: 1.181, 2019: 1.1195,
	2020: 1.1422, 2021: 1.1827, 2022: 1.053, 2023: 1.0813, 2024: 1.0824,
	// Provisional: replace with the published averages.
	2025: 1.13, 2026: 1.15,
};
const YEARS = Object.keys(USD_PER_EUR).map(Number).sort((a, b) => a - b);
const FIRST = YEARS[0]!;
const LAST = YEARS[YEARS.length - 1]!;

/** The rate for a year, clamped to the table (no year → the latest). */
export function usdPerEur(year?: number | null): number {
	const y = year == null || !Number.isFinite(year) ? LAST : Math.min(Math.max(Math.trunc(year), FIRST), LAST);
	return USD_PER_EUR[y] ?? USD_PER_EUR[LAST]!;
}

/** Convert between USD and EUR; any other pair is returned unchanged. */
export function convert(amount: number, from: string, to: string, year?: number | null): number {
	const f = from.toUpperCase(), t = to.toUpperCase();
	if (f === t) return amount;
	if (f === 'USD' && t === 'EUR') return amount / usdPerEur(year);
	if (f === 'EUR' && t === 'USD') return amount * usdPerEur(year);
	return amount;
}

// ── The viewer's choice ────────────────────────────────────────────────────
const KEY = 'stx:display-currency';
const listeners = new Set<() => void>();
let cached: DisplayCurrency | null = null;

export function displayCurrency(): DisplayCurrency {
	if (cached) return cached;
	if (typeof window === 'undefined') return 'USD';
	try { cached = localStorage.getItem(KEY) === 'EUR' ? 'EUR' : 'USD'; } catch { cached = 'USD'; }
	return cached;
}

export function setDisplayCurrency(c: DisplayCurrency): void {
	cached = c;
	try { localStorage.setItem(KEY, c); } catch { /* not persisted: this session only */ }
	listeners.forEach((l) => l());
}

export function subscribeCurrency(l: () => void): () => void {
	listeners.add(l);
	return () => { listeners.delete(l); };
}
