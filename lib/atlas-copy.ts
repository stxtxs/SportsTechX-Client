/**
 * Text used on more than one solution, written once (handover v1 §5). Pages
 * import these rather than restating them, so a line cannot drift per solution.
 */
import type { Tier } from './access.ts';

export const HOME_SUBLINE = 'Welcome to your insider guide to sports tech & venture.';

/** "Good morning" / "Good afternoon" / "Good evening", by the viewer's clock. */
export function greetingFor(hour: number): string {
	return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

export const ASK_PLACEHOLDER: Record<Tier, string> = {
	explore: 'Ask Atlas about trends, companies, funding and events.',
	raise: 'Ask Atlas about investors, your market and your raise',
	scout: 'Ask Atlas about companies, deals and your thesis',
};

export const ASK_SUGGESTIONS: Record<Tier, [string, string, string]> = {
	explore: ['Summarise last month’s deal flow', 'What sports tech events are coming up?', 'What’s trending in sports tech?'],
	raise: ['Find investors for my round', 'Review my pitch deck', 'Size my market'],
	scout: ['Find companies matching my thesis', 'Show recent sports tech deals', 'What’s trending in sports tech?'],
};

export const ASK_INTRO = 'Ask me about the sports tech market: companies, funding rounds, investors and events.';

/** The settings page each solution links to from Home, in the same place. */
export const SETTINGS_LINK: Record<Tier, { id: string; label: string }> = {
	explore: { id: 'interests', label: 'Preferences' },
	raise: { id: 'raise-settings', label: 'Raise settings' },
	scout: { id: 'thesis', label: 'Scouting thesis' },
};

export const NEWSLETTER_INTRO = 'The SportsTechX briefing: funding, deals and the developments that matter across sports tech, published weekly.';

/**
 * Server-written copy (Home cards, Strategy Session steps) still uses retired
 * names. Until the server text is updated (see the backend notes), the client
 * maps it to the handover names (fix list 17 Nov, 2.3 and 2.5). Order matters:
 * the longer phrases go first.
 */
const RETIRED: [RegExp, string][] = [
	[/\bto the pipeline\b/gi, 'to your Investor Watchlist'],
	[/\byour pipeline\b/gi, 'your Investor Watchlist'],
	[/\bthe pipeline\b/gi, 'your Investor Watchlist'],
	[/\bpipeline\b/g, 'Investor Watchlist'],
	[/\bPipeline\b/g, 'Investor Watchlist'],
	[/\bRaise profile\b/g, 'Raise settings'],
	[/\bSTX leadership\b/g, 'SportsTechX leadership'],
	[/\bco-pilot\b/gi, 'Ask Atlas'],
];
export function currentNames(text: string | null | undefined): string {
	return RETIRED.reduce((t, [re, to]) => t.replace(re, to), text ?? '');
}
