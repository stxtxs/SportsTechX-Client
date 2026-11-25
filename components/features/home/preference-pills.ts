'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { qk } from '@/lib/query-keys';
import type { SectorRef } from '@/hooks/use-sector-tiers';
import { MODEL_OPTIONS, useInterestOptions, useSportFamilies, type Interests } from '@/components/explore/interests';
import { collapse, groupTags, titleCase } from '@/components/explore/headings';
import { sportLabel } from '@/components/explore/sport-families';
import { stageLabel } from '@/components/scout/scouting-focus';

interface Country { name: string; continent: string | null }
interface TagRow { id: string; name: string; display_heading?: string | null }
const list = <T,>(d: T[] | { data: T[] } | undefined): T[] => (Array.isArray(d) ? d : (d?.data ?? []));

/**
 * Home's "Tuned to your preferences" pills (4.2): one pill per full heading.
 * A picked sector stands for its picked sub-sectors, a picked continent for
 * its picked countries, and a fully ticked Sports or Tags heading is one pill
 * ("Team Sports", "Health"). Order: stages, sectors, regions, sports, tags.
 */
export function usePreferencePills(p: Interests, stages: string[]): string[] {
	const opts = useInterestOptions();
	const sportFamilies = useSportFamilies();
	const { data: sectorData } = useSWR<SectorRef[] | { data: SectorRef[] }>(qk.reference.sectors(), { dedupingInterval: 60 * 60_000 });
	const { data: countryData } = useSWR<Country[] | { data: Country[] }>(qk.reference.countries(), { dedupingInterval: 60 * 60_000 });
	const { data: tagData } = useSWR<TagRow[] | { data: TagRow[] }>(qk.reference.techTags(), { dedupingInterval: 60 * 60_000 });

	return useMemo(() => {
		const sectors = list(sectorData);
		const byId = new Map(sectors.map((s) => [s.id, s]));
		const picked = new Set([...p.sectors, ...p.subs]);
		const underPicked = (s: SectorRef): boolean => {
			for (let cur = s.parent_id ? byId.get(s.parent_id) : undefined, d = 0; cur && d < 6; cur = cur.parent_id ? byId.get(cur.parent_id) : undefined, d++) {
				if (picked.has(cur.id)) return true;
			}
			return false;
		};
		const sectorPills = [...picked].map((id) => byId.get(id)).filter((s): s is SectorRef => !!s && !underPicked(s)).map((s) => s.name ?? '').filter(Boolean);

		const continentOf = new Map(list(countryData).map((c) => [c.name, c.continent ?? '']));
		const geoPills = p.geos.filter((g) => !p.geos.includes(continentOf.get(g) ?? '\0'));

		const sportName = new Map(opts.sports.options);
		const families = sportFamilies.map((f) => ({ label: f.name, values: f.sports }));
		const sportPills = collapse(p.sports, families).map((g) => (g.values.length > 1 ? g.label : sportLabel(sportName.get(g.label) ?? g.label)));

		const tags = list(tagData);
		const tagName = new Map(tags.map((t) => [t.id, t.name]));
		const headings = [
			{ label: 'Business model', values: MODEL_OPTIONS },
			...groupTags(tags).map((g) => ({ label: g.heading, values: g.tags.map((t) => t.id) })),
		];
		const tagPills = collapse([...p.models, ...p.techs], headings).map((g) => (g.values.length > 1 ? g.label : tagName.get(g.label) ?? g.label));

		return [...new Set([...stages.map(stageLabel), ...sectorPills, ...geoPills, ...sportPills, ...tagPills])];
	}, [p, stages, opts.sports.options, sportFamilies, sectorData, countryData, tagData]);
}
