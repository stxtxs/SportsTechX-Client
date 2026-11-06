/**
 * The three Atlas solutions, shared by everything on the landing page that
 * names or selects one: the header dropdown, the hero lines, the Solutions
 * section, pricing, the closing CTA and the footer.
 *
 * Selecting a solution from anywhere dispatches `atlas:solution` (see
 * `selectSolution`); the Solutions section listens and opens that card, and the
 * link's own `#solutions` href does the scrolling.
 */
export type SolutionId = 'explore' | 'raise' | 'scout';

/**
 * Every outbound destination in one place. Entries marked TBC are stand-ins
 * until the real URLs exist (dev brief, "Buttons and destinations").
 */
export const ATLAS_LINKS = {
	bookDemo: 'https://cal.com/khyati/sportstechx',
	signup: '/signup', // TBC: Explore sign-up
	login: '/login',
	founderSandbox: 'https://www.sandbox.sportstechx.com/preview/raise',
	investorSandbox: 'https://www.sandbox.sportstechx.com/preview/scout',
	raiseCheckout: '/plans', // TBC: Raise checkout
	scoutCheckout: '/plans', // TBC: Scout checkout
	stxHome: 'https://www.sportstechx.com',
} as const;

export type Cta = { label: string; href: string; external?: boolean };

export type Step = {
	label: string;
	headline: string;
	bullets: string[];
};

export type Solution = {
	id: SolutionId;
	/** Italic product name in the lockup. */
	name: string;
	/** Product colour, as on the current site. */
	colour: string;
	/** The card's background tint, toward the bottom-right corner. */
	tint: string;
	/** Darker fill for white-text buttons and the active pill (contrast-safe). */
	fill: string;
	/** Lighter shade for text and dots on the dark card. */
	accent: string;
	/** Small label at the top of the card. */
	audience: string;
	/** Selector pill text ("I WANT TO …"). */
	pill: string;
	/** Grey hint under the pill. */
	hint: string;
	/** Header dropdown: audience line and one-line promise. */
	menuAudience: string;
	menuPromise: string;
	/** Hero headline line for this solution (its full stop takes `colour`). */
	heroLine: string;
	/** Closing CTA button. */
	closingCta: string;
	intro: string;
	ctas: Cta[];
	/** Small line under the CTAs (Raise's money-back guarantee). */
	note?: string;
	/** Raise only: the "Experts in your corner" strip. */
	experts?: boolean;
	steps: Step[];
	/**
	 * CMS testimonials for this card, by the person's name. The testimonials are
	 * built but switched off while the product relaunches (TESTIMONIALS_ENABLED).
	 */
	testimonialNames: string[];
};

/** Off for the relaunch; flip on to show each card's testimonials. */
export const TESTIMONIALS_ENABLED = false;

