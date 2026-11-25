/**
 * The Scouting focus block on Preferences (D1, 1.1 and 1.4), and how it maps
 * onto the stored Scout thesis.
 *
 * The thesis is gone as a page and as a wizard, but the server still matches
 * companies against `scout_thesis` (`/api/scout/recommended`, Home, Deal Flow).
 * Until the backend reads Preferences directly (D1, 3.3), saving Preferences on
 * Scout writes the shared fields into the thesis too: regions and sectors and
 * sports come from Preferences, the six Scout-only fields from this block. So
 * Preferences is the one place they are asked, and matching keeps working.
 *
 * Pure, so `scout-focus.check.ts` runs it without React.
 */

import { geosToThesis, type GeoScope } from '../explore/geography.ts';

export type Cur = 'USD' | 'EUR';

/**
 * The Scout-only fields. Cheque bounds are euros, the thesis columns' unit.
 * `exclude` is Tags → Avoid on Preferences; what a Scout includes is Tags →
 * Include, stored with Preferences on every solution.
 */
export interface ScoutFocus {
	stages: string[];
	/** In `chequeCurrency`: the currency active when the user typed them. */
	chequeMin: number | null;
	chequeMax: number | null;
	chequeCurrency: Cur;
	invStyle: '' | 'Lead' | 'Follow' | 'Either';
	traction: string;
	exclude: string[];
}

export const NO_FOCUS: ScoutFocus = { stages: [], chequeMin: null, chequeMax: null, chequeCurrency: 'EUR', invStyle: '', traction: '', exclude: [] };


export const FOCUS_OPTIONS = {
	// Values must match the `funding_round_types` names exactly: the thesis
	// saves stages by name, and a name with no row is dropped.
	stages: ['Pre Seed Round', 'Seed Round', 'Series A', 'Series B', 'Late Stage Venture'],
	invStyle: ['Lead', 'Follow', 'Either'] as const,
};

/**
 * Minimum traction options in the active currency. Stored as the label
 * (`traction_floor`), symbol included, so a floor keeps the currency it was
 * chosen in ("$500k+ ARR" stays dollars) and is converted only for display.
 */
const SYM: Record<Cur, string> = { USD: '$', EUR: '€' };
export const tractionOptions = (c: Cur) => ['Pre-revenue OK', 'Early revenue', `${SYM[c]}500k+ ARR`, `${SYM[c]}2m+ ARR`];

/** "€500k+ ARR" → { amount: 500000, currency: 'EUR' }; null for the non-amount options. */
export function tractionFloor(t: string): { amount: number; currency: Cur } | null {
	const m = /^([€$])([\d.]+)([km])\+ ARR$/i.exec(t.trim());
	if (!m) return null;
	return { amount: Number(m[2]) * (m[3]!.toLowerCase() === 'm' ? 1e6 : 1e3), currency: m[1] === '$' ? 'USD' : 'EUR' };
}

/**
 * Include and Avoid pick from Tags, business models and (Avoid) Sectors, so
 * "Web3 & crypto" and "Web3" no longer both exist. Old picks from the retired
 * attribute list map to their Sector or Tag here; anything without one
 * (Hardware …) stays as it was and shows as picked until removed.
 */
export const LEGACY_ATTR: Record<string, string> = {
	'Web3 & crypto': 'Web3',
	'AI / machine learning': 'AI',
	'Computer vision': 'Computer Vision',
	'AR / VR': 'AR/VR',
	'Women’s sports': "Women's Sports",
	"Women's sports": "Women's Sports",
	'Betting & prediction': 'Fantasy Sports & Betting',
};
const mapAttr = (v: string) => LEGACY_ATTR[v] ?? v;

// ── Completion (handover v1 §7, replaced by D1 1.4) ─────────────────────────

const has = (v: unknown) => (Array.isArray(v) ? v.length > 0 : v != null && String(v).trim() !== '');

/** The four Scouting focus fields, each filled or not (Avoid counts under Tags). */
export function focusFilled(f: ScoutFocus): boolean[] {
	const cheque = (f.chequeMin ?? 0) > 0 || (f.chequeMax ?? 0) > 0;
	return [has(f.stages), cheque, has(f.invStyle), has(f.traction)];
}

