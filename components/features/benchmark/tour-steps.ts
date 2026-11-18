'use client';

import type { UserType as Tier } from '@/hooks/use-user-profile';
import { shortcut, type Device } from './tour-layout';
import { both, css, firstOf, navLink, navSection, type Finder } from './tour-targets';

/**
 * The walkthrough's copy, per product. Rules for all three:
 * - the label reads "ASK ATLAS · 2 OF 7" (walkthrough.tsx adds the count);
 * - step 1 is a centred welcome with no highlight, "Show me around", no Back;
 *   it leads to Home, and Scout's last step is Home's thesis block;
 * - shortcuts name the user's device's keys, or both when it can't be told;
 * - a step whose target isn't on screen falls back as listed in `target`;
 * - the last step points at the setup prompt on Home, so the tour starts and
 *   ends there. Raise and Explore word it "Check… / Review…" once set up.
 */
export interface TourCopy {
	name: string | null;
	device: Device;
	/** The last step's subject is already set up (a raise, interests): "Check…" / "Review…". */
	setUp: boolean;
}
type Text = string | ((c: TourCopy) => string);

export interface Step {
	eyebrow: string;
	title: Text;
	body: Text;
	/** What it highlights; null = centred card, no highlight. */
	target: Finder | null;
	/** The forward button's label (default "Next"). */
	next?: Text;
}

export const textOf = (t: Text, c: TourCopy): string => (typeof t === 'function' ? t(c) : t);

const welcome = (product: string): Text => (c) => `Welcome to Atlas ${product}${c.name ? `, ${c.name}` : ''}.`;

const SCOUT: Step[] = [
	{ eyebrow: 'Welcome', title: welcome('Scout'), body: 'A quick look at where your next deal comes from. Seven stops, about two minutes.', target: null, next: 'Show me around' },
	{
		eyebrow: 'Ask Atlas', title: 'Ask anything',
		body: (c) => `Ask Atlas answers questions about companies, funding, events and sectors in plain language. It’s here on Home, in the left panel, and on any page with ${shortcut('J', c.device)}.`,
		// The Home box and the sidebar link together; the top-bar button off Home.
		target: firstOf(both(css('.scout-home__composer'), navLink('chat')), navLink('chat'), css('.atlas-navask')),
	},
	{ eyebrow: 'Latest from Atlas', title: 'See what’s new', body: 'New research and market updates, tuned to your thesis. Start here each time you log in.', target: css('.scout-home__attn') },
	{
		eyebrow: 'Discover', title: 'Find companies',
		body: (c) => `Companies is the full database with filters. Recommended matches your thesis, and Signals follows what the companies you track are doing. Save any of them to a watchlist. Looking for a name? Search with ${shortcut('K', c.device)}.`,
		target: navSection('Discover'),
	},
	{ eyebrow: 'Ecosystem and Intelligence', title: 'Read the market', body: 'Investors and programs make up the ecosystem. Market, the Monthly Roundup, Recently Funded and M&A show where money and attention are going.', target: navSection('Ecosystem', 'Intelligence') },
	{ eyebrow: 'Resources', title: 'Read the research', body: 'The framework, events, the newsletter and every SportsTechX report, including the VC Deal Sourcing Benchmark 2026. Unpin anything from Home and you’ll still find it in Reports.', target: navSection('Resources') },
	{ eyebrow: 'Your thesis', title: 'Set up your thesis', body: 'Tell Atlas your stages, regions and sectors, and it tunes recommendations, signals and Home to them. It takes a couple of minutes and you can change it any time.', target: firstOf(css('.scout-home__thesis'), css('.atlas-avatar')), next: 'Set up your thesis' },
];

/** The Ask Atlas box on a Home page plus the sidebar link; the top-bar button off Home. */
const askAtlas = (homeBox: string): Finder => firstOf(both(css(homeBox), navLink('chat')), navLink('chat'), css('.atlas-navask'));
const askBody: Text = (c) => `Ask Atlas answers questions about companies, funding, events and sectors in plain language. It’s here on Home, in the left panel, and on any page with ${shortcut('J', c.device)}.`;
/** A card on Home by its id (FeedCard `id`). */
const card = (...ids: string[]): Finder => css(ids.map((id) => `.atlas-feed-card[data-card="${id}"]`).join(', '));

