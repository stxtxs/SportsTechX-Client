/**
 * Builds a product's sidebar from the route manifest.
 *
 * Replaces `EXPLORE_NAV` / `useRaiseNav()` / `useScoutNav()`. Keeping this a
 * plain function of (tier, isAdmin) rather than a hook is what lets
 * the nav be diffed against the old arrays without rendering anything — see
 * `lib/nav.check.ts`.
 */

import type { ShellNavEntry, ShellNavItem } from '@/components/atlas/shell/nav';
import { access, type Tier } from './access.ts';
import { NAV_LAYOUT, ROUTE_BY_ID, forTier, type RouteDef } from './routes.ts';


/**
 * Can this viewer actually be *sent* to `routeId`?
 *
 * Deliberately stricter than the sidebar. `buildNav` keeps `upsell` items,
 * because showing a locked page is how the product sells itself — but an agent
 * chip or a programmatic push is an action, so it must only offer routes that
 * really open. Two ways one goes dead, and the chat agent can know neither:
 * the route belongs to the other product (Investors, Programs, Pipeline and the
 * Fundraising Guide are `tier: 'raise'`), or it is flagged
 * `placeholder` (no backend yet — no route is today).
 *
 * `isAdmin` is not taken: an admin bypasses `access()` entirely, and a chip is a
 * suggestion for *this* workspace, not proof of what they may open directly.
 */
export function navigable(routeId: string, tier: Tier): boolean {
	const r = ROUTE_BY_ID.get(routeId);
	if (!r || !forTier(r.path, tier) || forTier(r.placeholder, tier) || forTier(r.soon, tier)) return false;
	return access(r.tier, tier, false) === 'allow';
}


function toItem(r: RouteDef, tier: Tier, locked: boolean): ShellNavItem | null {
	const path = forTier(r.path, tier);
	const name = forTier(r.name, tier);
	// A route with no path for this tier simply does not exist here.
	if (!path || !name) return null;
	return {
		name, path, icon: r.icon,
		...(forTier(r.placeholder, tier) ? { placeholder: true } : {}),
		...(forTier(r.soon, tier) ? { soon: true } : {}),
		...(locked ? { locked: true } : {}),
		...(r.isDefault ? { isDefault: true } : {}),
		...(r.also ? { also: r.also } : {}),
	};
}

export function buildNav(tier: Tier, isAdmin: boolean): {
	nav: ShellNavEntry[];
	bottomNav: ShellNavItem[];
} {
	const nav: ShellNavEntry[] = [];
	const bottomNav: ShellNavItem[] = [];

	for (const group of NAV_LAYOUT[tier]) {
		const items = group.items
			.map((id) => ROUTE_BY_ID.get(id))
			// The layout says what a product *shows*; access says whether this
			// viewer can open it. Only `hidden` — the other paid product's
			// screens — is dropped. An `upsell` item stays listed and the page
			// behind it renders the TierGate, which is how the design wants
			// Explore's "Investors" to behave.
			.filter((r): r is RouteDef => !!r && access(r.tier, tier, isAdmin) !== 'hidden')
			// `upsell` items stay listed, marked locked: the lock icon and its
			// hover text say what unlocks them (handover v1 §4 Access).
			.map((r) => toItem(r, tier, access(r.tier, tier, isAdmin) === 'upsell'))
			.filter((i): i is ShellNavItem => i !== null);
		if (items.length === 0) continue;

		if (group.bottom) { bottomNav.push(...items); continue; }
		if (group.title === null) { nav.push(...items); continue; }
		// Watchlists are listed once, as "Watchlists" — never one entry per list
		// (handover v1 §2).
		const sectionItems = items;
		if (sectionItems.length === 1) { nav.push(sectionItems[0]); continue; }
		nav.push({ title: group.title, items: sectionItems });
	}

	return { nav, bottomNav };
}
