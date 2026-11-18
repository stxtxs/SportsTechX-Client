/**
 * Thesis prefill from the benchmark survey.
 *
 * The server owns the mapping (a config table, so product can change it
 * without a deploy) and writes the prefill once, only into an empty thesis.
 * This file holds the PROPOSED mapping — used by mock mode and written into
 * the backend page — plus the client rule for showing it.
 *
 * Open product decision: the Atlas stage and region values. The right-hand
 * sides below are today's thesis option names (`THESIS_OPTIONS.stages`,
 * `PICK_LISTS.regions` in components/scout/sample-data.ts), which save by
 * exact name; product should confirm them.
 */
import type { ThesisPrefill } from './types.ts';

/** Q3 stage focus → thesis stages. Stage agnostic leaves the field empty. */
export const SURVEY_STAGE_MAP: Record<string, string[]> = {
	'Seed Stage (Pre-Seed – Seed)': ['Pre Seed Round', 'Seed Round'],
	'Early Stage (Pre-Series A – Series A)': ['Series A'],
	'Late Stage (Series B+)': ['Series B', 'Late Stage Venture'],
	'Multi-stage / Stage Agnostic': [],
};

/** Q6 geography (multi-select) → thesis regions. Global leaves the field empty. */
export const SURVEY_REGION_MAP: Record<string, string[]> = {
	'North America': ['North America'],
	Europe: ['Europe'],
	'Asia-Pacific': ['APAC'],
	'Latin America': ['Latin America'],
	'Global / geography agnostic': [],
};

const uniq = (xs: string[]) => [...new Set(xs)];

/** Map raw survey answers. Unknown values are dropped, never guessed. */
export function mapSurvey(stageAnswers: string[], regionAnswers: string[]): { stages: string[]; regions: string[] } {
	// Agnostic or Global anywhere in the answer means "no constraint" — empty.
	const stageAgnostic = stageAnswers.some((s) => SURVEY_STAGE_MAP[s]?.length === 0);
	const global = regionAnswers.some((r) => SURVEY_REGION_MAP[r]?.length === 0);
	return {
		stages: stageAgnostic ? [] : uniq(stageAnswers.flatMap((s) => SURVEY_STAGE_MAP[s] ?? [])),
		regions: global ? [] : uniq(regionAnswers.flatMap((r) => SURVEY_REGION_MAP[r] ?? [])),
	};
}

type Fillable = { stages: string[]; regions: string[]; sectors: string[] };

/**
 * Fill only empty fields, never overwrite an edit. Returns the next thesis and
 * the survey values it now holds, so the form can mark those chips — whether
 * the server already wrote them or this call just did. A chip the user
 * removed is no longer in the thesis, so it is no longer marked.
 */
export function applyPrefill<T extends Fillable>(t: T, p: ThesisPrefill | null | undefined): { thesis: T; fromSurvey: Set<string> } {
	if (!p) return { thesis: t, fromSurvey: new Set() };
	const next = { ...t };
	const pairs: [keyof Fillable, string[]][] = [['stages', p.stages], ['regions', p.regions], ['sectors', p.sub_sectors]];
	const filled = new Set<keyof Fillable>();
	for (const [key, values] of pairs) {
		if (t[key].length === 0 && values.length > 0) { next[key] = [...values] as T[typeof key]; filled.add(key); }
	}
	// `applied_at` set: the server already wrote these into an empty thesis, so
	// any survey value still present came from the survey. Otherwise mark only
	// the fields filled just now — never a value the user picked themselves.
	const marks = (key: keyof Fillable) => !!p.applied_at || filled.has(key);
	const fromSurvey = new Set(pairs.flatMap(([key, values]) => (marks(key) ? values.filter((v) => next[key].includes(v)) : [])));
	return { thesis: next, fromSurvey };
}
