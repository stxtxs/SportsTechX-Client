'use client';

import { useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { apiRequest } from '@/lib/query-client';
import { qk } from '@/lib/query-keys';
import { useSectorTiers, type SectorRef } from '@/hooks/use-sector-tiers';

/**
 * Explore interests: what Atlas prioritises on Home.
 *
 * Sectors, sub-sectors and sports are the **real taxonomy**, stored server-side
 * through `GET`/`PUT /api/explore/interests` as foreign keys into `sectors` and
 * `sports`. They used to be hardcoded display strings in localStorage, which
 * meant they could not match a company, could not survive a new browser, and
 * could not reach `/api/explore/home` — the endpoint whose whole job is to
 * personalise from them.
 *
 * Geographies and goals are the fixed UI sets below — regions, not the city
 * rows in `locations`, and the onboarding goals answer. Both now persist as
 * `text[]` on `user_preferences` through the same `GET`/`PUT /explore/interests`
 * (see migration `20261012160000_explore_geos_goals`), so they survive a new
 * browser and reach `/explore/home` like the taxonomy-backed groups.
 */
export interface Interests {
	/** Top-level sector ids. */
	sectors: string[];
	/** Sector ids below the top level. Same table — split for the UI only. */
	subs: string[];
	sports: string[];
	/** Technologies (tech tag ids). */
	techs: string[];
	geos: string[];
	goals: string[];
}

export const NO_INTERESTS: Interests = { sectors: [], subs: [], sports: [], techs: [], geos: [], goals: [] };

/** Fixed option sets — stored as text, so the chip value is its own label. */
export const FIXED_OPTIONS = {
	geos: { label: 'Countries or regions', options: ['Europe', 'United Kingdom', 'India', 'North America', 'Middle East', 'Global'] },
	// Worded on purpose: the API scans goal text to recommend a product
	// ("rais|fund…" → Raise, "source|deal flow…" → Scout), so the two
	// commercial goals must keep those words. See explore.controller.ts.
	goals: { label: 'Primary goals', options: [
		'Understand the market',
		'Track companies and competitors',
		'Stay on top of news and deals',
		'Raise funding for my startup',
		'Source deals and startups to invest in',
		'Discover events and programmes',
	] },
};

/** A free-text goal is stored as "Other: …" (the API caps a goal at 80 chars). */
export const OTHER_GOAL_PREFIX = 'Other: ';
export const OTHER_GOAL_MAX = 80 - OTHER_GOAL_PREFIX.length;

/** Goals saved under the previous list, mapped to their replacements. */
const LEGACY_GOALS: Record<string, string> = {
	'Explore a sector': 'Understand the market',
	'Read research': 'Understand the market',
	'Track companies': 'Track companies and competitors',
	'Follow developments': 'Stay on top of news and deals',
	'Discover events': 'Discover events and programmes',
};

/**
 * Saved goals as the current list understands them: old labels become their
 * replacements, and anything else unrecognised is kept as the "Other" text
 * rather than silently dropped.
 */
export function normaliseGoals(saved: string[]): string[] {
	const known = new Set(FIXED_OPTIONS.goals.options);
	const out: string[] = [];
	for (const g of saved) {
		const v = LEGACY_GOALS[g] ?? g;
		const next = known.has(v) || v.startsWith(OTHER_GOAL_PREFIX) ? v : `${OTHER_GOAL_PREFIX}${v}`.slice(0, 80);
		if (!out.includes(next) && !(next.startsWith(OTHER_GOAL_PREFIX) && out.some((x) => x.startsWith(OTHER_GOAL_PREFIX)))) out.push(next);
	}
	return out;
}

interface Ref { id: string; name: string | null }
interface StoredInterests { sectors: Ref[]; sports: Ref[]; tech_tags?: Ref[]; geos: string[]; goals: string[] }

type Group = { label: string; options: [value: string, label: string][]; backed: boolean };

/** Chip options per group: taxonomy-backed ones carry ids, local ones carry their own text.
 *  `subTop` maps each sub-sector id to its top pillar id, so the Sub-sectors group
 *  can cascade — showing only the children of the sectors the user picked. */
export function useInterestOptions(): Record<keyof Interests, Group> & { subTop: Map<string, string> } {
	const { data: sectorData } = useSWR<SectorRef[] | { data: SectorRef[] }>(qk.reference.sectors(), { dedupingInterval: 60 * 60_000 });
	const { data: sportData } = useSWR<Ref[] | { data: Ref[] }>(qk.reference.sports(), { dedupingInterval: 60 * 60_000 });
	const { data: techData } = useSWR<Ref[] | { data: Ref[] }>(qk.reference.techTags(), { dedupingInterval: 60 * 60_000 });
	const sectorList = useMemo<SectorRef[]>(() => (Array.isArray(sectorData) ? sectorData : (sectorData?.data ?? [])), [sectorData]);
	const sportList = useMemo<Ref[]>(() => (Array.isArray(sportData) ? sportData : (sportData?.data ?? [])), [sportData]);
	const techList = useMemo<Ref[]>(() => (Array.isArray(techData) ? techData : (techData?.data ?? [])), [techData]);
	const tiers = useSectorTiers(sectorList);

	return useMemo(() => {
		const pair = (r: { id: string; name: string | null }): [string, string] => [r.id, r.name ?? ''];
		const byLabel = (a: [string, string], b: [string, string]) => a[1].localeCompare(b[1]);
		const topIds = new Set(tiers.tops.map((s) => s.id));
		// Each sub-sector's top pillar, by walking parent_id — lets the UI show only
		// the sub-sectors under a chosen sector.
		const byId = new Map(sectorList.map((s) => [s.id, s]));
		const topAncestor = (s: SectorRef): string => {
			let cur = s, d = 0;
			while (cur.parent_id && d < 6) { const p = byId.get(cur.parent_id); if (!p) break; cur = p; d++; }
			return cur.id;
		};
		const subTop = new Map(sectorList.filter((s) => !topIds.has(s.id)).map((s) => [s.id, topAncestor(s)] as [string, string]));
		return {
			sectors: { label: 'Sectors', backed: true, options: tiers.tops.map(pair).sort(byLabel) },
			subs: { label: 'Sub-sectors', backed: true, options: sectorList.filter((s) => !topIds.has(s.id)).map(pair).sort(byLabel) },
			sports: { label: 'Sports', backed: true, options: sportList.map(pair).sort(byLabel) },
			techs: { label: 'Technologies', backed: true, options: techList.map(pair).sort(byLabel) },
			geos: { label: FIXED_OPTIONS.geos.label, backed: true, options: FIXED_OPTIONS.geos.options.map((o) => [o, o] as [string, string]) },
			goals: { label: FIXED_OPTIONS.goals.label, backed: true, options: FIXED_OPTIONS.goals.options.map((o) => [o, o] as [string, string]) },
			subTop,
		};
	}, [tiers, sectorList, sportList, techList]);
}

/**
 * The user's interests, and a save that persists the backed groups.
 *
 * `picked` is the display names of the market selections — what Home's
 * "Interests N" pill counts and what "Because you follow …" lists. Resolving
 * ids to names here keeps every caller from needing the taxonomy.
 */
export function useInterests(): {
	value: Interests;
	save: (next: Interests) => Promise<void>;
	picked: string[];
	isLoading: boolean;
} {
	const { data, isLoading, mutate } = useSWR<StoredInterests>(qk.explore.interests());
	const opts = useInterestOptions();

	const value = useMemo<Interests>(() => {
		const topIds = new Set(opts.sectors.options.map(([id]) => id));
		const stored = (data?.sectors ?? []).map((s) => s.id);
		return {
			sectors: stored.filter((id) => topIds.has(id)),
			subs: stored.filter((id) => !topIds.has(id)),
			sports: (data?.sports ?? []).map((s) => s.id),
			techs: (data?.tech_tags ?? []).map((t) => t.id),
			geos: data?.geos ?? [],
			goals: normaliseGoals(data?.goals ?? []),
		};
	}, [data, opts.sectors.options]);

	const save = useCallback(async (next: Interests) => {
		// Both sector tiers are one column server-side; geos/goals are text arrays.
		const res = await apiRequest('PUT', qk.explore.interests()[0], {
			sector_ids: [...next.sectors, ...next.subs],
			sport_ids: next.sports,
			tech_tag_ids: next.techs,
			geos: next.geos,
			// An "Other" ticked but left blank isn't a goal.
			goals: next.goals.filter((g) => !(g.startsWith(OTHER_GOAL_PREFIX) && !g.slice(OTHER_GOAL_PREFIX.length).trim())),
		});
		if (!res.ok) throw new Error(`save failed (${res.status})`);
		await mutate();
	}, [mutate]);

	const picked = useMemo(() => {
		const name = (group: keyof Interests, id: string) =>
			opts[group].options.find(([v]) => v === id)?.[1] ?? id;
		return [
			...value.sectors.map((id) => name('sectors', id)),
			...value.subs.map((id) => name('subs', id)),
			...value.sports.map((id) => name('sports', id)),
			...value.techs.map((id) => name('techs', id)),
			...value.geos,
		];
	}, [value, opts]);

	return { value, save, picked, isLoading };
}
