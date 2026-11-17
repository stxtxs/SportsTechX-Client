'use client';

import { useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { getUserType, useUserProfile } from '@/hooks/use-user-profile';
import { apiRequest } from '@/lib/query-client';
import { qk } from '@/lib/query-keys';
import { Events, track } from '@/lib/analytics';
import { EDITION, FLAGS, RELEASE_DATE, SLUG, SOURCE } from './config';
import { mockAccess, mockPersonal, mockPrefill, mockScenario } from './mock';
import { defaultPins, fallbackAccess, visiblePins, withChoices } from './rules';
import { useLocalValue } from './local-store';
import type { BenchmarkAccess, HomePin, PersonalBenchmark, SummaryContent, ThesisPrefill, WalkthroughState, WalkthroughStatus } from './types';

/**
 * Data hooks for the benchmark surfaces. Each one answers from one of three
 * sources (see `SOURCE` in config.ts): the mock, the real API, or — with
 * neither — a plan-only fallback that calls nothing new.
 *
 * Nothing here is a security boundary. The server must refuse R2/R3 content
 * to callers without access; these hooks only decide what the UI shows.
 */

/** SWR with a mock answer instead of a request when mocking. */
function useSource<T>(key: readonly unknown[] | null, mock: () => T) {
	const live = SOURCE === 'api' ? key : null;
	const mocked = SOURCE === 'mock' && key ? ['mock', ...key] : null;
	const api = useSWR<T>(live, { shouldRetryOnError: false });
	const fake = useSWR<T>(mocked, () => mock(), { revalidateOnFocus: false });
	return SOURCE === 'mock' ? fake : api;
}

const OPEN_ALL: BenchmarkAccess = { edition: EDITION, entries: { r1: 'none', r2: 'open', r3: 'none' }, contributor: null, trial: null };

export function useBenchmarkAccess(): { access: BenchmarkAccess; isLoading: boolean } {
	const { data: profile, isLoading: profileLoading } = useUserProfile();
	const res = useSource(FLAGS.benchmark && profile ? qk.benchmark.access(EDITION) : null, () => mockAccess(mockScenario(getUserType(profile))));
	const fallback = useMemo(
		() => fallbackAccess(getUserType(profile), profile?.user_role === 'admin'),
		[profile],
	);
	// Flag off: today's behaviour — R2 open to every signed-in user, no R1/R3.
	if (!FLAGS.benchmark) return { access: OPEN_ALL, isLoading: false };
	if (SOURCE === 'none') return { access: fallback, isLoading: profileLoading };
	return { access: res.data ?? fallback, isLoading: profileLoading || (res.isLoading && !res.data) };
}

/** R1 content. The 2-page summary is a separate writing task: null = placeholder. */
export function useBenchmarkSummary(): { summary: SummaryContent | null; isLoading: boolean } {
	const res = useSWR<{ content?: SummaryContent | null }>(SOURCE === 'api' ? qk.reports.detail(SLUG.r1) : null, { shouldRetryOnError: false });
	const c = res.data?.content;
	return { summary: c && Array.isArray(c.headlines) ? c : null, isLoading: res.isLoading };
}

/** R3 content — the caller's own snapshot. Only requested once access says open. */
export function usePersonalBenchmark(enabled: boolean) {
	const res = useSource<PersonalBenchmark | null>(enabled ? qk.benchmark.mine(EDITION) : null, () => mockPersonal(mockScenario()));
	return { data: res.data ?? null, isLoading: res.isLoading, error: res.error as (Error & { status?: number }) | undefined };
}

/** Scout (or admin) only: the thesis and its prefill endpoint are Scout's. */
export function useThesisPrefill(): { prefill: ThesisPrefill | null; isLoading: boolean } {
	const { data: profile } = useUserProfile();
	const scout = getUserType(profile) === 'scout' || profile?.user_role === 'admin';
	const { data, isLoading } = useSource<ThesisPrefill | null>(FLAGS.benchmark && scout ? qk.benchmark.thesisPrefill() : null, () => mockPrefill(mockScenario()));
	return { prefill: data ?? null, isLoading };
}

// ── Home pins ────────────────────────────────────────────────────────────

const NO_CHOICES: Record<string, boolean> = {};

export interface PinsState {
	/** What the Home row shows: pinned, still featured, at most three. */
	visible: HomePin[];
	/** Every pin, pinned or not — the library uses it for "Pin to home". */
	all: HomePin[];
	isLoading: boolean;
	setPinned: (key: string, pinned: boolean) => Promise<void>;
}

export function useHomePins(): PinsState {
	const { data: profile } = useUserProfile();
	const { access, isLoading } = useBenchmarkAccess();
	const api = useSWR<HomePin[]>(FLAGS.benchmark && SOURCE === 'api' ? qk.benchmark.homePins() : null, { shouldRetryOnError: false });
	const [choices, setChoices] = useLocalValue(
		FLAGS.benchmark && profile ? `stx-home-pins:${EDITION}:${profile.id}` : null,
		NO_CHOICES,
	);

	const all = useMemo(() => {
		if (!FLAGS.benchmark) return [];
		if (SOURCE === 'api') return api.data ?? [];
		return withChoices(defaultPins(access, RELEASE_DATE), choices);
	}, [access, choices, api.data]);
	// "Your benchmark" is for contributors only (handover v1 §4 Access), whatever
	// the pin source returns.
	const visible = useMemo(() => visiblePins(all, new Date().toISOString()).filter((p) => p.entry !== 'r3' || access.entries.r3 === 'open'), [all, access]);

	const { mutate } = api;
	const setPinned = useCallback(async (key: string, pinned: boolean) => {
		track(pinned ? Events.pinAdded : Events.pinRemoved, { key });
		if (SOURCE !== 'api') { setChoices({ ...choices, [key]: pinned }); return; }
		const res = await apiRequest('PUT', `/api/home/pins/${encodeURIComponent(key)}`, { pinned });
		if (!res.ok) { toast.error('Could not update Home. Try again.'); return; }
		await mutate();
	}, [choices, setChoices, mutate]);

	return { visible, all, isLoading: isLoading || api.isLoading, setPinned };
}

// ── Walkthrough + banner ─────────────────────────────────────────────────

const NO_TOUR: Partial<WalkthroughState> = {};
const DAY = 864e5;
/** Read once per page load: "first login" is judged against when this session began. */
const SESSION_START = Date.now();

export interface TourState {
	ready: boolean;
	state: WalkthroughState;
	record: (status: Exclude<WalkthroughStatus, 'not_started'>) => void;
	dismissBanner: (id: string) => void;
}

export function useWalkthroughState(): TourState {
	const { data: profile } = useUserProfile();
	const enabled = FLAGS.walkthrough && !!profile;
	const api = useSWR<WalkthroughState>(enabled && SOURCE === 'api' ? qk.benchmark.tour() : null, { shouldRetryOnError: false });
	const [local, setLocal] = useLocalValue(enabled ? `stx-tour:${profile!.id}` : null, NO_TOUR);

	const state = useMemo<WalkthroughState>(() => {
		if (SOURCE === 'api' && api.data) return api.data;
		const status = local.status ?? 'not_started';
		// Without the API, "first login" = never run here and an account under a
		// day old (mock: never run here, so QA can see it on any account).
		const young = !!profile && SESSION_START - Date.parse(profile.created_at) < DAY;
		return {
			status,
			first_login: status === 'not_started' && (SOURCE === 'mock' || young),
			return_url: null,
			dismissed_banners: local.dismissed_banners ?? [],
			updated_at: local.updated_at ?? null,
		};
	}, [api.data, local, profile]);

	const { mutate } = api;
	const record = useCallback((status: Exclude<WalkthroughStatus, 'not_started'>) => {
		track(status === 'started' ? Events.walkthroughStarted : status === 'completed' ? Events.walkthroughCompleted : Events.walkthroughSkipped);
		const updated_at = new Date().toISOString();
		// Always remembered in this browser too, so a failed save can't make the
		// tour reopen on every load; the server copy wins once it answers.
		setLocal({ ...local, status, updated_at });
		if (SOURCE === 'api') {
			void apiRequest('POST', '/api/me/onboarding-tour', { status })
				.then((r) => { if (r.ok) void mutate(); })
				.catch(() => { /* kept locally */ });
		}
	}, [local, setLocal, mutate]);

	const dismissBanner = useCallback((id: string) => {
		setLocal({ ...local, dismissed_banners: [...new Set([...(local.dismissed_banners ?? []), id])] });
		if (SOURCE === 'api') {
			void apiRequest('POST', `/api/me/banners/${encodeURIComponent(id)}/dismiss`)
				.then((r) => { if (r.ok) void mutate(); })
				.catch(() => { /* kept locally */ });
		}
	}, [local, setLocal, mutate]);

	return { ready: enabled && (SOURCE !== 'api' || !!api.data), state, record, dismissBanner };
}
