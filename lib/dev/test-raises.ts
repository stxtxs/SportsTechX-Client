/**
 * Six made-up raises for reviewing Deal Flow on local (Deal Flow for launch,
 * 25 Nov 2026, section G). Loaded in the browser only, behind
 * NEXT_PUBLIC_TEST_RAISES=1 on a localhost page: nothing is written to the
 * database, nothing reaches preview or live, and Watch / Request introduction
 * on a test raise contact no one (see `lib/dev/test-raises-intercept.ts`).
 *
 * Fictional companies, not linked to company profiles, website example.com.
 * Same shape as `GET /api/scout/dealflow` (`DealRow`): amounts and dates as
 * strings, round codes as the founder's raise profile stores them.
 */
import type { DealRow } from '../../components/scout/deal-types.ts';

/** `00000000-0000-4000-8000-00000000000N`: valid UUIDs, easy to spot as test data. */
export const testRaiseId = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export const isTestRaiseId = (id: string) => /^00000000-0000-4000-8000-0000000000\d\d$/.test(id);

const base: Omit<DealRow, 'id' | 'company_name' | 'company_hq' | 'company_description' | 'sector' | 'round_type' | 'currency_code'
	| 'target_amount' | 'committed_amount' | 'valuation' | 'valuation_amount' | 'valuation_basis' | 'target_close_date' | 'is_featured'> = {
	source: 'verified_raise',
	status: 'live',
	company_website: 'https://example.com',
	company_id: null,
	company_anonymous: false,
	instrument: 'priced_equity',
	ticket_min: null,
	ticket_max: null,
	valuation_undisclosed: false,
	lead_status: 'seeking',
	lead_investor: null,
	submitter_name: null,
	submitter_anonymous: false,
	member_perspective: null,
	member_relationship: null,
	member_commitment: null,
	has_deck: true,
	has_one_pager: false,
	materials_access: 'immediate',
	disclosed: true,
	interest_status: null,
	is_watched: false,
};

/** Featured raises first (in order), then the rest: the API sorts featured first. */
export const TEST_RAISES: DealRow[] = [
	{
		...base,
		id: testRaiseId(1),
		is_featured: true,
		company_name: 'Kinetiq Labs',
		tags: ['AI', 'Data Analytics'],
		company_hq: 'Berlin, Germany',
		company_description: 'Smart insoles and an app that measure load, balance and fatigue for runners and team-sport athletes, so coaches can spot injury risk before it happens.',
		sector: 'Wearables',
		round_type: 'seed',
		currency_code: 'EUR',
		target_amount: '2000000',
		committed_amount: '1200000',
		valuation: '€10M pre-money',
		valuation_amount: '10000000',
		valuation_basis: 'pre_money',
		target_close_date: '2027-01-31',
		lead_status: 'confirmed',
		lead_investor: 'Northline Ventures',
		has_one_pager: true,
		member_perspective:
			'Kinetiq Labs has 3,200 paying users across 14 clubs and is growing 40% quarter on quarter. ' +
			'Founded by a former Bundesliga sports scientist and a hardware engineer from a wearables scale-up. ' +
			'The round funds a second sensor generation, a coach dashboard and expansion into the UK and Nordics. ' +
			'Prior round: €450k pre-seed in 2025 from angels and a sports-tech accelerator. (Test raise for review: fictional company.)',
	},
	{
		...base,
		id: testRaiseId(2),
		is_featured: true,
		company_name: 'Pitchside Pay',
		tags: ['E-commerce', 'SaaS'],
		company_hq: 'Amsterdam, Netherlands',
		company_description: 'Tap-to-pay food, drink and merchandise ordering for stadiums, with no queue and no app download.',
		sector: 'Ticketing & Merchandise',
		round_type: 'seed',
		currency_code: 'EUR',
		target_amount: '1500000',
		committed_amount: '400000',
		valuation: '€6M pre-money',
		valuation_amount: '6000000',
		valuation_basis: 'pre_money',
		target_close_date: '2026-12-20',
	},
	{
		...base,
		id: testRaiseId(3),
		is_featured: false,
		company_name: 'CoachLoop',
		tags: ['Marketplace', 'Community'],
		company_hq: 'London, United Kingdom',
		company_description: 'A marketplace matching grassroots clubs with qualified volunteer coaches.',
		sector: 'Coaching & Recruitment',
		round_type: 'pre_seed',
		currency_code: 'EUR',
		target_amount: '750000',
		committed_amount: null,
		valuation: null,
		valuation_amount: null,
		valuation_basis: null,
		valuation_undisclosed: true,
		target_close_date: '2027-03-15',
	},
	{
		...base,
		id: testRaiseId(4),
		is_featured: false,
		company_name: null,
		company_anonymous: true,
		tags: ['SaaS', 'Smart Venues'],
		company_website: null,
		disclosed: false,
		materials_access: 'on_request',
		has_one_pager: true,
		company_hq: 'Madrid, Spain',
		company_description: 'Facility-management software for stadium operators: maintenance, staffing and energy across match days.',
		sector: 'Stadium & Facilities Management',
		round_type: 'series_a',
		currency_code: 'EUR',
		target_amount: '6000000',
		committed_amount: '3500000',
		valuation: '€24M pre-money',
		valuation_amount: '24000000',
		valuation_basis: 'pre_money',
		target_close_date: '2027-02-28',
	},
	{
		...base,
		id: testRaiseId(5),
		is_featured: false,
		company_name: 'Huddle Health',
		tags: ['Mental Fitness', 'Gym Tech'],
		company_hq: 'Dublin, Ireland',
		company_description: 'Guided recovery and injury-prevention programmes for amateur athletes, built with physiotherapists.',
		sector: 'Recovery & Injury Prevention',
		round_type: 'seed',
		currency_code: 'USD',
		target_amount: '1200000',
		committed_amount: '900000',
		valuation: '$8M post-money',
		valuation_amount: '8000000',
		valuation_basis: 'post_money',
		target_close_date: '2026-12-31',
	},
	{
		...base,
		id: testRaiseId(6),
		is_featured: false,
		company_name: 'Fanvault',
		tags: ['Web3', 'Collectibles', 'Rewards'],
		company_hq: 'Austin, United States',
		company_description: 'Web3 membership passes that give fans voting rights and rewards from their club (tagged Web3 for the Avoid test).',
		sector: 'Fan Engagement',
		round_type: 'series_a',
		currency_code: 'USD',
		target_amount: '5000000',
		committed_amount: '1000000',
		valuation: null,
		valuation_amount: null,
		valuation_basis: null,
		valuation_undisclosed: true,
		target_close_date: '2027-04-30',
	},
];

/** The list rows a tab would get, by the API's own tab rules. */
export function testRaisesFor(tab: string | undefined): DealRow[] {
	if (tab === 'featured') return TEST_RAISES.filter((r) => r.is_featured);
	if (tab === 'circle') return TEST_RAISES.filter((r) => r.source === 'circle');
	if (tab === 'verified') return TEST_RAISES.filter((r) => r.source === 'verified_raise');
	return TEST_RAISES;
}
