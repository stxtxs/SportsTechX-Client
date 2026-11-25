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

/**
 * Preferences on Scout: the five Preferences fields (Tags counts Include) plus
 * Stages · Cheque size · Lead or follow · Minimum traction from the Scouting
 * focus block, and Tags → Avoid. Replaces the "Scouting thesis" row of §7.
 */
export function scoutPreferencesPct(
	p: { goals?: unknown[]; sectors?: unknown[]; geos?: unknown[]; sports?: unknown[]; techs?: unknown[] },
	f: { stages?: string[]; chequeMin?: number | null; chequeMax?: number | null; invStyle?: string; traction?: string; exclude?: string[] },
): number {
	const cheque = amountSet(f.chequeMin) || amountSet(f.chequeMax) ? 'set' : '';
	return pct([p.goals, p.sectors, p.geos, p.sports, p.techs, f.stages, cheque, f.invStyle, f.traction, f.exclude]);
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
