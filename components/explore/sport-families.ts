/**
 * Sports headings for Preferences (Rohn's Preferences doc 4.1 / 4.8).
 *
 * The headings live in the database since 25 Nov 2026: each family is a heading
 * row in `sports` (`is_bulk_sport`) and its sports point at it through
 * `parent_id`. `GET /api/sports?tree=1` returns them; the flat list leaves the
 * heading rows out. A fully ticked heading is saved as the heading itself, so a
 * sport added under it later is included; on load a saved heading expands back
 * into its sports. Pure, so `sport-families.check.ts` runs it without React.
 */

/** Rohn's family order on the Preferences line and in + Add (unknown headings go last, A–Z). */
export const FAMILY_ORDER = [
	'Team Sports', 'Racket Sports', 'Combat Sports', 'Fitness & Endurance', 'Wheels & Motor', 'Water Sports',
	'Winter Sports', 'Outdoor & Adventure', 'Precision & Target', 'Equestrian', 'Mind & Gaming',
];

/** Shown before "Show all sports": the ones most people come for. */
export const POPULAR_SPORTS = ['Football / Soccer', 'Basketball', 'American Football', 'Tennis', 'Golf', 'Cricket', 'Running', 'Cycling', 'Motorsports', 'Esports'];

/** Display fixes for names stored in the wrong case. */
const DISPLAY: Record<string, string> = { Bmx: 'BMX' };
export const sportLabel = (name: string) => DISPLAY[name] ?? name;

export interface SportFamily { id: string; name: string; sports: string[] }
export interface SportTreeRow { id: string; name: string; children?: { id: string; name: string }[] }

/** `GET /api/sports?tree=1` → the families (headings with sports under them), in Rohn's order. */
export function familiesFromTree(rows: SportTreeRow[]): SportFamily[] {
	const rank = (n: string) => { const i = FAMILY_ORDER.indexOf(n); return i < 0 ? FAMILY_ORDER.length : i; };
	return rows
		.filter((r) => (r.children?.length ?? 0) > 0)
		.map((r) => ({ id: r.id, name: r.name, sports: r.children!.map((c) => c.id) }))
		.sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name));
}

/** Saved ids → the ticked sports: a saved heading stands for every sport under it. */
export function expandSports(ids: string[], families: SportFamily[]): string[] {
	const byHeading = new Map(families.map((f) => [f.id, f.sports]));
	const out: string[] = [];
	for (const id of ids) for (const s of byHeading.get(id) ?? [id]) if (!out.includes(s)) out.push(s);
	return out;
}

/** Ticked sports → what is saved: a fully ticked heading is saved as the heading (4.8). */
export function collapseSports(ids: string[], families: SportFamily[]): string[] {
	const set = new Set(ids);
	const out: string[] = [];
	const used = new Set<string>();
	for (const f of families) {
		if (f.sports.length > 0 && f.sports.every((s) => set.has(s))) { out.push(f.id); f.sports.forEach((s) => used.add(s)); }
	}
	for (const id of ids) if (!used.has(id) && !out.includes(id)) out.push(id);
	return out;
}
