'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { cx, PageHead } from '@/components/atlas';
import { getUserType, useUserProfile } from '@/hooks/use-user-profile';
import { hrefOf } from '@/lib/routes';
import './account-tabs.css';

/**
 * The account area's tab strip.
 *
 * Thesis Settings and Subscription used to be nav items pinned to the foot of
 * the sidebar. They are settings rather than places, so they moved here —
 * which means the rail's footer can be the account itself, and the three
 * screens read as one surface instead of three unrelated destinations.
 *
 * Tabs are links to the existing routes rather than panels in one page: all
 * three were already standalone routes, deep-linked from billing redirects,
 * the tier gate and the chat agent, and collapsing them would have broken
 * every one of those.
 */
interface Tab { id: string; label: string }

/** How complete a settings page is (handover v1 §7), shown beside its tabs. */
export function CompletionBadge({ pct }: { pct: number }) {
	return <span className="atlas-acct-pct" aria-label={`${pct}% complete`}><b>{pct}%</b> complete</span>;
}

/**
 * The Account area's frame, identical on all three solutions (handover v1 §4):
 * one fixed "Account" header with no byline, then the tabs
 * Account · Preferences · Scouting thesis (Scout) or Raise settings (Raise) ·
 * Subscription · Credits. A page's own action (e.g. Edit) sits at the right of
 * the tab row, so no page swaps the header for its own title.
 */
export function AccountTabs({ actions }: { actions?: ReactNode } = {}) {
	const { data: profile } = useUserProfile();
	const tier = getUserType(profile);
	const pathname = usePathname();

	const tabs: Tab[] = [{ id: 'account', label: 'Account' }, { id: 'interests', label: 'Preferences' }];
	if (tier === 'raise') tabs.push({ id: 'raise-settings', label: 'Raise settings' });
	if (tier === 'scout') tabs.push({ id: 'thesis', label: 'Scouting thesis' });
	tabs.push({ id: 'billing', label: 'Subscription' }, { id: 'credits', label: 'Credits' });

	return (
		<>
			<PageHead title="Account" />
			<div className="atlas-acct-tabs__row">
				<nav className="atlas-acct-tabs" aria-label="Account sections">
					{tabs.map((t) => {
						const href = hrefOf(t.id);
						const active = pathname === href;
						return (
							<Link
								key={t.id}
								href={href}
								className={cx('atlas-acct-tab', active && 'is-active')}
								aria-current={active ? 'page' : undefined}
							>
								{t.label}
							</Link>
						);
					})}
				</nav>
				{actions && <div className="atlas-acct-tabs__actions">{actions}</div>}
			</div>
		</>
	);
}
