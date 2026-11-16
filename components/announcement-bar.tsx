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
	cta: 'Access on Atlas →',
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
	? `(function(){try{if(localStorage.getItem(${JSON.stringify(KEY)})===${JSON.stringify(announcement.id)})document.documentElement.setAttribute(${JSON.stringify(OFF)},'')}catch(e){}})();`
	: `document.documentElement.setAttribute(${JSON.stringify(OFF)},'');`;

/**
 * The banner across the top of every Atlas page until the visitor closes it.
 *
 * `root` (app/layout.tsx): at the very top of pages without the app shell. It
 * keeps two vars on <html> for things pinned to the viewport top (the landing
 * nav, the auth theme toggle, the benchmark report menu): `--announce-h` (its
 * height) and `--announce-vis` (how much of it is still on screen as the page
 * scrolls). Hidden by CSS on pages that render the shell.
 * `shell` (AtlasShell): inside the app's main column, under the phone top bar
 * and above the navbar, so it never adds to the shell's full-height layout.
 */
export function AnnouncementBar({ placement = 'root' }: { placement?: 'root' | 'shell' }) {
	const ref = useRef<HTMLDivElement>(null);
	const pathname = usePathname();
	const [closed, setClosed] = useState(false);
	// The admin editor's preview frame shows the report alone.
	const hidden = !announcement || closed || pathname?.startsWith('/report-preview');

	useEffect(() => {
		const el = ref.current;
		if (placement !== 'root' || !el) return;
		const root = document.documentElement;
		let frame = 0;
		const sync = () => {
			frame = 0;
			const h = root.hasAttribute(OFF) ? 0 : el.offsetHeight;
			root.style.setProperty('--announce-h', `${h}px`);
			root.style.setProperty('--announce-vis', `${Math.max(0, h - window.scrollY)}px`);
		};
		const onScroll = () => { if (!frame) frame = requestAnimationFrame(sync); };
		sync();
		const ro = new ResizeObserver(sync);
		ro.observe(el);
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => { ro.disconnect(); window.removeEventListener('scroll', onScroll); if (frame) cancelAnimationFrame(frame); };
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
