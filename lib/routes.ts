/**
 * Every navigable route in one place, and how each product arranges them.
 *
 * This replaces three hand-maintained nav arrays (EXPLORE_NAV / RAISE_NAV /
 * SCOUT_NAV) that between them listed the same screens at three different URLs,
 * in different sections, sometimes under different labels. Keeping three lists
 * in sync by hand is what let them drift.
 *
 * ## Two tables, because they answer different questions
 *
 * `ROUTES` says **what a route is** — its URL, which product owns it, its label
 * and icon. Each fact lives once, so a path or a flag cannot disagree between
 * products any more.
 *
 * `NAV_LAYOUT` says **how one product arranges them** — section titles and the
 * order of items inside them. That genuinely is per-product design (Raise lists
 * Companies under "Discover", Explore under "Market") and is not derivable from
 * anything, so it stays explicit. It references routes by id, so it carries no
 * paths and cannot drift from `ROUTES`.
 *
 * ## Per-tier values
 *
 * `path`, `name` and `placeholder` accept either one value or a per-tier map.
 * All three really do vary:
 *
 *   - `path`    one screen, three URLs — temporary, collapses to a single
 *               string when the routes are consolidated
 *   - `name`    the market-analytics screen is "Analysis" in Explore,
 *               "Analytics" in Raise and "Market" in Scout
 *   - `placeholder`  Recommended has a backend in Raise but not in Scout
 *
 * Routes listed in `ROUTES` but in no `NAV_LAYOUT` are real pages that are
 * gated but never listed — detail pages, wizards, the chat. A route's tier is
 * resolved for an arbitrary URL by longest-prefix match, so
 * `/app/investors/abc` inherits the gate from `/app/investors`.
 */

import { access, type Tier, type TierReq } from './access.ts';

/** One value, or a different value per tier. */
export type PerTier<T> = T | Partial<Record<Tier, T>>;

const isMap = <T,>(v: PerTier<T>): v is Partial<Record<Tier, T>> =>
	typeof v === 'object' && v !== null;

/** Resolve a possibly-per-tier value. `undefined` = not applicable to this tier. */
export function forTier<T>(value: PerTier<T> | undefined, tier: Tier): T | undefined {
	if (value === undefined) return undefined;
	return isMap<T>(value) ? value[tier] : value;
}

export interface RouteDef {
	/** Stable id. Referenced by NAV_LAYOUT, and survives the URL change. */
	id: string;
	/** Today: one URL per tier. After consolidation: a single string. */
	path: PerTier<string>;
	/**
	 * Which product owns it, as one tier or a list of them.
	 *
	 * Mind the asymmetry: **omitted means "everyone"** (the free Explore base),
	 * while `'explore'` means **"Explore only"** — a screen that makes no sense
	 * for a paid profile, so it 404s for Raise and Scout rather than upselling.
	 * `interests` is the only route that wants that.
	 */
	tier?: TierReq;
	name: PerTier<string>;
	/** A Figma icon name from components/atlas/icons/figma-icons.tsx. */
	icon: string;
	/** Built to the design, no backend yet — shows a "Not connected" pill. */
	placeholder?: PerTier<boolean>;
	/** Greyed in the sidebar with a SOON pill, not a link; never offered by chat
	 *  or the command palette. Deal Flow uses it while it is "Coming soon". */
	soon?: PerTier<boolean>;
	isDefault?: boolean;
	/** Other URLs that highlight this item and show its group's frame. */
	also?: string[];
}

