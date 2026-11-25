/**
 * Role, LinkedIn and the Organisation block on Account (D1, 1.5), on all three
 * solutions.
 *
 * Where each field lives, until the backend gives them columns of their own:
 *   - Role → `profiles.job_title`; organisation name → `profiles.company_name`.
 *   - LinkedIn and the rest of the Organisation block (type, website,
 *     headquarters, size) → `profiles.dashboard_config.account`.
 *   - On Scout the same values are also written to the Scout record
 *     (`PATCH /api/scout`), which verification and Deal Flow read.
 * Reading falls back to the Scout record, so what a Scout entered in the old
 * thesis wizard shows here before their first save (3.3).
 *
 * Size is stored with its currency (3.2). The old wizard asked for "Fund size /
 * AUM (USD)", so a Scout record's `aum` is read as US dollars.
 *
 * Pure, so `account-details-model.check.ts` runs it without React.
 */

export type Money = { amount: number | null; currency: 'USD' | 'EUR' };

export interface Organisation {
	name: string;
	type: string;
	website: string;
	country: string;
	city: string;
	size: Money;
}

export interface AccountDetails {
	role: string;
	linkedin: string;
	org: Organisation;
}

/** Sentence case, the Preferences pill (2.1). Works for funds, accelerators and corporates. */
export const ORG_TYPES = [
	'Venture capital', 'Angel investor', 'Corporate VC', 'Family office', 'Growth / PE',
	'Accelerator / studio', 'Corporate', 'Startup', 'Other',
];

/** The Scout record's fields this block reads and writes. */
export interface ScoutRecord {
	role_title?: string | null;
	linkedin_url?: string | null;
	fund_name?: string | null;
	investor_type?: string | null;
	investor_type_label?: string | null;
	fund_website?: string | null;
	hq_country?: string | null;
	hq_city?: string | null;
	aum?: string | null;
}

interface ProfileLike {
	job_title?: string | null;
	company_name?: string | null;
	dashboard_config?: Record<string, unknown> | null;
}

interface StoredAccount {
	linkedin?: string;
	org?: Partial<Omit<Organisation, 'name'>>;
}

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const stored = (p: ProfileLike | null | undefined): StoredAccount =>
	((p?.dashboard_config ?? {}) as { account?: StoredAccount }).account ?? {};

/** "20000000" / "20,000,000" / "$20m" → 20000000; null when there's no number. */
export function parseAmount(s: string | null | undefined): number | null {
	const m = /([\d.,]+)\s*([kmb]?)/i.exec(s ?? '');
	if (!m) return null;
	const n = Number(m[1]!.replace(/,/g, ''));
	if (!Number.isFinite(n) || n <= 0) return null;
	const mult = { k: 1e3, m: 1e6, b: 1e9 }[m[2]!.toLowerCase() as 'k' | 'm' | 'b'] ?? 1;
	return Math.round(n * mult);
}

/** The investor-type enum on the Scout record, against the labels offered. */
export function readDetails(
	p: ProfileLike | null | undefined,
	scout: ScoutRecord | null | undefined,
	typeLabelOf: (s: ScoutRecord) => string,
): AccountDetails {
	const a = stored(p);
	const o = a.org ?? {};
	const legacyAum = parseAmount(scout?.aum);
	return {
		role: str(p?.job_title) || str(scout?.role_title),
		linkedin: str(a.linkedin) || str(scout?.linkedin_url),
		org: {
			name: str(p?.company_name) || str(scout?.fund_name),
			type: str(o.type) || (scout ? typeLabelOf(scout) : ''),
			website: str(o.website) || str(scout?.fund_website),
			country: str(o.country) || str(scout?.hq_country),
			city: str(o.city) || str(scout?.hq_city),
			size: o.size && (o.size.amount ?? null) !== null
				? { amount: o.size.amount ?? null, currency: o.size.currency === 'EUR' ? 'EUR' : 'USD' }
				: { amount: legacyAum, currency: 'USD' },
		},
	};
}

const absolute = (s: string) => (!s ? '' : /^https?:\/\//i.test(s) ? s : `https://${s}`);

/** `PATCH /api/me`. Keeps every other key in `dashboard_config`. */
export function profilePatch(d: AccountDetails, current: Record<string, unknown> | null | undefined) {
	const cfg = { ...(current ?? {}) };
	const { type, website, country, city, size } = d.org;
	cfg.account = { linkedin: absolute(d.linkedin.trim()), org: { type, website: absolute(website.trim()), country, city, size } };
	return {
		job_title: d.role.trim() || null,
		company_name: d.org.name.trim() || null,
		dashboard_config: cfg,
	};
}

/** `PATCH /api/scout`, Scout only. `aum` stays US dollars, as the old wizard stored it. */
export function scoutPatch(d: AccountDetails, investorTypeEnum: Record<string, string>, usd: (m: Money) => number | null) {
	const aum = usd(d.org.size);
	return {
		role_title: d.role.trim() || null,
		linkedin_url: d.linkedin.trim() ? absolute(d.linkedin.trim()) : null,
		fund_name: d.org.name.trim() || null,
		investor_type: investorTypeEnum[d.org.type] ?? null,
		investor_type_label: investorTypeEnum[d.org.type] ? d.org.type : null,
		fund_website: d.org.website.trim() ? absolute(d.org.website.trim()) : null,
		hq_country: d.org.country || null,
		hq_city: d.org.city || null,
		aum: aum ? String(Math.round(aum)) : null,
	};
}

/** True when the account itself lacks a value that the old Scout record supplies. */
export function needsMove(p: ProfileLike | null | undefined, d: AccountDetails): boolean {
	if (!p) return false;
	const a = stored(p);
	const o = d.org;
	const orgDetail = !!(o.type || o.website || o.country || o.city || o.size.amount) || !!d.linkedin;
	return (!str(p.job_title) && !!d.role) || (!str(p.company_name) && !!o.name) || (!a.org && orgDetail);
}

export const sameDetails = (a: AccountDetails, b: AccountDetails) => JSON.stringify(a) === JSON.stringify(b);
