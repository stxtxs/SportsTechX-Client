/**
 * Geography on Preferences (Preferences second pass, 3).
 *
 * A pick is "Global", one of the six continents, or a country by its name in
 * `/api/countries`. Stored as text (`user_preferences.preferred_geographies`),
 * so the value is its own label. Choosing Global clears every other pick, and
 * choosing a place clears Global.
 *
 * Pure, so `geography.check.ts` runs it without React.
 */

export const GLOBAL = 'Global';

/** The six continents, as `/api/countries` names them. */
export const CONTINENTS = ['Africa', 'Asia', 'Europe', 'North America', 'Oceania', 'South America'] as const;
const CONTINENT_SET = new Set<string>(CONTINENTS);
export const isContinent = (v: string) => CONTINENT_SET.has(v);

/**
 * Continents by number of companies, most first, as measured on 25 Nov 2026
 * (North America 3,952 · Europe 3,349 · Asia 1,184 · Oceania 375). The line
 * uses live counts when they load; this order is what it shows meanwhile, so
 * the line doesn't reshuffle.
 */
export const CONTINENTS_BY_COMPANIES = ['North America', 'Europe', 'Asia', 'Oceania', 'South America', 'Africa'];

/** Pick or unpick one value, keeping Global exclusive. */
export function toggleGeo(list: string[], v: string): string[] {
	if (v === GLOBAL) return list.includes(GLOBAL) ? [] : [GLOBAL];
	const rest = list.filter((x) => x !== GLOBAL);
	return rest.includes(v) ? rest.filter((x) => x !== v) : [...rest, v];
}

const MIDDLE_EAST = ['United Arab Emirates', 'Saudi Arabia', 'Qatar', 'Bahrain', 'Kuwait', 'Oman', 'Israel', 'Jordan'];

/**
 * Old picks that are not a continent or a country, and what they become.
 * Covers the old Preferences options (Middle East) and the old thesis regions
 * (DACH, Nordics, APAC …). United Kingdom and India were top-level options and
 * are countries already, so they carry over as they are.
 */
const REGION_TO_PLACES: Record<string, string[]> = {
	'Middle East': MIDDLE_EAST,
	MENA: [...MIDDLE_EAST, 'Egypt', 'Morocco', 'Tunisia', 'Algeria'],
	DACH: ['Germany', 'Austria', 'Switzerland'],
	Nordics: ['Sweden', 'Denmark', 'Norway', 'Finland', 'Iceland'],
	'UK & Ireland': ['United Kingdom', 'Ireland'],
	'France & Benelux': ['France', 'Belgium', 'Netherlands', 'Luxembourg'],
	'Southern Europe': ['Spain', 'Portugal', 'Italy', 'Greece'],
	CEE: ['Poland', 'Czech Republic', 'Hungary', 'Romania', 'Slovakia', 'Bulgaria'],
	Baltics: ['Estonia', 'Latvia', 'Lithuania'],
	'USA & Canada': ['United States', 'Canada'],
	APAC: ['Asia', 'Oceania'],
	'Southeast Asia': ['Singapore', 'Indonesia', 'Malaysia', 'Thailand', 'Vietnam', 'Philippines'],
	'Latin America': ['South America', 'Mexico'],
	'Sub-Saharan Africa': ['Africa'],
};

/** Old picks mapped across, de-duplicated, Global kept exclusive. */
export function normaliseGeos(list: string[]): string[] {
	const out: string[] = [];
	for (const v of list) for (const p of REGION_TO_PLACES[v] ?? [v]) if (!out.includes(p)) out.push(p);
	return out.includes(GLOBAL) && out.length > 1 ? out.filter((x) => x !== GLOBAL) : out;
}

export const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/** The thesis stores geography as scope pairs; Preferences picks map onto them. */
export interface GeoScope { scope_type: string; scope_value: string }
export const geosToThesis = (geos: string[]): GeoScope[] =>
	geos.map((g) => ({ scope_type: g === GLOBAL || isContinent(g) ? 'continent' : 'country', scope_value: g }));
