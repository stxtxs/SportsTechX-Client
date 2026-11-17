/**
 * Pure rules for the benchmark surfaces: access fallback, Home pins, peer
 * groups. No React, so `rules.check.ts` runs them under plain node.
 *
 * The server is the authority on access. These rules only decide what the
 * client *shows*; nothing here protects content (see the backend page).
 */
import { EDITION, FEATURED_WEEKS, FTR_SLUG, MAX_PINS, PEER_GROUP_MIN, SLUG, type BenchmarkEntry } from './config.ts';
import type { BenchmarkAccess, Compare, EntryAccess, HomePin, PersonalBenchmark } from './types.ts';

type Tier = 'explore' | 'raise' | 'scout';

/**
 * Who sees which entry (the server's rule; see the backend page):
 *
 *   Explore              summary open, full report locked (to Solutions)
 *   Raise, Scout, admin  full report only — no summary
 *   contributors         full report only, plus "Your benchmark" — and they
 *                        keep the full report after a downgrade to Explore
 *
 * This is the fallback while the access endpoint does not exist (404) or
 * failed: plan only. A downgraded contributor looks like any Explore user
 * here, and R3 stays hidden — only the server knows who contributed.
 */
export function fallbackAccess(tier: Tier, isAdmin: boolean): BenchmarkAccess {
	const paid = isAdmin || tier === 'raise' || tier === 'scout';
	return {
		edition: EDITION,
		entries: { r1: paid ? 'none' : 'open', r2: paid ? 'open' : 'locked', r3: 'none' },
		contributor: null,
		trial: null,
	};
}

/** The benchmark card on Home and in the library opens R2 when it can, else R1. */
export function benchmarkCardEntry(a: Pick<BenchmarkAccess, 'entries'>): 'r1' | 'r2' {
	return a.entries.r2 === 'open' ? 'r2' : 'r1';
}

/** "Read the full report" or "Read the summary", by access. */
export function benchmarkCardAction(a: Pick<BenchmarkAccess, 'entries'>): string {
	return benchmarkCardEntry(a) === 'r2' ? 'Read the full report' : 'Read the summary';
}

/** `featured_until` for a release date: N weeks later, N clamped to 4–6. */
export function featuredUntil(releaseIso: string, weeks: number = FEATURED_WEEKS.default): string {
	const w = Math.min(FEATURED_WEEKS.max, Math.max(FEATURED_WEEKS.min, weeks));
	const d = new Date(`${releaseIso.slice(0, 10)}T00:00:00Z`);
	d.setUTCDate(d.getUTCDate() + w * 7);
	return d.toISOString().slice(0, 10);
}

export const PIN_KEY = {
	r3: `benchmark${EDITION % 100}:r3`,
	benchmark: `benchmark${EDITION % 100}:report`,
	ftr: `report:${FTR_SLUG}`,
} as const;

/**
 * The pins a user starts with, before any unpin: "Your benchmark" for a
 * contributor, the benchmark (R2 or R1 by access), and the Football Tech
 * Report. Pins reset with a new edition because the keys carry the edition.
 */
export function defaultPins(a: BenchmarkAccess, releaseIso: string): HomePin[] {
	const until = featuredUntil(releaseIso);
	const pins: HomePin[] = [];
	if (a.entries.r3 === 'open') pins.push({ key: PIN_KEY.r3, entry: 'r3', slug: SLUG.r3, featured_until: until, pinned: true });
	const e = benchmarkCardEntry(a);
	pins.push({ key: PIN_KEY.benchmark, entry: e, slug: SLUG[e], featured_until: until, pinned: true });
	pins.push({ key: PIN_KEY.ftr, entry: 'ftr', slug: FTR_SLUG, featured_until: until, pinned: true });
	return pins;
}

const ORDER: Record<HomePin['entry'], number> = { r3: 0, r2: 1, r1: 1, ftr: 2 };

/**
 * What the Home row renders: pinned, still featured on `today`, "Your
 * benchmark" first, at most three.
 */
export function visiblePins(pins: HomePin[], today: string): HomePin[] {
	const day = today.slice(0, 10);
	return pins
		.filter((p) => p.pinned && p.featured_until.slice(0, 10) >= day)
		.sort((x, y) => ORDER[x.entry] - ORDER[y.entry])
		.slice(0, MAX_PINS);
}

/** Apply the user's unpin/re-pin choices (`key → pinned`) over the defaults. */
export function withChoices(pins: HomePin[], choices: Record<string, boolean>): HomePin[] {
	return pins.map((p) => (p.key in choices ? { ...p, pinned: choices[p.key] } : p));
}

/**
 * Peer-group comparisons only when the group has at least five funds; under
 * that, the full sample. `isPeer` tells the block which heading to use.
 */
export function peerOrSample(pb: Pick<PersonalBenchmark, 'peer_group' | 'full_sample'>): { isPeer: boolean; label: string; funds: number; comparisons: Compare[] } {
	const g = pb.peer_group;
	if (g && g.funds >= PEER_GROUP_MIN) return { isPeer: true, label: g.label, funds: g.funds, comparisons: g.comparisons };
	return { isPeer: false, label: 'All funds in the benchmark', funds: pb.full_sample.funds, comparisons: pb.full_sample.comparisons };
}

/** A gap of one point or more is flagged on the channel ratings. */
export const GAP_FLAG = 1;
export function gapOf(c: Compare): number | null {
	return c.yours === null ? null : Math.round((c.yours - c.baseline) * 100) / 100;
}

/** Library ordering: R3 ("Yours") first, everything else keeps its order. */
export function yoursFirst<T extends { id: string }>(items: T[], yoursId: string): T[] {
	const i = items.findIndex((x) => x.id === yoursId);
	return i <= 0 ? items : [items[i], ...items.slice(0, i), ...items.slice(i + 1)];
}

/** Whether an entry should appear at all for this caller. */
export const listed = (a: EntryAccess) => a !== 'none';

export type { BenchmarkEntry };
