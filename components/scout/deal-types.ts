import { fmtAmount, fmtMonth } from '../../lib/format.ts';

/**
 * The shape the Deal Flow API actually returns, plus the three pieces of logic
 * that must agree with the server exactly.
 *
 * Typed from the SQL projection (`SCOUT_COLS` in `scout-dealflow.repository.ts`),
 * **not** from the server's own `DealListRow` interface — that interface is
 * missing five columns the query really selects (`ticket_min`, `ticket_max`,
 * `valuation`, `lead_investor`, `member_commitment`), and rows are not mapped
 * through it at runtime.
 *
 * Two things to keep in mind when reading a row:
 *
 * 1. **Money and dates arrive as strings.** Every numeric is `::text` cast so a
 *    big number cannot lose precision through a float. Parse before formatting.
 * 2. **Redaction is signalled, not inferred.** The row always carries
 *    `company_anonymous`, `submitter_anonymous` and `disclosed`, so the UI shows
 *    "undisclosed" from the flag rather than guessing from a null. Guessing
 *    would also be wrong: `company_hq` and `company_description` are returned
 *    for an anonymous deal on purpose, while `company_name` is withheld.
 */
export type DealTab = 'all' | 'featured' | 'verified' | 'circle';

export interface DealRow {
	id: string;
	source: 'circle' | 'verified_raise';
	status: string;
	is_featured: boolean;
	/** Admin order on the Featured tab (1 first) and when the raise was featured (4.2). */
	featured_order?: number | null;
	featured_at?: string | null;
	/** Test raise (2.2): only admins ever receive one. */
	is_test?: boolean;
	/** The linked company's business model (also in `tags`, as "B2B"). */
	business_model?: string | null;

	/** null when `company_anonymous` and this viewer has not been disclosed to. */
	company_name: string | null;
	company_website: string | null;
	company_id: string | null;
	company_anonymous: boolean;
	/** Returned even when anonymous — a region is not identifying. */
	company_hq: string | null;
	company_description: string | null;
	sector: string | null;

	round_type: string | null;
	instrument: string | null;
	currency_code: string | null;
	target_amount: string | null;
	committed_amount: string | null;
	ticket_min: string | null;
	ticket_max: string | null;
	valuation: string | null;
	/** Structured valuation (in `currency_code`) for comparing/filtering. */
	valuation_amount: string | null;
	valuation_basis: string | null;
	valuation_undisclosed: boolean | null;
	target_close_date: string | null;
	lead_status: string | null;
	/** Withheld with the company name — a lead investor identifies the round. */
	lead_investor: string | null;

	/** null when `submitter_anonymous` and not disclosed. */
	submitter_name: string | null;
	submitter_anonymous: boolean;
	/** Shown even for an anonymous submitter: it is their view, not their name. */
	member_perspective: string | null;
	member_relationship: string | null;
	member_commitment: string | null;

	/** Presence only. The storage path is never sent to a client. */
	has_deck: boolean;
	has_one_pager: boolean;
	materials_access: 'immediate' | 'on_request' | null;

	/** Per-viewer: has STX released this deal's identity to *me*. */
	disclosed: boolean;
	/** Per-viewer: my own interest request's status, or null if I never asked. */
	interest_status: string | null;
	/** This viewer has the deal on watch (server-side since Oct 2026). */
	is_watched?: boolean;
	/** The linked company's tag names plus its business model, for matching (Deal Flow 6.3). */
	tags?: string[];
}

/** Card and page label: where the raise is from; a featured raise adds the month it was featured (4.2). */
export function raiseLabel(d: Pick<DealRow, 'source' | 'is_featured' | 'featured_at' | 'is_test'>): string {
	const base = d.source === 'circle' ? 'From Boardroom' : d.is_featured ? 'Featured raise' : 'Verified raise';
	const month = d.source !== 'circle' && d.is_featured && d.featured_at ? ` · ${fmtMonth(d.featured_at, '')}` : '';
	return `${d.is_test ? 'Test · ' : ''}${base}${month}`;
}

export const LEAD_LABEL: Record<string, string> = {
	confirmed: 'Lead confirmed', seeking: 'Seeking lead', not_required: 'No lead required',
};
const INSTRUMENT_LABEL: Record<string, string> = {
	priced_equity: 'Priced equity', safe: 'SAFE', convertible_note: 'Convertible note',
	asa: 'ASA', other: 'Other',
};
const RELATIONSHIP_LABEL: Record<string, string> = {
	investing_this_round: 'Investing in this round', existing_investor: 'Existing investor',
	advisor_or_board: 'Advisor / board', referral: 'Referral',
};
/**
 * The introduction status a scout sees (Deal Flow for launch, 2.3): Requested →
 * With the founder → Introduced, or Not right now. Mapped from the API's
 * statuses until the approval flow has its own (received is waiting for
 * SportsTechX; confirming and shared are with the founder).
 */
export const INTEREST_LABEL: Record<string, string> = {
	received: 'Requested', source_confirmed: 'With the founder',
	shared: 'With the founder', connected: 'Introduced', declined: 'Not right now',
	no_response: 'No response',
};

/**
 * Round names, one set everywhere: the Preferences ones (Deal Flow 9.2). A
 * Verified Raise carries the founder's round code (raise_profiles.round_type);
 * a Circle deal carries a `funding_round_types` name ("Seed Round"), shown in
 * the same words.
 */