export const SOLUTIONS: Solution[] = [
	{
		id: 'explore',
		name: 'EXPLORE',
		colour: '#ff3373',
		tint: '#7a1236',
		fill: '#f32163',
		accent: '#ff6f9a',
		audience: 'FREE · FOR EVERYONE',
		pill: 'MAP THE MARKET',
		hint: 'Atlas Explore · Free',
		menuAudience: 'Free · For everyone',
		menuPromise: 'Map the sports tech market',
		heroLine: 'Map the market',
		closingCta: 'Explore for free',
		intro: 'Map the sports tech market, research companies and investors, and access industry reports, programs and events.',
		ctas: [{ label: 'Sign up for free', href: ATLAS_LINKS.signup }],
		steps: [
			{
				label: 'MAP',
				headline: 'Understand the sports tech landscape',
				bullets: [
					'Navigate sectors, sub-sectors and technology layers',
					'Research company profiles across categories',
					'Refine searches with filters tailored to your interests',
				],
			},
			{
				// Draft copy: the current page has no Track step text.
				label: 'TRACK',
				headline: 'Follow funding and deals',
				bullets: [
					'Follow funding rounds across sports tech',
					'See which investors are active, and where',
					'Save areas of interest to stay up to date',
				],
			},
			{
				// Draft copy: the current page has no Connect step text.
				label: 'CONNECT',
				headline: 'Plug into the ecosystem',
				bullets: [
					'Find accelerators, programs and events',
					'Read 30+ SportsTechX industry reports',
					'Stay current with the SportsTechX newsletter',
				],
			},
		],
		testimonialNames: ['Jan Alessie', 'David Hernando'],
	},
	{
		id: 'raise',
		name: 'RAISE',
		colour: '#4580ec',
		tint: '#1c55be',
		fill: '#2c5fc9',
		accent: '#8db0f7',
		audience: 'FOR FOUNDERS',
		pill: 'RAISE A ROUND',
		hint: 'Atlas Raise · For founders',
		menuAudience: 'For founders',
		menuPromise: 'Raise your next round',
		heroLine: 'Raise your round',
		closingCta: "I'm raising",
		intro: 'Find the right investors, benchmark your company and sharpen your pitch with the SportsTechX intelligence layer.',
		ctas: [
			{ label: 'Try Atlas Raise', href: ATLAS_LINKS.founderSandbox, external: true },
			{ label: 'Sign up', href: ATLAS_LINKS.signup },
		],
		note: '30-day money-back guarantee',
		experts: true,
		steps: [
			{
				label: 'PREPARE',
				headline: 'Build your case',
				bullets: [
					'Analyse your pitch deck to assess investor readiness',
					'Perform competitor benchmarking and market sizing',
					'Improve your pitch with expert feedback and iterative refinement',
				],
			},
			{
				label: 'CONNECT',
				headline: 'Identify the right investors',
				bullets: [
					'Access detailed profiles of verified sports tech investors',
					'Get matched with investors with the closest thesis overlap',
					'Build your investor pipeline and manage outreach',
				],
			},
			{
				label: 'CLOSE',
				headline: 'Close the deal',
				bullets: [
					'Build and maintain a due diligence-ready data room',
					'Access essential model documents for early-stage investments',
					'Monitor fundraising progress and keep your raise on track',
				],
			},
		],
		testimonialNames: ['Mitch Heath'],
	},
	{
		id: 'scout',
		name: 'SCOUT',
		colour: '#1cc3a4',
		tint: '#1d6b55',
		fill: '#1f7a5b',
		accent: '#6fd6ad',
		audience: 'FOR INVESTORS & ACCELERATORS',
		pill: 'FIND COMPANIES & DEALS',
		hint: 'Atlas Scout · For investors & accelerators',
		menuAudience: 'For investors & accelerators',
		menuPromise: 'Find your next deal',
		heroLine: 'Find your next deal',
		closingCta: "I'm investing",
		intro: 'Source deals matched to your thesis and strengthen due diligence with sports tech market data and analysis.',
		ctas: [
			{ label: 'Book a demo', href: ATLAS_LINKS.bookDemo, external: true },
			{ label: 'Take a look', href: ATLAS_LINKS.investorSandbox, external: true },
		],
		steps: [
			{
				label: 'DISCOVER',
				headline: 'Source the right deals',
				bullets: [
					'Search sports tech companies by sector, stage and geography',
					'Get recommendations matched to your investment thesis',
					'Discover verified raises from the SportsTechX network (coming soon)',
				],
			},
			{
				label: 'SOURCE',
				headline: 'Strengthen your due diligence',
				bullets: [
					'Review company traction, teams and funding history',
					'Assess opportunities using market data and funding trends',
					'Access round details and fundraising documents (coming soon)',
				],
			},
			{
				label: 'CONNECT',
				headline: 'Build founder relationships',
				bullets: [
					'Create watchlists of shortlisted companies',
					'Organise prospects through each pipeline phase',
					'Request introductions via our network (coming soon)',
				],
			},
		],
		testimonialNames: ['Lance Dietz', 'Vasu Kulkarni'],
	},
];

export const SOLUTION_EVENT = 'atlas:solution';

/** A product's link: `/#explore`, `/#raise`, `/#scout`. The URL alone picks the
 *  card, so it works from any page and when shared; no stored state. */
export const solutionHref = (id: SolutionId) => `/#${id}`;

/** The product named by a URL hash (`#raise`), if any. */
export const solutionFromHash = (hash: string): SolutionId | undefined =>
	SOLUTIONS.find((s) => `#${s.id}` === hash)?.id;

/**
 * Open a solution's card and scroll to it. Use as a link's click handler next
 * to `href={solutionHref(id)}`: on the landing page it takes over (a link to
 * the hash already in the URL would not scroll again); on any other page, where
 * the section is absent, the link navigates and the hash opens the card.
 */
export function selectSolution(id: SolutionId, e?: { preventDefault(): void }) {
	window.dispatchEvent(new CustomEvent<SolutionId>(SOLUTION_EVENT, { detail: id }));
	const section = document.getElementById('solutions');
	if (!section) return;
	e?.preventDefault();
	history.replaceState(null, '', `#${id}`);
	const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
	section.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
}
