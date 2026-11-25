/**
 * Display headings for Sports and Tags on Preferences ("Atlas Preferences:
 * sports headings, Home pills and Tags", 25 Nov 2026, sections 2 and 4.4).
 *
 * Tags: five headings, tags in the order of section 2. A tag's heading comes
 * from its `display_heading` field once the API sends it (4.9). Until the data
 * team's renames and merges land (section 3), a tag is placed by its name, and
 * its current name maps to the new one here, so "AI / ML" sits where "AI" will.
 * Tags being removed (3.3) have no heading and don't show in + Add.
 *
 * Pure, so `headings.check.ts` runs it without React.
 */

export const TAG_HEADINGS: { heading: string; tags: string[] }[] = [
	{ heading: 'Technology', tags: ['AI', 'Generative AI', 'Computer Vision', 'Data Analytics', 'Fan Data', 'AR/VR', 'Virtual Worlds', 'Web3', 'Smart Textile', 'Smart Venues'] },
	{ heading: 'Commerce', tags: ['SaaS', 'Marketplace', 'E-commerce', 'Crowdfunding'] },
	{ heading: 'Engagement', tags: ['Community', 'Gamification', 'Rewards', 'Collectibles', 'Competitive Socialising'] },
	{ heading: 'Health', tags: ['Mental Fitness', 'Sleep', 'Nutrition', "Women's Health", 'Gym Tech'] },
	{ heading: 'Impact', tags: ["Women's Sports", 'Athlete-owned', 'NIL', 'Accessibility', 'Social Impact', 'Sustainability'] },
];

/** Current tag name → its name in the new list (renames, merges and the NFT split, section 3.1). */
const CURRENT_TO_NEW: Record<string, string> = {
	'AI / ML': 'AI', Chatbot: 'AI',
	'Data Mining / Modeling': 'Data Analytics',
	'CRM / Fan Data': 'Fan Data',
	'XR (AR/VR/MR)': 'AR/VR',
	'Metaverse / Virtual worlds': 'Virtual Worlds',
	'Tokens & Crypto': 'Web3', 'NFT / Blockchain': 'Web3',
	'Enterprise & SaaS': 'SaaS',
	'Crowdsourcing & Crowdfunding': 'Crowdfunding',
	'Social Platform': 'Community',
	'Fan Loyalty / Rewards': 'Rewards', 'M2E (move to earn)': 'Rewards', 'P2E (play to earn)': 'Rewards',
	'Digital Collectibles': 'Collectibles',
	Sportainment: 'Competitive Socialising',
	'Mental fitness / Mindfulness': 'Mental Fitness',
	'Sleep Optimization': 'Sleep',
	FemTech: "Women's Health",
	'Tech For Disabled': 'Accessibility',
	'Tech For Good': 'Social Impact',
	'Smart Clothing': 'Smart Textile',
	'Stadium Tech': 'Smart Venues',
};

/** Renames only (one current tag keeps its ID under the new name), new → current. */
const RENAMED_FROM: Record<string, string> = Object.fromEntries(
	['AI / ML', 'Data Mining / Modeling', 'CRM / Fan Data', 'XR (AR/VR/MR)', 'Metaverse / Virtual worlds', 'Enterprise & SaaS',
		'Crowdsourcing & Crowdfunding', 'Social Platform', 'Fan Loyalty / Rewards', 'Digital Collectibles', 'Sportainment',
		'Mental fitness / Mindfulness', 'Sleep Optimization', 'FemTech', 'Tech For Disabled', 'Tech For Good', 'Smart Clothing']
		.map((cur) => [CURRENT_TO_NEW[cur]!, cur]),
);

/**
 * The tag that stands for a name in the new list: the tag with that name, or
 * the one being renamed to it (not one being merged into it).
 */
export function findTag<T extends { name: string }>(rows: T[], newName: string): T | undefined {
	return rows.find((r) => r.name === newName) ?? rows.find((r) => r.name === RENAMED_FROM[newName]);
}

/** The tag's name in the new list (itself when it's already there). */
export const canonicalTag = (name: string): string => CURRENT_TO_NEW[name] ?? name;

const POSITION = new Map<string, { heading: string; index: number }>();
TAG_HEADINGS.forEach((h, hi) => h.tags.forEach((t, ti) => POSITION.set(t, { heading: h.heading, index: hi * 100 + ti })));

/** Heading for a tag, or null for a tag being removed (it stays hidden from + Add). */
export function tagHeading(tag: { name: string; display_heading?: string | null }): string | null {
	if (tag.display_heading) return tag.display_heading;
	return POSITION.get(canonicalTag(tag.name))?.heading ?? null;
}

/** Sort key: heading order, then the order of section 2. */
export const tagOrder = (name: string): number => POSITION.get(canonicalTag(name))?.index ?? 9_999;

/** Tag rows grouped under the five headings, in order; tags without a heading are left out. */
export function groupTags<T extends { id: string; name: string; display_heading?: string | null }>(tags: T[]): { heading: string; tags: T[] }[] {
	return TAG_HEADINGS
		.map(({ heading }) => ({
			heading,
			tags: tags.filter((t) => tagHeading(t) === heading).sort((a, b) => tagOrder(a.name) - tagOrder(b.name) || a.name.localeCompare(b.name)),
		}))
		.filter((g) => g.tags.length > 0);
}

/** "Fitness & endurance" → "Fitness & Endurance": sports headings in Title Case, "&" kept (section 1). */
export const titleCase = (s: string): string => s.replace(/\b([a-z])/g, (_, c: string) => c.toUpperCase());

/**
 * Collapse picks into pills (4.2): a heading whose members are all picked is
 * one pill; otherwise its picked members show one by one.
 */
export function collapse(
	picked: string[],
	headings: { label: string; values: string[] }[],
): { label: string; values: string[] }[] {
	const set = new Set(picked);
	const out: { label: string; values: string[] }[] = [];
	const used = new Set<string>();
	for (const h of headings) {
		if (h.values.length > 1 && h.values.every((v) => set.has(v))) {
			out.push({ label: h.label, values: h.values });
			h.values.forEach((v) => used.add(v));
		}
	}
	for (const v of picked) if (!used.has(v)) out.push({ label: v, values: [v] });
	return out;
}
