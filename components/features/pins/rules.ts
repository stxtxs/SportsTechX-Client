/**
 * Pin to Home (fix brief N1, 17 Nov) — the rules, as plain functions.
 *
 *  - Content pieces only: reports, newsletter editions, Fundraising Guide items.
 *    Never a page in the left panel, a watchlist, Framework or Events.
 *  - Pinned items lead "Latest from Atlas", most recently pinned first.
 *  - Four pins per user, SportsTechX pins included.
 *  - SportsTechX can pin an item for everyone. A user who unpins it keeps it
 *    unpinned (it's remembered in `dismissed`), and can pin it back.
 *  - Unpinning only removes the item from Home; it stays in its own section.
 *
 * Plain module (no React), so `rules.check.ts` runs it under node. Every
 * function returns a new state; nothing is changed in place.
 */

export type PinKind = 'report' | 'newsletter' | 'guide';

/** What a card offers to pin: enough to draw it on Home without a refetch. */
export interface PinTarget {
	/** `<kind>:<slug>`, e.g. `report:ftabr26`. */
	key: string;
	kind: PinKind;
	title: string;
	body?: string;
	/** Where the Home card's "Open" goes. */
	href: string;
	/** Opens in a new tab (reports and newsletter editions). */
	newTab?: boolean;
}

export interface Pin extends PinTarget {
	/** ISO time; newest first on Home. */
	pinned_at: string;
	/** Pinned by SportsTechX for everyone. */
	by_atlas?: boolean;
}

/** One user's pins, as kept until the endpoints exist. */
export interface PinState {
	mine: Pin[];
	/** SportsTechX pins this user unpinned; they stay off their Home. */
	dismissed: string[];
}

export const MAX_PINS = 4;
export const PIN_LIMIT_MESSAGE = 'You can pin up to four items. Unpin one to add this.';
export const EMPTY_PINS: PinState = { mine: [], dismissed: [] };

export const pinKey = (kind: PinKind, slug: string) => `${kind}:${slug}`;

/** What Home shows: the user's pins plus SportsTechX pins they kept, newest first, at most four. */
export function homePins(state: PinState, atlas: readonly Pin[]): Pin[] {
	const mine = new Set(state.mine.map((p) => p.key));
	const kept = atlas.filter((p) => !state.dismissed.includes(p.key) && !mine.has(p.key));
	return [...state.mine, ...kept]
		.sort((a, b) => b.pinned_at.localeCompare(a.pinned_at))
		.slice(0, MAX_PINS);
}

export type PinResult = { ok: true; state: PinState } | { ok: false; reason: 'limit' };

/** Pin an item. Already pinned: no change. A fifth: refused. */
export function addPin(state: PinState, target: PinTarget, atlas: readonly Pin[], now: string): PinResult {
	const shown = homePins(state, atlas);
	if (shown.some((p) => p.key === target.key)) return { ok: true, state };
	if (shown.length >= MAX_PINS) return { ok: false, reason: 'limit' };
	return {
		ok: true,
		state: {
			mine: [{ ...target, pinned_at: now }, ...state.mine.filter((p) => p.key !== target.key)],
			dismissed: state.dismissed.filter((k) => k !== target.key),
		},
	};
}

/** Unpin an item. A SportsTechX pin is remembered as dismissed so it stays off. */
export function removePin(state: PinState, key: string, atlas: readonly Pin[]): PinState {
	const isAtlas = atlas.some((p) => p.key === key);
	return {
		mine: state.mine.filter((p) => p.key !== key),
		dismissed: isAtlas && !state.dismissed.includes(key) ? [...state.dismissed, key] : state.dismissed,
	};
}