const RAISE: Step[] = [
	{ eyebrow: 'Welcome', title: welcome('Raise'), body: 'Here’s how your round runs from here. Seven stops, about two minutes.', target: null, next: 'Show me around' },
	{ eyebrow: 'Ask Atlas', title: 'Ask anything', body: askBody, target: askAtlas('.raise-hero .atlas-composer-box') },
	// The spec's "What Needs Your Attention" was retitled on Home (11 Nov); the label uses the live name.
	{ eyebrow: 'Latest from Atlas', title: 'Know your next step', body: 'Never more than three things, always the next step for your round.', target: css('.raise-attn') },
	{ eyebrow: 'Pitch Deck', title: 'Sharpen your deck', body: 'Upload your deck and see its strengths, its gaps and the questions investors will ask.', target: navLink('deck') },
	{
		eyebrow: 'Investors and Pipeline', title: 'Find your investors',
		body: (c) => `Recommended shows investors matched to your round. Add the right ones to your pipeline and track every conversation from Target to Closed. Looking for a name? Search with ${shortcut('K', c.device)}.`,
		target: firstOf(both(navLink('investors'), navLink('pipeline')), navLink('investors')),
	},
	{
		eyebrow: 'Resources and Strategy Session', title: 'Get help when you need it',
		body: 'The Fundraising Guide has checklists and templates for each stage of the raise, and you can book a strategy session with our team when you’re ready.',
		target: firstOf(both(navLink('guide'), navLink('strategy')), navLink('guide')),
	},
	{
		eyebrow: 'Your raise',
		title: (c) => (c.setUp ? 'Check your raise' : 'Set up your raise'),
		body: 'Tell Atlas about your company, your round and the investors you’re looking for, and it builds your workspace around them. It takes a couple of minutes and you can change it any time.',
		// The setup card before setup, the round card after.
		target: firstOf(card('setup'), card('round'), css('.raise-attn')),
		next: (c) => (c.setUp ? 'Review your raise' : 'Set up your raise'),
	},
];

const EXPLORE: Step[] = [
	{ eyebrow: 'Welcome', title: welcome('Explore'), body: 'Your insider guide to sports tech. Six stops, about two minutes.', target: null, next: 'Show me around' },
	{ eyebrow: 'Ask Atlas', title: 'Ask anything', body: askBody, target: askAtlas('.explore-home__search .atlas-composer-box') },
	{ eyebrow: 'Latest from Atlas', title: 'See what’s new', body: 'New research and market updates, picked for the interests you set. Start here each time you log in.', target: css('.explore-home__attn') },
	{
		eyebrow: 'Market', title: 'Explore the market',
		body: (c) => `Companies is the full database, with filters for sector, location and funding. Investors and Programs sit right alongside it. Looking for a name? Search with ${shortcut('K', c.device)}.`,
		target: navSection('Market'),
	},
	{ eyebrow: 'Reports', title: 'Read the research', body: '30+ SportsTechX reports live here, including the Football Tech & Business Report 2026. Unpin anything from Home and you’ll still find it in Reports.', target: navLink('reports') },
	{
		eyebrow: 'Your interests',
		title: (c) => (c.setUp ? 'Check your interests' : 'Set your interests'),
		body: 'Tell Atlas the sectors and sports you follow, and it tunes Home to them. It takes a couple of minutes and you can change it any time.',
		// The "Set your interests" link under the Home heading ("Interests N" once set), as Scout ends on its thesis block.
		target: firstOf(css('.explore-home__interests'), card('for-you')),
		next: (c) => (c.setUp ? 'Review your interests' : 'Set your interests'),
	},
];

export const TOURS: Record<Tier, Step[]> = {
	scout: SCOUT,
	raise: RAISE,
	explore: EXPLORE,
};

/** The banner's last words, per product. */
export const TOUR_ENDING: Record<Tier, string> = {
	scout: 'setting up your thesis',
	raise: 'setting up your raise',
	explore: 'setting your interests',
};
