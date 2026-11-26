'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { qk } from '@/lib/query-keys';
import type { SectorRef } from '@/hooks/use-sector-tiers';
import { useInterests } from '@/components/explore/interests';
import { stageLabel } from './scouting-focus';
import { useScoutFocus } from './use-scout-focus';
import type { MatchPrefs } from './raise-match';

interface Country { name: string; continent: string | null }
const list = <T,>(d: T[] | { data: T[] } | undefined): T[] => (Array.isArray(d) ? d : (d?.data ?? []));

/** The user's Preferences in the shape `matchRaise` reads (Deal Flow 6.2). */
export function useRaiseMatchPrefs(): MatchPrefs {
	const { value: prefs } = useInterests();
	const { focus } = useScoutFocus(true);
	const { data: sectorData } = useSWR<SectorRef[] | { data: SectorRef[] }>(qk.reference.sectors(), { dedupingInterval: 60 * 60_000 });
	const { data: countryData } = useSWR<Country[] | { data: Country[] }>(qk.reference.countries(), { dedupingInterval: 60 * 60_000 });
	const { data: tagData } = useSWR<{ id: string; name: string }[] | { data: { id: string; name: string }[] }>(qk.reference.techTags(), { dedupingInterval: 60 * 60_000 });

	return useMemo(() => {
		const sectors = list(sectorData);
		// A picked sector covers everything under it.
		const picked = new Set([...prefs.sectors, ...prefs.subs]);
		const names = new Set<string>();
		const walk = (id: string, under: boolean) => {
			const node = sectors.find((s) => s.id === id);
			const on = under || picked.has(id);
			if (on && node?.name) names.add(node.name.toLowerCase());
			sectors.filter((s) => s.parent_id === id).forEach((k) => walk(k.id, on));
		};
		sectors.filter((s) => !s.parent_id).forEach((t) => walk(t.id, false));
		return {
			sectorNames: names,
			geos: prefs.geos,
			continentOf: new Map(list(countryData).map((c) => [c.name, c.continent ?? ''])),
			stages: focus.stages.map(stageLabel),
			avoid: new Set(focus.exclude.map((x) => x.toLowerCase())),
			include: new Set([
				...prefs.models.map((m) => m.toLowerCase()),
				...list(tagData).filter((t) => prefs.techs.includes(t.id)).map((t) => t.name.toLowerCase()),
			]),
		};
	}, [prefs, focus, sectorData, countryData, tagData]);
}
