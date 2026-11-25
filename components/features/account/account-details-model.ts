/**
 * Role, LinkedIn and the Organisation block on Account (D1, 1.5), on all three
 * solutions.
 *
 * Where each field lives (profile columns, `PATCH /api/me`):
 *   - Role → `job_title`; organisation name → `company_name`.
 *   - LinkedIn → `linkedin_url`; Organisation type, website, headquarters and
 *     size → `org_type`, `org_website`, `org_country`, `org_city`,
 *     `org_size_amount` + `org_size_currency`.
 *   - On Scout the same values are also written to the Scout record
 *     (`PATCH /api/scout`), which verification and Deal Flow read.
 * Reading falls back to `dashboard_config.account` (where this block lived
 * before the columns existed) and then to the Scout record, so what a Scout
 * entered in the old thesis wizard shows here before their first save (3.3).
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
	linkedin_url?: string | null;
	org_type?: string | null;
	org_website?: string | null;
	org_country?: string | null;
	org_city?: string | null;
	org_size_amount?: number | null;
	org_size_currency?: 'USD' | 'EUR' | null;
	/** Legacy home of LinkedIn + Organisation (`account`), read as a fallback only. */
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
	const columnSize = p?.org_size_amount != null && p.org_size_amount > 0;
	return {
		role: str(p?.job_title) || str(scout?.role_title),
		linkedin: str(p?.linkedin_url) || str(a.linkedin) || str(scout?.linkedin_url),
		org: {
			name: str(p?.company_name) || str(scout?.fund_name),
			type: str(p?.org_type) || str(o.type) || (scout ? typeLabelOf(scout) : ''),
			website: str(p?.org_website) || str(o.website) || str(scout?.fund_website),
			country: str(p?.org_country) || str(o.country) || str(scout?.hq_country),
			city: str(p?.org_city) || str(o.city) || str(scout?.hq_city),
			size: columnSize
				? { amount: p!.org_size_amount!, currency: p!.org_size_currency === 'EUR' ? 'EUR' : 'USD' }
				: o.size && (o.size.amount ?? null) !== null
					? { amount: o.size.amount ?? null, currency: o.size.currency === 'EUR' ? 'EUR' : 'USD' }
					: { amount: legacyAum, currency: 'USD' },
		},
	};
}

const absolute = (s: string) => (!s ? '' : /^https?:\/\//i.test(s) ? s : `https://${s}`);

/** `PATCH /api/me`: the profile columns. `dashboard_config` is left alone. Blank → null. */
export function profilePatch(d: AccountDetails) {
	const { type, website, country, city, size } = d.org;
	const amount = size.amount && size.amount > 0 ? size.amount : null;
	return {
		job_title: d.role.trim() || null,
		company_name: d.org.name.trim() || null,
		linkedin_url: absolute(d.linkedin.trim()) || null,
		org_type: type.trim() || null,
		org_website: absolute(website.trim()) || null,
		org_country: country.trim() || null,
		org_city: city.trim() || null,
		org_size_amount: amount,
		org_size_currency: amount ? size.currency : null,
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
	const o = d.org;
	const orgDetail = !!(o.type || o.website || o.country || o.city || o.size.amount) || !!d.linkedin;
	const hasColumns = !!(str(p.linkedin_url) || str(p.org_type) || str(p.org_website) || str(p.org_country) || str(p.org_city) || p.org_size_amount);
	return (!str(p.job_title) && !!d.role) || (!str(p.company_name) && !!o.name) || (!hasColumns && orgDetail);
}

export const sameDetails = (a: AccountDetails, b: AccountDetails) => JSON.stringify(a) === JSON.stringify(b);
