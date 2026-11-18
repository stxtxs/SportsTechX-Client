/**
 * Profile completion (dev handover v1 §7). Every field counts equally; at
 * SETUP_DONE_PCT the setup stops showing as a task on Home, and each settings
 * page shows the percentage.
 *
 * Pure, so `profile-completion.check.ts` runs it without React.
 */

export const SETUP_DONE_PCT = 80;

const filled = (v: unknown): boolean =>
	Array.isArray(v) ? v.length > 0 : v != null && String(v).trim() !== '';

/** A cheque bound of 0 means "not set", not "zero". Reads "€250k" as well as 250000. */
const amountSet = (v: unknown): boolean => filled(v) && Number(String(v).replace(/[^\d.]/g, '')) > 0;

const pct = (fields: unknown[]): number =>
	fields.length === 0 ? 0 : Math.round((fields.filter(filled).length / fields.length) * 100);

/** Preferences: Goal · Sectors · Regions · Sports · Technologies. */
export function preferencesPct(p: { goals?: unknown[]; sectors?: unknown[]; geos?: unknown[]; sports?: unknown[]; techs?: unknown[] }): number {
	return pct([p.goals, p.sectors, p.geos, p.sports, p.techs]);
}

/** Scouting thesis: Organisation · Type · Stages · Cheque size · Lead or follow · Minimum traction · Looks for · Avoids. */
export function thesisPct(t: { fundName?: string; investorType?: string; stages?: string[]; chequeMin?: string; chequeMax?: string; invStyle?: string; traction?: string; include?: string[]; exclude?: string[] }): number {
	const cheque = amountSet(t.chequeMin) || amountSet(t.chequeMax) ? 'set' : '';
	return pct([t.fundName, t.investorType, t.stages, cheque, t.invStyle, t.traction, t.include, t.exclude]);
}

/**
 * Raise settings: Company name · Website · Headquarters · Stage · Description ·
 * Round type · Target raise · Target close date · Investor types · Cheque size.
 */
export function raisePct(r: Record<string, unknown> | null | undefined, c: Record<string, unknown> | null | undefined): number {
	const raise = r ?? {};
	const crit = c ?? {};
	const hq = filled(raise.hq_city) || filled(raise.hq_country) ? 'set' : '';
	const cheque = amountSet(crit.cheque_min) || amountSet(crit.cheque_max) ? 'set' : '';
	return pct([raise.company_name, raise.company_website, hq, raise.company_stage, raise.company_description,
		raise.round_type, raise.target_amount, raise.target_close_date, crit.investor_types, cheque]);
}

export const setupDone = (p: number) => p >= SETUP_DONE_PCT;
