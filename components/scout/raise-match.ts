/**
 * Matching a raise to the user's Preferences, in the browser (Deal Flow for
 * launch, 6.2 and 6.5), until the API does it on every field (6.3, 6.4).
 *
 * A raise carries a sector, a headquarters and a round, so those are what
 * count here: Sectors, Geography and Stages, each only when the user filled it
 * in, plus Tags → Include and Avoid on the raise's tags when the API sends them
 * (`tags`; the local test raises carry some). Sports, cheque and traction need
 * the API (6.3).
 *
 * Pure, so `raise-match.check.ts` runs it without React.
 */

export interface MatchPrefs {
	/** Picked sectors and everything under them, by name, lower case. */
	sectorNames: Set<string>;
	/** Global, continents and countries, as Preferences stores them. */
	geos: string[];
	/** Country name → continent, from /api/countries. */
	continentOf: Map<string, string>;
	/** Stages in the Preferences words ("Seed round"). */
	stages: string[];
	/** Avoided names (sectors, tags, business models), lower case. */
	avoid: Set<string>;
	/** Tags and business models in Tags → Include, lower case. */
	include: Set<string>;
}

export interface RaiseLike {
	sector: string | null; company_hq: string | null; round: string | null;
	/** The raise's tags (and business model), once the API sends them (6.3). */
	tags?: string[];
}

export interface Match {
	/** Avoided: never shown when matching. */
	hidden: boolean;
	/** Share of the user's filled-in preferences the raise meets; null when none apply. */
	pct: number | null;
	/** Up to three things that matched, for the pills. */
	why: string[];
}

const country = (hq: string | null) => (hq ? hq.split(',').pop()!.trim() : null);

export function matchRaise(r: RaiseLike, p: MatchPrefs): Match {
	const sector = r.sector?.trim() ?? null;
	const tags = (r.tags ?? []).map((t) => t.trim()).filter(Boolean);
	// Avoid hides a raise completely: its sector or any of its tags.
	if (sector && p.avoid.has(sector.toLowerCase())) return { hidden: true, pct: null, why: [] };
	if (tags.some((t) => p.avoid.has(t.toLowerCase()))) return { hidden: true, pct: null, why: [] };

	let considered = 0;
	let met = 0;
	const why: string[] = [];

	if (p.sectorNames.size) {
		considered++;
		if (sector && p.sectorNames.has(sector.toLowerCase())) { met++; why.push(sector); }
	}
	if (p.geos.length) {
		considered++;
		const c = country(r.company_hq);
		const continent = c ? p.continentOf.get(c) : undefined;
		const hit = p.geos.includes('Global') ? 'Global' : c && p.geos.includes(c) ? c : continent && p.geos.includes(continent) ? continent : null;
		if (hit) { met++; why.push(hit === 'Global' ? (c ?? 'Global') : hit); }
	}
	if (p.stages.length) {
		considered++;
		if (r.round && p.stages.includes(r.round)) { met++; why.push(r.round); }
	}
	// Tags → Include counts once the raise carries tags; a raise without any isn't marked down for it.
	if (p.include.size && tags.length) {
		considered++;
		const hit = tags.find((t) => p.include.has(t.toLowerCase()));
		if (hit) { met++; why.push(hit); }
	}

	return { hidden: false, pct: considered ? Math.round((met / considered) * 100) : null, why: why.slice(0, 3) };
}
