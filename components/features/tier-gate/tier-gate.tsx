'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';
import type { Tier } from '@/lib/access';
import { PLANS_PATH } from '@/lib/routes';
import './tier-gate.css';

/**
 * What a user sees when they open a page belonging to a product they don't have.
 *
 * Generalised from `InvestorsUpsell`, which was the same screen hand-built for
 * one feature. Same markup, same Atlas classes — it just takes the feature it
 * is standing in for, so every gated route gets one instead of none.
 *
 * Only reached by an Explore user. Someone on the *other* paid tier gets a 404
 * instead: Raise and Scout are sibling products, so there is no sale to make
 * and no reason to advertise a page they would have to switch plans to reach.
 * See `lib/access.ts`.
 *
 * Copy is assembled from strings that were already approved — the sidebar
 * upgrade cards and the billing page — rather than invented for this screen.
 */

export const PRODUCT: Record<Exclude<Tier, 'explore'>, {
	name: string;
	/** One line on what the product is for — from the sidebar upgrade cards. */
	tagline: string;
	blurb: string;
	points: [string, string][];
}> = {
	raise: {
		name: 'Atlas Raise',
		tagline: 'Investor targeting for founders raising capital.',
		blurb: 'Atlas Raise helps founders sharpen the pitch, identify investors who are actually active in their category, and run the process end to end — investor intelligence, warm-intro paths and outreach tracking in one place.',
		points: [
			['Active investors', 'Funds, corporates and angels with a disclosed sports tech deal since 2020.'],
			['Screen by thesis', 'Filter by sector, stage, cheque size and geography, then save the screen.'],
			['Deal history', 'Every round each investor has participated in, with co-investors and dates.'],
		],
	},
	scout: {
		name: 'Atlas Scout',
		tagline: 'Deal flow and screening for scouts: investors, accelerators and corporates.',
		blurb: 'Atlas Scout helps investors see what is raising in sports tech, screen it against their own thesis, and track the companies worth following — deal flow, verified raises and deck screening in one place.',
		points: [
			['Matched to your thesis', 'Companies scored against the sectors, stages, geographies and cheque size you invest in.'],
			['Verified raises', 'Live rounds confirmed by SportsTechX, including opportunities shared by the Investor Circle.'],
			['Deck screening', 'Upload a deck and get a structured read: strengths, diligence flags and gaps to probe.'],
		],
	},
};

/**
 * Locked-state copy, handover v1 §5. A page both paid solutions include says
 * "Raise or Scout"; a Raise-only page names Atlas Raise.
 */
export function lockedLine(tier: Exclude<Tier, 'explore'>, shared: boolean): string {
	return shared ? 'Available with Raise or Scout.' : `Available with ${PRODUCT[tier].name}.`;
}

export function TierGate({ tier, shared = false }: {
	/** The product that owns the page being gated (the first, if both do). */
	tier: Exclude<Tier, 'explore'>;
	/** True when Raise and Scout both include the page. */
	shared?: boolean;
	/** @deprecated The lock line no longer names the screen. */
	feature?: string;
}) {
	return (
		<div className="tier-gate">
			<section className="atlas-card tier-gate__main">
				<span className="tier-gate__lock"><Lock size={12} aria-hidden="true" /></span>
				<h2 className="tier-gate__title">{lockedLine(tier, shared)}</h2>
				<div className="tier-gate__cta">
					<Link href={PLANS_PATH} className="atlas-btn atlas-btn--primary">See solutions</Link>
				</div>
			</section>
		</div>
	);
}