// ── Thesis API ⇄ focus ──────────────────────────────────────────────────────

const BUSINESS_MODEL: Record<string, string> = { B2B: 'b2b', B2C: 'b2c', B2B2C: 'b2b2c', D2C: 'd2c', B2G: 'b2g' };
const MODEL_LABEL = Object.fromEntries(Object.entries(BUSINESS_MODEL).map(([k, v]) => [v, k]));

export interface ThesisRef { id: string; name: string | null }
export interface StoredThesis {
	sectors?: ThesisRef[];
	sports?: ThesisRef[];
	round_types?: ThesisRef[];
	geo?: GeoScope[];
	business_models?: string[];
	cheque_min?: number | null;
	cheque_max?: number | null;
	/** The currency the cheque was typed in (doc 4.14); older rows are euros. */
	cheque_currency?: Cur | null;
	traction_floor?: string | null;
	invest_style?: string | null;
	exclusions?: string | null;
	include_tags?: string[];
}

const names = (rows: ThesisRef[] | undefined) => (rows ?? []).map((r) => r.name).filter((n): n is string => !!n);

/** Stored thesis → the Scouting focus block. */
export function focusFromThesis(t: StoredThesis | null | undefined): ScoutFocus {
	if (!t) return NO_FOCUS;
	const style = (t.invest_style ?? '').trim();
	return {
		stages: names(t.round_types),
		// Stored as typed, with its currency (doc 4.14); converted only for display.
		chequeMin: t.cheque_min ?? null,
		chequeMax: t.cheque_max ?? null,
		chequeCurrency: t.cheque_currency === 'USD' ? 'USD' : 'EUR',
		invStyle: (style ? style[0]!.toUpperCase() + style.slice(1).toLowerCase() : '') as ScoutFocus['invStyle'],
		traction: t.traction_floor ?? '',
		exclude: [...new Set(t.exclusions ? t.exclusions.split(',').map((s) => mapAttr(s.trim())).filter(Boolean) : [])],
	};
}

/**
 * What the old thesis "looks for" held, as Preferences Include picks: business
 * models by label, everything else by tag name (mapped across where it can be).
 */
export function legacyIncludes(t: StoredThesis | null | undefined): { models: string[]; tagNames: string[] } {
	if (!t) return { models: [], tagNames: [] };
	const models = (t.business_models ?? []).map((v) => MODEL_LABEL[v]).filter((v): v is string => !!v);
	const tagNames = (t.include_tags ?? []).map(mapAttr);
	return { models: [...new Set(models)], tagNames: [...new Set(tagNames)] };
}

/**
 * `PUT /api/scout/thesis` from Preferences + the focus block. Taxonomy fields
 * are ids already (Preferences stores ids); stages go by name, as before.
 * Include comes from Preferences Tags: business models, and tag names as
 * `include_tags`.
 */
export function thesisDto(
	prefs: { sectors: string[]; subs: string[]; sports: string[]; geos: string[]; models: string[] },
	tagNames: string[],
	f: ScoutFocus,
	roundIdByName: Map<string, string>,
) {
	return {
		sector_ids: [...prefs.sectors, ...prefs.subs],
		sport_ids: prefs.sports,
		geo: geosToThesis(prefs.geos),
		round_type_ids: f.stages.map((s) => roundIdByName.get(s.toLowerCase())).filter((v): v is string => !!v),
		business_models: prefs.models.map((m) => BUSINESS_MODEL[m]).filter((v): v is string => !!v),
		include_tags: tagNames,
		// As typed, with its currency; the server converts where it compares (doc 4.14).
		cheque_min: f.chequeMin && f.chequeMin > 0 ? Math.round(f.chequeMin) : null,
		cheque_max: f.chequeMax && f.chequeMax > 0 ? Math.round(f.chequeMax) : null,
		cheque_currency: f.chequeCurrency,
		traction_floor: f.traction || null,
		invest_style: f.invStyle ? f.invStyle.toLowerCase() : null,
		exclusions: f.exclude.length ? f.exclude.join(', ') : null,
	};
}
