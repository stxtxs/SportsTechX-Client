'use client';

import { useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { apiRequest } from '@/lib/query-client';
import { refreshScout } from '@/lib/invalidate';
import { qk } from '@/lib/query-keys';
import { useUserProfile } from '@/hooks/use-user-profile';
import type { Interests } from '@/components/explore/interests';
import { normaliseGeos } from '@/components/explore/geography';
import {
	focusFromThesis, legacyIncludes, thesisDto,
	type ScoutFocus, type StoredCheque, type StoredThesis, type ThesisRef,
} from './scout-focus';

interface ScoutRow { setup_completed_at: string | null }
type RefList = ThesisRef[] | { data: ThesisRef[] };
const list = (d: RefList | undefined) => (Array.isArray(d) ? d : (d?.data ?? []));

/** What the old thesis held that Preferences doesn't yet, for the one-time carry-over (D1, 3.3). */
export interface ThesisCarryOver {
	sectorIds: string[];
	sportIds: string[];
	geos: string[];
	/** The old "looks for", as Tags → Include picks. */
	models: string[];
	tagNames: string[];
}

/**
 * The Scouting focus block's data, and the one save that writes it.
 *
 * `/api/scout/thesis` answers 403 SCOUT_NOT_SET_UP until a `scout_profiles`
 * row exists, so the request waits for `GET /api/scout` to say one does (the
 * fetcher once treated that 403 as a dead session and looped to /login).
 */
export function useScoutFocus(enabled: boolean) {
	const scout = useSWR<ScoutRow | null>(enabled ? qk.scout.profile() : null);
	const hasWorkspace = enabled && !scout.isLoading && !!scout.data;
	const thesis = useSWR<StoredThesis>(hasWorkspace ? qk.scout.thesis() : null, { shouldRetryOnError: false });
	const rounds = useSWR<RefList>(enabled ? qk.reference.roundTypes() : null, { dedupingInterval: 60 * 60_000 });

	const roundIdByName = useMemo(
		() => new Map(list(rounds.data).filter((r) => r.name).map((r) => [r.name!.toLowerCase(), r.id])),
		[rounds.data],
	);
	const { data: profile, mutate: refetchProfile } = useUserProfile();
	const cfg = profile?.dashboard_config ?? null;
	const storedCheque = ((cfg as { scout?: { cheque?: StoredCheque } } | null)?.scout?.cheque) ?? null;
	const focus = useMemo(() => focusFromThesis(thesis.data, storedCheque), [thesis.data, storedCheque]);

	const carry = useMemo<ThesisCarryOver | null>(() => {
		const t = thesis.data;
		if (!t) return null;
		const geos = normaliseGeos((t.geo ?? []).map((g) => g.scope_value));
		return { sectorIds: (t.sectors ?? []).map((s) => s.id), sportIds: (t.sports ?? []).map((s) => s.id), geos, ...legacyIncludes(t) };
	}, [thesis.data]);

	/**
	 * Save the block with the Preferences it belongs to. The `PATCH /api/scout`
	 * creates the workspace on a first save and stamps setup done (a one-way
	 * stamp server-side): with no wizard, saving Preferences IS the setup (1.2).
	 */
	const save = useCallback(async (prefs: Interests, tagNames: string[], next: ScoutFocus) => {
		const p = await apiRequest('PATCH', '/api/scout', { setup_completed: true });
		if (!p.ok) throw new Error(`scout profile save failed (${p.status})`);
		const r = await apiRequest('PUT', '/api/scout/thesis', thesisDto(prefs, tagNames, next, roundIdByName));
		if (!r.ok) throw new Error(`scouting focus save failed (${r.status})`);
		// The cheque as typed, with its currency, on the account (the thesis holds a euro copy).
		const cheque: StoredCheque = { min: next.chequeMin, max: next.chequeMax, currency: next.chequeCurrency };
		if (JSON.stringify(cheque) !== JSON.stringify(storedCheque)) {
			const scoutCfg = ((cfg as { scout?: Record<string, unknown> } | null)?.scout) ?? {};
			const m = await apiRequest('PATCH', '/api/me', { dashboard_config: { ...(cfg ?? {}), scout: { ...scoutCfg, cheque } } });
			if (!m.ok) throw new Error(`cheque save failed (${m.status})`);
			void refetchProfile();
		}
		await Promise.all([scout.mutate(), thesis.mutate()]);
		// Home, Recommended, Deal Flow and Signals all read the thesis.
		void refreshScout();
	}, [roundIdByName, scout, thesis, cfg, storedCheque, refetchProfile]);

	// Old Avoid names that map across ("Web3 & crypto" → "Web3") are saved
	// under their new names once, by the page's one-time move (13).
	const renamed = !!thesis.data?.exclusions && thesis.data.exclusions !== (focus.exclude.join(', ') || null);

	return {
		focus,
		carry,
		renamed,
		save,
		isLoading: enabled && (scout.isLoading || thesis.isLoading),
		setUp: !!scout.data?.setup_completed_at,
	};
}