export const ROUTES: RouteDef[] = [
	// ── Shared: the free Explore base, open to every signed-in user ──────────
	{
		id: 'home', icon: 'nav-home', name: 'Home',
		path: '/home',
	},
	{
		id: 'companies', icon: 'nav-companies', name: 'Companies',
		path: '/companies',
	},
	{
		// Not an Explore screen: the design lists neither this nor Recently
		// Funded for Explore, and leaving them ungated rendered them with no
		// heading and no tab strip, because NavSectionHeader can only find a
		// section the viewer's sidebar actually has.
		id: 'signals', icon: 'nav-signals', name: 'Signals',
		path: '/signals', tier: ['raise', 'scout'],
	},
	{
		// One URL, two different domain objects: recommended investors for a
		// founder, recommended companies for an investor. Dispatched inside the
		// page — a user only ever holds one paid tier.
		id: 'recommended', icon: 'nav-recommended', name: 'Recommended',
		path: '/recommended', tier: ['raise', 'scout'],
	},
	{
		// One name on every solution (handover v1 §3).
		id: 'analytics', icon: 'nav-analysis',
		name: 'Analytics',
		path: '/analytics',
	},
	{
		id: 'roundup', icon: 'nav-roundup', name: 'Monthly Roundup',
		path: '/roundup',
	},
	{
		id: 'recently-funded', icon: 'nav-funded', name: 'Recently Funded',
		path: '/recently-funded', tier: ['raise', 'scout'],
	},
	// M&A tracker — a tabulated list of acquisitions (acquirer ↔ acquiree),
	// ported from the hub's /ma page. Sits beside Recently Funded in both paid
	// products; Explore is not shown it (not in its nav, `['raise','scout']`).
	{ id: 'ma', icon: 'nav-ma', name: 'M&A', path: '/ma', tier: ['raise', 'scout'] },
	{
		id: 'watchlists', icon: 'nav-list', name: 'Watchlists',
		path: '/watchlists',
		// The Investor Watchlist board is one of the watchlists (handover v1 B9).
		also: ['/pipeline'],
	},
	{
		id: 'framework', icon: 'nav-framework', name: 'Framework',
		path: '/framework',
	},
	{
		id: 'reports', icon: 'nav-reports', name: 'Reports',
		path: '/reports',
	},
	{
		id: 'newsletter', icon: 'nav-newsletter', name: 'Newsletter',
		path: '/newsletter',
	},
	{
		id: 'events', icon: 'nav-events', name: 'Events',
		path: '/events',
	},
	{
		// Reached from the account badge, which AtlasShell renders separately.
		// Listed so the gate and `pickActive` know about it.
		id: 'account', icon: 'nav-thesis', name: 'Account',
		path: '/account',
	},
	{ id: 'billing', icon: 'nav-subscription', name: 'Subscription', path: '/billing' },
	// STX credits (AI + exports) — its own page, every tier, so Explore can top
	// up too. Reached from the account tab strip and the out-of-credits modal.
	{ id: 'credits', icon: 'nav-subscription', name: 'Credits', path: '/credits' },
	// Deliberately untiered. Claiming your company or fund is how the
	// directory stays accurate, so a free user must be able to do it — the
	// API never gated it and the UI used to have no door at all.
	{ id: 'verify', icon: 'nav-onboarding', name: 'Get verified', path: '/verify' },
	// Plans moved to a PUBLIC, chrome-less route (app/plans) so it can be viewed
	// signed-out and shown in onboarding without the shell. It is therefore NOT a
	// ROUTES entry any more (those are all edge-gated); link to it via PLANS_PATH.
	{
		// Both paid products include this: a founder checks their own pitch, an
		// investor screens someone else's. Same backend and component, different
		// copy and a different name in each sidebar.
		// Paid-only (Raise + Scout): the deck analyser is a paid feature again, so
		// Explore gets the upsell (TierGate) rather than spending its welcome grant
		// on it. The server mirrors this — DeckAnalysisService refuses base-tier
		// callers (admins exempt). Both sides are `['raise','scout']`.
		id: 'deck', icon: 'nav-screener',
		name: { explore: 'Pitch Deck', raise: 'Pitch Deck', scout: 'Deck Screener' },
		// The Deck Screener is live now: Scout runs the same engine in investor
		// mode (snapshot, thesis fit, red flags, diligence questions).
		path: '/deck', tier: ['raise', 'scout'],
	},
	// Preferences: every solution's personal settings (was Explore-only "Interests").
	// Reached from the Account tabs, not the panel.
	{ id: 'interests', icon: 'nav-interests', name: 'Preferences', path: '/interests' },

	// ── Raise ───────────────────────────────────────────────────────────────
	// Both paid products get the ecosystem directories (Scout browses them, Raise
	// targets them). Explore keeps Investors as an upsell via its own nav entry.
	// Every solution: Explore lists verified investor profiles only (the page
	// filters to `is_verified`), Raise and Scout see all (handover v1 B5).
	{ id: 'investors', icon: 'nav-circle', name: 'Investors', path: '/investors' },
	// Every plan: Programs is a public directory like Events (same component, same
	// public endpoint), so Explore lists it under Market beside Events.
	{ id: 'programs', icon: 'nav-dealflow', name: 'Programs', path: '/programs' },
	{ id: 'my-market', icon: 'nav-market', name: 'My Market', path: '/my-market', tier: 'raise' },
	{ id: 'pipeline', icon: 'nav-list', name: 'Investor Watchlist', path: '/pipeline', tier: 'raise' },
	{ id: 'raise-settings', icon: 'nav-thesis', name: 'Raise settings', path: '/settings', tier: 'raise' },
	// No tier: every plan gets the assistant, bounded by credits rather than by a
	// locked door (see chat.controller.ts). Still unlisted in NAV_LAYOUT — it is
	// reached from the home composer and the FAB.
	{ id: 'chat', icon: 'nav-chat', name: 'Ask Atlas', path: '/chat' },
	{ id: 'strategy', icon: 'nav-onboarding', name: 'Strategy Session', path: '/strategy', tier: 'raise' },
	// Guides, templates and checklists across Prepare → Connect → Close (content in
	// raise_resources, edited in admin). Back with real content after the October
	// removal of the "Coming soon" placeholder.
	{ id: 'guide', icon: 'nav-onboarding', name: 'Fundraising Guide', path: '/resources', tier: 'raise' },

	// ── Scout ───────────────────────────────────────────────────────────────
	{ id: 'deal-flow', icon: 'nav-dealflow', name: 'All', path: '/deal-flow', tier: 'scout' },
	{ id: 'deal-flow-featured', icon: 'nav-recommended', name: 'Featured Raises', path: '/deal-flow/featured', tier: 'scout' },
	{ id: 'deal-flow-verified', icon: 'nav-dealflow', name: 'Verified Raises', path: '/deal-flow/verified', tier: 'scout' },
	{ id: 'deal-flow-circle', icon: 'nav-circle', name: 'From the Circle', path: '/deal-flow/circle', tier: 'scout' },
];

