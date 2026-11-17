'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';
import { PLANS_PATH } from '@/lib/routes';

/** Hover text on every lock (handover v1 §4 Access, §5). */
export const LOCK_HOVER = 'Unlocked with Raise or Scout';

/**
 * The one locked marker on Atlas: a lock icon, no word ("Premium", "PRO") and
 * no currency symbol. Hovering shows "Unlocked with Raise or Scout"; clicking
 * opens the Solutions page.
 *
 * `inert` renders a plain span for places that already sit inside a link (a
 * nav item, a card) — a link inside a link is invalid HTML, and the outer link
 * already leads to the locked page, which offers "See solutions".
 */
export function LockMark({ size = 12, inert = false, className }: { size?: number; inert?: boolean; className?: string }) {
	const cls = `atlas-lock${className ? ` ${className}` : ''}`;
	if (inert) {
		return (
			<span className={cls} data-tip={LOCK_HOVER} aria-label={LOCK_HOVER} role="img">
				<Lock size={size} aria-hidden="true" />
			</span>
		);
	}
	return (
		<Link href={PLANS_PATH} className={cls} data-tip={LOCK_HOVER} aria-label={LOCK_HOVER}>
			<Lock size={size} aria-hidden="true" />
		</Link>
	);
}