const ROUND_LABEL: Record<string, string> = {
	pre_seed: 'Pre-seed round', seed: 'Seed round', series_a: 'Series A', series_b_plus: 'Series B',
	late_stage: 'Late-stage venture', bridge: 'Bridge', other: 'Other',
	'Pre Seed Round': 'Pre-seed round', 'Seed Round': 'Seed round', 'Series A Round': 'Series A',
	'Series B Round': 'Series B', 'Late Stage Venture': 'Late-stage venture',
};
export const roundLabel = (v: string | null) => (v ? ROUND_LABEL[v] ?? v : null);
export const leadLabel = (v: string | null) => (v ? LEAD_LABEL[v] ?? v : null);
export const instrumentLabel = (v: string | null) => (v ? INSTRUMENT_LABEL[v] ?? v : null);
export const relationshipLabel = (v: string | null) => (v ? RELATIONSHIP_LABEL[v] ?? v : null);

/**
 * Money, from the numeric the API sends.
 *
 * Accepts `number` as well as `string`: the Scout list casts every amount to
 * `::text`, while `/scout/dealflow/mine` selects the raw column, so the same
 * figure can arrive either way depending on which endpoint you read.
 */
export function money(amount: string | number | null, ccy: string | null): string | null {
	if (amount === null || amount === undefined || amount === '') return null;
	const n = Number(amount);
	if (!Number.isFinite(n) || n <= 0) return null;
	return fmtAmount(n, ccy || 'EUR');
}

const VALUATION_BASIS: Record<string, string> = { pre_money: 'pre-money', post_money: 'post-money', cap: 'cap' };

/**
 * Valuation from the structured fields (amount + basis), in the standard money
 * format and the user's currency: "€10M pre-money" / "$11.6M pre-money". The
 * old free-text `valuation` is only a fallback for rows without an amount.
 */
export function valuationLabel(d: Pick<DealRow, 'valuation' | 'valuation_amount' | 'valuation_basis' | 'valuation_undisclosed' | 'currency_code'>): string {
	if (d.valuation_undisclosed) return 'Not disclosed';
	const amount = money(d.valuation_amount, d.currency_code);
	if (amount) {
		const basis = d.valuation_basis ? VALUATION_BASIS[d.valuation_basis] : undefined;
		return basis ? `${amount} ${basis}` : amount;
	}
	return d.valuation?.trim() || 'Not disclosed';
}

/** `2026-12-01` → `Dec 2026`, matching the designed card copy. */
export function closeLabel(date: string | null): string | null {
	if (!date) return null;
	const d = new Date(`${date}T00:00:00`);
	return Number.isNaN(d.getTime()) ? date : d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

/**
 * How far through the round, for the progress bar. Null when unknowable.
 *
 * The null guards are load-bearing: `Number(null)` is **0**, not NaN, so
 * without them a deal with no committed figure rendered a 0% bar — reading as
 * "nothing raised yet" rather than "not disclosed".
 */
export function committedPct(d: DealRow): number | null {
	if (!d.target_amount || !d.committed_amount) return null;
	const t = Number(d.target_amount), c = Number(d.committed_amount);
	if (!Number.isFinite(t) || !Number.isFinite(c) || t <= 0) return null;
	return Math.max(0, Math.min(100, Math.round((c / t) * 100)));
}

/** What to call the company. Never leaks that a name exists but is withheld. */
export const companyLabel = (d: DealRow) =>
	d.company_name ?? (d.company_anonymous ? 'Undisclosed company' : 'Company');

export const submitterLabel = (d: DealRow) =>
	d.submitter_name ?? 'a Boardroom member';

/**
 * Will the document endpoints actually hand this viewer a URL?
 *
 * Mirrors the server's gate exactly (`documentPath` in
 * `scout-dealflow.repository.ts`). The non-obvious half is the anonymity
 * override: **an anonymous company's materials always require disclosure, even
 * when the member chose `immediate`**, because a deck has the company's name on
 * every slide. So `materials_access === 'immediate'` alone does NOT predict a
 * working URL.
 *
 * Getting this wrong in the UI means offering a button that 404s — and the
 * server answers one uniform 404 for "no deck" and "not for you" alike, so the
 * button would be indistinguishable from a bug.
 */
export const canOpenDocs = (d: DealRow): boolean =>
	d.disclosed || (d.materials_access === 'immediate' && !d.company_anonymous);

/**
 * A submitter's own deal, from `GET /scout/dealflow/mine`.
 *
 * A different shape from `DealRow` and not interchangeable with it: `/mine` is
 * `SELECT *` on the raw table, so there is no `sector` name, no `has_deck`, no
 * per-viewer `disclosed`, and **no redaction at all** — it is the caller's own
 * data. It also returns every status, which is the point: this is where a
 * submitter sees a draft or finds out changes were requested.
 */
export interface MyDealRow {
	id: string;
	source: string;
	status: string;
	company_name: string | null;
	round_type: string | null;
	currency_code: string | null;
	target_amount: string | number | null;
	/** Why it came back. The only place a submitter can read it. */
	review_notes: string | null;
	submitted_at: string | null;
	created_at: string;
	company_anonymous: boolean;
	founder_consent: boolean;
	// The three fields `PATCH :id/live` lets the owner move after it is listed.
	committed_amount: string | number | null;
	lead_status: string | null;
	target_close_date: string | null;
	/** How many investors have requested an introduction to this (live) deal. */
	interest_count: number;
}

/** What a submitter should understand their own deal's status to mean. */
export const MY_STATUS: Record<string, string> = {
	draft: 'Draft — not submitted',
	pending: 'Submitted, awaiting review',
	reviewing: 'Being reviewed',
	changes_requested: 'Changes requested',
	live: 'Live in From Boardroom',
	closed: 'Closed',
};