export const ROUTE_BY_ID = new Map(ROUTES.map((r) => [r.id, r]));

/** The public pricing page ("Solutions", formerly /plans). Not a gated ROUTES entry — link to it directly. */
export const PLANS_PATH = '/solutions';

/** A sidebar group. `title: null` renders its items at the top, ungrouped. */
export interface NavGroup {
	title: string | null;
	/** Bottom nav rather than the main list. */
	/**
	 * Pinned to the foot of the rail. No group uses it any more: Thesis
	 * Settings and Subscription moved into the Account page's tabs, and the
	 * rail's footer is the account block. Kept because `nav.check.ts` asserts
	 * the foot stays empty, which is the thing worth guarding.
	 */
	bottom?: boolean;
	/** Route ids, in render order. */
	items: string[];
}

/**
 * Each product's sidebar, verbatim from the three configs it replaces. Order
 * matters and is design, not derivable — see the file header.
 */
export const NAV_LAYOUT: Record<Tier, NavGroup[]> = {
	// Atlas dev handover v1 §2. Same structure on all three: Home and Ask Atlas,
	// then the solution's own group (none on Explore), Discover, Market, Resources.
	// Recommended, Signals, Interests, Pipeline and individual watchlists are not
	// listed: Recommended is a switch on its list page, Preferences lives in
	// Account, and the Investor Watchlist is reached from Watchlists.
	explore: [
		{ title: null, items: ['home', 'chat'] },
		// Investors on Explore: verified profiles only (the page filters).
		{ title: 'Discover', items: ['companies', 'investors', 'programs'] },
		// Recently Funded and M&A resolve to `upsell` here and render locked.
		{ title: 'Market', items: ['analytics', 'roundup', 'recently-funded', 'ma'] },
		{ title: 'Resources', items: ['framework', 'reports', 'newsletter', 'events'] },
	],
	raise: [
		{ title: null, items: ['home', 'chat'] },
		{ title: 'Fundraise', items: ['deck', 'investors', 'watchlists', 'strategy'] },
		{ title: 'Discover', items: ['companies', 'programs'] },
		{ title: 'Market', items: ['analytics', 'roundup', 'my-market', 'recently-funded', 'ma'] },
		{ title: 'Resources', items: ['guide', 'framework', 'reports', 'newsletter', 'events'] },
	],
	scout: [
		{ title: null, items: ['home', 'chat'] },
		{ title: 'Deal Flow', items: ['companies', 'watchlists', 'deal-flow-verified', 'deal-flow-featured', 'deck'] },
		{ title: 'Discover', items: ['investors', 'programs'] },
		{ title: 'Market', items: ['analytics', 'roundup', 'recently-funded', 'ma'] },
		{ title: 'Resources', items: ['framework', 'reports', 'newsletter', 'events'] },
	],
};

