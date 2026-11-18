/** Shared formatting for market figures, dates and places. */

import { fmtAmount } from '@/lib/format';

/** USD amount in the Atlas format ($0.33M, $9.70M, $65.70B, —). See lib/format.ts. */
export const fmtUsd = (n?: number | null, year?: number | null): string => fmtAmount(n, 'USD', '—', year);
/** Chart axes and hover tooltips: same format, "$0.00M" rather than a dash at zero. */
export const fmtUsdB = (n: number) => fmtAmount(n, 'USD', '$0.00M');
export const fmtCount = (n?: number | null) => Number(n ?? 0).toLocaleString();

/** Coarse relative time ("today", "3 days ago", "5 months ago").
 *  Coarse on purpose: these sit in card meta lines, where "2 months ago" reads
 *  better than a date and an exact hour would be noise. */
export function ago(d?: string | null): string {
	if (!d) return '';
	const days = Math.round((Date.now() - new Date(d).getTime()) / 864e5);
	if (days < 1) return 'today';
	if (days < 14) return `${days} day${days === 1 ? '' : 's'} ago`;
	if (days < 60) return `${Math.round(days / 7)} weeks ago`;
	if (days < 730) return `${Math.round(days / 30)} months ago`;
	return `${Math.round(days / 365)} years ago`;
}

/** "Berlin, Germany", dropping whichever half is missing. */
export const place = (city?: string | null, country?: string | null) => [city, country].filter(Boolean).join(', ');
