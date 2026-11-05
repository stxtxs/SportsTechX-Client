/** Shared types + IH formatting for the Monthly Roundup. */

export type RoundupMode = 'funding' | 'ma';
export type Metric = 'amount' | 'count';
export type Perspective = 'acquiree' | 'acquirer';

export interface Grouping { label: string; deal_count: number; total_amount: number }

/** IH style: always millions, one decimal ("$938.9M", "$0.5M"). */
export const fmtM = (usd: number) => `$${(usd / 1e6).toFixed(1)}M`;

/** IH `+12.3% vs prev month` / `-4.0% vs prev month`. */
export const fmtChange = (pct?: number) => (pct == null || !Number.isFinite(pct) ? '' : `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}% vs prev month`);

/**
 * The server never drops a row (missing value → 'Unclassified'); IH's grouping
 * SQL did (`IS NOT NULL AND != ''`), so its pies and breakdowns only ever
 * showed classified rows. Dropped here to match.
 */
const UNCLASSIFIED = 'Unclassified';

/** IH renamed the three sector pillars for display (server utils/sector-mapping.ts). */
const PILLAR_LABEL: Record<string, string> = {
	'Activity & Performance': 'For Athletes',
	'Fans & Content': 'For Fans',
	'Management & Organisation': 'For Executives',
};

export const ihGroups = (rows: Grouping[] | undefined, pillars = false): Grouping[] =>
	(rows ?? []).filter((g) => g.label !== UNCLASSIFIED).map((g) => (pillars ? { ...g, label: PILLAR_LABEL[g.label] ?? g.label } : g));
