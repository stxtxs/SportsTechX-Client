'use client';

import { Fragment, useEffect, useSyncExternalStore, type CSSProperties } from 'react';
import { ArrowUpRight, X } from 'lucide-react';
import { ATLAS_LINKS, SOLUTIONS, type SolutionId } from '@/components/landing/atlas-solutions';
import { getAccountType, getUserType, useUserProfile, type AccountType } from '@/hooks/use-user-profile';
import { Events, track } from '@/lib/analytics';
import { PLANS_PATH } from '@/lib/routes';

/**
 * Explore's sidebar prompt: one box above the account row, worded for the
 * viewer's self-declared role (`account_type`).
 *
 * - Role unknown → "Looking for investors or startups?", RAISE · SCOUT.
 * - Founder      → "Looking for investors?", RAISE.
 * - Investor     → "Looking for startups?", SCOUT.
 *
 * Styled like the cards it replaced: white, with the variant's colour fading in
 * from the bottom-right (see FitBoxView).
 *
 * Only Explore members see it (the shell mounts it for the Explore tier only,
 * and this re-checks), so nobody is offered a product they already have. The
 * whole box is the link and opens in a new tab. × hides it for 14 days. It is
 * not rendered on screens under 720px tall. Views, clicks and dismissals are
 * tracked per variant.
 */
export type Variant = 'neutral' | 'raise' | 'scout';

const COLOUR = Object.fromEntries(SOLUTIONS.map((s) => [s.id, s.colour])) as Record<SolutionId, string>;

/** `wash` is the colour fading in from the corner: Explore pink when neutral. */
const COPY: Record<Variant, { label: string; products: SolutionId[]; link: string; href: string; wash: string }> = {
	// atlas.sportstechx.com/plans: relative, since this app is that site.
	neutral: { label: 'Looking for investors or startups?', products: ['raise', 'scout'], link: 'Explore', href: PLANS_PATH, wash: COLOUR.explore },
	raise: { label: 'Looking for investors?', products: ['raise'], link: 'Try Atlas Raise', href: ATLAS_LINKS.founderSandbox, wash: COLOUR.raise },
	scout: { label: 'Looking for startups?', products: ['scout'], link: 'Try Atlas Scout', href: ATLAS_LINKS.investorSandbox, wash: COLOUR.scout },
};

const NAME: Record<SolutionId, string> = Object.fromEntries(SOLUTIONS.map((s) => [s.id, s.name])) as Record<SolutionId, string>;

const VARIANT_BY_ROLE: Record<AccountType, Variant> = { founder: 'raise', investor: 'scout', user: 'neutral' };

const DISMISS_KEY = 'stx:fit-box-dismissed-until';
const DISMISS_DAYS = 14;
const DISMISS_EVENT = 'stx:fit-box-dismissed';
const SHORT_SCREEN = '(max-height: 719px)';

function isHidden(): boolean {
	if (window.matchMedia(SHORT_SCREEN).matches) return true;
	try {
		return Number(localStorage.getItem(DISMISS_KEY) ?? 0) > Date.now();
	} catch {
		return false;
	}
}

function subscribe(onChange: () => void): () => void {
	const mq = window.matchMedia(SHORT_SCREEN);
	mq.addEventListener('change', onChange);
	window.addEventListener(DISMISS_EVENT, onChange);
	window.addEventListener('storage', onChange);
	return () => {
		mq.removeEventListener('change', onChange);
		window.removeEventListener(DISMISS_EVENT, onChange);
		window.removeEventListener('storage', onChange);
	};
}

export function FitBox() {
	const { data: profile } = useUserProfile();
	// Hidden on the server and until the browser is read, so it never flashes
	// in for someone who dismissed it or on a short screen.
	const hidden = useSyncExternalStore(subscribe, isHidden, () => true);
	const variant = VARIANT_BY_ROLE[getAccountType(profile)];
	const visible = !!profile && getUserType(profile) === 'explore' && !hidden;

	useEffect(() => {
		if (visible) track(Events.fitBoxViewed, { variant });
	}, [visible, variant]);

	if (!visible) return null;

	const dismiss = () => {
		try {
			localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 86_400_000));
		} catch {
			// Can't remember it; it comes back next visit.
		}
		track(Events.fitBoxDismissed, { variant });
		window.dispatchEvent(new Event(DISMISS_EVENT));
	};

	return <FitBoxView variant={variant} onOpen={() => track(Events.fitBoxClicked, { variant })} onDismiss={dismiss} />;
}

/**
 * The box itself, without the who-sees-it rules: label, then the product names
 * with the pill beside them (it wraps under them if the row is too narrow).
 * The pill's ::after covers the box, so the whole box opens the link.
 */
export function FitBoxView({ variant, onOpen, onDismiss }: { variant: Variant; onOpen?: () => void; onDismiss: () => void }) {
	const c = COPY[variant];
	return (
		<article className="fit-box" style={{ '--fit': c.wash } as CSSProperties}>
			<p className="atlas-feed-card__body fit-box__label">{c.label}</p>
			<div className="fit-box__row">
				<p className="fit-box__products">
					{c.products.map((id, i) => (
						<Fragment key={id}>
							{i > 0 && <span className="fit-box__dot" aria-hidden> · </span>}
							<span className={`fit-box__product fit-box__product--${id}`}>{NAME[id]}</span>
						</Fragment>
					))}
				</p>
				<a className="fit-box__cta" href={c.href} target="_blank" rel="noopener noreferrer" onClick={onOpen}>
					{c.link} <ArrowUpRight size={10} strokeWidth={1.75} aria-hidden />
				</a>
			</div>
			<button type="button" className="fit-box__close" aria-label="Dismiss" onClick={onDismiss}>
				<X size={14} aria-hidden />
			</button>
		</article>
	);
}