/** One subline per group, the same wherever the group appears (handover v1 §3). */
export const GROUP_SUBS: Record<string, string> = {
	Fundraise: 'Your fundraise: pitch deck, investors and watchlists.',
	'Deal Flow': 'Companies to scout, and the raises verified by SportsTechX.',
	Discover: 'The companies, investors and programs in sports tech.',
	Market: "What's happening across the sports tech market.",
	Resources: 'SportsTechX research, the framework, events and the newsletter.',
};

/** Kept per tier for existing callers; every tier reads the same sublines. */
export const SECTION_SUBS: Record<Tier, Record<string, string>> = {
	explore: GROUP_SUBS,
	raise: GROUP_SUBS,
	scout: GROUP_SUBS,
};

/**
 * A route's canonical path.
 *
 * Throws while that route still carries per-tier paths, which is the guard an
 * incremental migration wants: during the flip half the manifest is still a
 * map, and a component reaching for a path that has not moved yet should fail
 * loudly rather than render a dead link.
 */
export function hrefOf(id: string): string {
	const p = ROUTE_BY_ID.get(id)?.path;
	if (typeof p !== 'string') throw new Error(`route '${id}' still has per-tier paths`);
	return p;
}

/** Profile URL for a company. Replaces the per-product `*CompanyHref` helpers. */
export const companyHref = (idOrSlug: string) => `${hrefOf('companies')}/${encodeURIComponent(idOrSlug)}`;

/** The route a product's logo and account badge point at. */
export const pathOf = (id: string, tier: Tier): string =>
	forTier(ROUTE_BY_ID.get(id)?.path, tier) ?? '/';

/**
 * The route a URL belongs to, by longest-prefix match — so
 * `/app/investors/abc` resolves through `/app/investors` and detail pages
 * inherit their parent's gate without needing their own entry.
 */
export function routeForPath(pathname: string, tier: Tier): RouteDef | undefined {
	let best: RouteDef | undefined;
	let bestLen = -1;
	for (const r of ROUTES) {
		const p = forTier(r.path, tier);
		if (!p) continue;
		if ((pathname === p || pathname.startsWith(p + '/')) && p.length > bestLen) {
			best = r;
			bestLen = p.length;
		}
	}
	return best;
}

/** The tier(s) that own a URL. Undefined means the free base. */
export const tierForPath = (pathname: string, tier: Tier): TierReq | undefined =>
	routeForPath(pathname, tier)?.tier;

/** Can this viewer open this URL? */
export function accessForPath(pathname: string, tier: Tier, isAdmin: boolean) {
	return access(tierForPath(pathname, tier), tier, isAdmin);
}
