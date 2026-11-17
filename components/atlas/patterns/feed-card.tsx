'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, Pin } from 'lucide-react';

/**
 * FeedCard — a home-feed item (Figma "Card" on the Home frame): category tag
 * with icon, title, short body and a black action pill top-right, on the pink
 * glow surface. Lay several out with `.atlas-feed-grid` (two columns).
 *
 * The action always reads "Open": every card on Home opens something, and one
 * word keeps the row consistent. `pin` adds a pin icon beside it (pinned
 * research on Home; clicking it unpins).
 */
export function FeedCard({ id, tag, icon: Icon, title, body, href, onAction, pin, extra }: {
	/** Stable card id (e.g. `setup`), set as `data-card` so the walkthrough can point at it. */
	id?: string;
	tag: string;
	icon?: LucideIcon;
	title: ReactNode;
	body?: ReactNode;
	/** Where the action pill goes. Ignored when `onAction` is given. */
	href?: string;
	/**
	 * Run instead of navigating. Home's "finish your setup" cards open a modal
	 * rather than a page, and their destination is a server-built `cta_href`
	 * string — so the card, not the server, decides which of the two it is.
	 */
	onAction?: () => void;
	/** A pinned card: the pin icon beside "Open", which unpins it. */
	pin?: { label: string; onUnpin: () => void };
	/** Optional slot under the body, e.g. a count badge. */
	extra?: ReactNode;
}) {
	const action = onAction
		? <button type="button" className="atlas-feed-card__action" onClick={onAction}>Open <ArrowUpRight size={12} strokeWidth={1.5} /></button>
		: <Link href={href ?? '#'} className="atlas-feed-card__action">Open <ArrowUpRight size={12} strokeWidth={1.5} /></Link>;
	return (
		<article className="atlas-feed-card" data-card={id}>
			<div className="atlas-feed-card__top">
				<span className="atlas-feed-card__tag">
					{Icon && <Icon size={13} strokeWidth={1.25} aria-hidden="true" />}
					{tag}
				</span>
				{pin ? (
					<span className="atlas-feed-card__actions">
						<button type="button" className="atlas-feed-card__pin" onClick={pin.onUnpin} aria-label={pin.label} title={pin.label}>
							<Pin size={13} strokeWidth={1.5} fill="currentColor" aria-hidden="true" />
						</button>
						{action}
					</span>
				) : action}
			</div>
			<h3 className="atlas-feed-card__title">{title}</h3>
			{body && <p className="atlas-feed-card__body">{body}</p>}
			{extra && <div className="atlas-feed-card__extra">{extra}</div>}
		</article>
	);
}
