'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import './announcement-bar.css';

/**
 * The site-wide announcement, the same one sportstechx.com and Playmakers show
 * (landing: components/announcement-bar.tsx, lib/content.ts `announcement`).
 * Give the next announcement a new `id` and it shows again, even to people who
 * closed this one; set it to null to switch the banner off.
 */
export const announcement: { id: string; label: string; text: string; cta: string; href: string } | null = {
	id: 'football-tech-business-report-2026',
	label: 'New Report Alert!',
	text: 'Our Football Tech & Business Report 2026 is out now.',
	cta: 'Access Now →',
	href: '/reports/ftabr26',
};

/** Where a closed announcement is remembered: the id of the one closed. A
 *  per-device display preference, like the theme (see no-browser-only rule's
 *  device-only list); signed-out visitors have no account to store it on. */
const KEY = 'stx-announcement-closed';
/** Set on <html> while no banner shows; the CSS keys off it. */
const OFF = 'data-announce-off';

/** Runs in <head> before paint, so a visitor who closed it never sees it flash in. */
export const ANNOUNCE_PREPAINT = announcement
	? `(function(){try{if(/[?&]pdf=true(&|$)/.test(location.search)||localStorage.getItem(${JSON.stringify(KEY)})===${JSON.stringify(announcement.id)})document.documentElement.setAttribute(${JSON.stringify(OFF)},'')}catch(e){}})();`
	: `document.documentElement.setAttribute(${JSON.stringify(OFF)},'');`;

/**
 * The banner across the top of every Atlas page until the visitor closes it.
 *
 * `root` (app/layout.tsx): at the very top of pages without the app shell. It
 * keeps two vars on <html> for things pinned to the viewport top (the landing
 * nav, the auth theme toggle, the benchmark report menu): `--announce-h` (its
 * height) and `--announce-vis` (how much of it is still on screen as the page
 * scrolls). Hidden by CSS on pages that render the shell.
 * `page` (landing MobileMenuShell): inside the sliding landing page, so it moves
 * with the page when the mobile drawer opens (as on sportstechx.com); the root
 * copy is hidden there.
 * `shell` (AtlasShell): inside the app's main column, under the phone top bar
 * and above the navbar, so it never adds to the shell's full-height layout.
 */
export function AnnouncementBar({ placement = 'root' }: { placement?: 'root' | 'page' | 'shell' }) {
	const ref = useRef<HTMLDivElement>(null);
	const pathname = usePathname();
	const [closed, setClosed] = useState(false);
	// The admin editor's preview frame shows the report alone, and the page
	// the announcement points to doesn't advertise itself.
	const onTarget = !!announcement && (pathname === announcement.href || !!pathname?.startsWith(`${announcement.href}/`));
	const hidden = !announcement || closed || onTarget || pathname?.startsWith('/report-preview');

	useEffect(() => {
		const el = ref.current;
		if (placement === 'shell') return;
		const root = document.documentElement;
		// Hidden here (e.g. arrived on the report by client-side navigation):
		// zero the vars so nothing pinned to the top keeps a gap for it.
		if (!el) { root.style.setProperty('--announce-h', '0px'); root.style.setProperty('--announce-vis', '0px'); return; }
		let frame = 0;
		const sync = () => {
			frame = 0;
			// A copy hidden by CSS (the root one on landing / shell pages) has no boxes: leave the vars to the one showing.
			if (!root.hasAttribute(OFF) && el.getClientRects().length === 0) return;
			const h = root.hasAttribute(OFF) ? 0 : el.offsetHeight;
			root.style.setProperty('--announce-h', `${h}px`);
			// From its own box, not window.scrollY: on most pages <body> is the scroller, not the window.
			root.style.setProperty('--announce-vis', `${h ? Math.max(0, Math.min(h, el.getBoundingClientRect().bottom)) : 0}px`);
		};
		const onScroll = () => { if (!frame) frame = requestAnimationFrame(sync); };
		sync();
		const ro = new ResizeObserver(sync);
		ro.observe(el);
		document.addEventListener('scroll', onScroll, { capture: true, passive: true });
		return () => { ro.disconnect(); document.removeEventListener('scroll', onScroll, { capture: true }); if (frame) cancelAnimationFrame(frame); };
	}, [placement, hidden]);

	if (hidden) return null;

	const close = () => {
		try { localStorage.setItem(KEY, announcement!.id); } catch { /* storage blocked: closed for this page view */ }
		const root = document.documentElement;
		root.setAttribute(OFF, '');
		root.style.setProperty('--announce-h', '0px');
		root.style.setProperty('--announce-vis', '0px');
		// The landing nav docks on scroll position; tell it the top just moved.
		window.dispatchEvent(new Event('scroll'));
		setClosed(true);
	};

	return (
		<div ref={ref} role="region" aria-label="Announcement" className={`announce announce--${placement}`}>
			<div className="announce__inner">
				<p className="announce__text">
					<strong>{announcement!.label}</strong> {announcement!.text}
				</p>
				<a href={announcement!.href} className="announce__cta">{announcement!.cta}</a>
			</div>
			<button type="button" onClick={close} aria-label="Close announcement" className="announce__close">
				<X size={18} aria-hidden />
			</button>
		</div>
	);
}
