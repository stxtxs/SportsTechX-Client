'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { H1, Sub } from '../ui/layout';
import { cx } from '../ui/cx';
import { PlaceholderTag } from './placeholder-tag';
import { LockMark } from './lock-mark';
import { useActiveTabInView } from '../ui/tabs';

export interface HeaderTab { label: string; href: string; active?: boolean; soon?: boolean; placeholder?: boolean; locked?: boolean }

/**
 * TabbedPageHeader — page title + sub-line + link tabs (Figma "Header" + "Tab Bar").
 * Used for nav sections: the section title is the page title and the section's
 * items are the tabs, each its own URL. `soon` tabs render greyed with a SOON pill.
 */
export function TabbedPageHeader({ title, sub, tabs, actions }: {
	title: ReactNode;
	sub?: ReactNode;
	tabs: HeaderTab[];
	/** Right-aligned controls beside the title (e.g. an upload button). */
	actions?: ReactNode;
}) {
	const tabsRef = useActiveTabInView<HTMLElement>(tabs.find((t) => t.active)?.href);
	// When the tabs overflow, they scroll sideways with a fade at the edge that
	// has more, so no tab name looks cut off (Deal Flow 3.4).
	const wrapRef = useRef<HTMLDivElement>(null);
	const [fade, setFade] = useState({ start: false, end: false });
	useEffect(() => {
		const nav = wrapRef.current?.querySelector('nav');
		if (!nav) return;
		const update = () => {
			const start = nav.scrollLeft > 2;
			const end = nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 2;
			setFade((f) => (f.start === start && f.end === end ? f : { start, end }));
		};
		const ro = new ResizeObserver(update);
		ro.observe(nav);
		nav.addEventListener('scroll', update, { passive: true });
		return () => { ro.disconnect(); nav.removeEventListener('scroll', update); };
	}, [tabs.length]);
	return (
		<header className="atlas-tabbed-head">
			<div className="atlas-tabbed-head__top">
				<div><H1>{title}</H1>{sub && <Sub>{sub}</Sub>}</div>
				{actions && <div className="atlas-tabbed-head__actions">{actions}</div>}
			</div>
			{/* A one-item section is just a page — a tab strip with a single tab
			    reads as a mistake (Scout's Watchlists). Show the heading only. */}
			{tabs.length > 1 && <div ref={wrapRef} className={cx('atlas-tabs-wrap', fade.start && 'fade-start', fade.end && 'fade-end')}><nav ref={tabsRef} className="atlas-tabs atlas-tabbed-head__tabs" aria-label={typeof title === 'string' ? `${title} sections` : 'Sections'}>
				{tabs.map((t) => t.soon ? (
					<span key={t.href} className="atlas-tab is-soon" aria-disabled="true">{t.label}<span className="atlas-soon">Soon</span></span>
				) : (
					<Link key={t.href} href={t.href} className={cx('atlas-tab', t.placeholder && 'has-pill', t.active && 'active')} aria-current={t.active ? 'page' : undefined}>{t.label}{t.placeholder && <PlaceholderTag short={!t.active} />}{t.locked && <LockMark inert size={11} className="atlas-tab__lock" />}</Link>
				))}
			</nav></div>}
		</header>
	);
}
