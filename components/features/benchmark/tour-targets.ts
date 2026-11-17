'use client';

import { useEffect, useState, type RefObject } from 'react';
import { hrefOf } from '@/lib/routes';
import { placeCard, unionBox, type Box } from './tour-layout';

/**
 * What each walkthrough step points at, found in the live page, and where its
 * card sits beside it. A step whose target isn't on screen (the sidebar is a
 * closed drawer on phones and tablets) shows its card centred instead.
 */
export type Finder = () => Element[];

const all = (selector: string): Element[] => [...document.querySelectorAll(selector)];
const pathOf = (id: string): string | null => { try { return hrefOf(id); } catch { return null; } };

const isShown = (el: Element): boolean => {
	const r = el.getBoundingClientRect();
	return r.width > 0 && r.height > 0 && r.right > 0 && r.left < window.innerWidth;
};

/** A sidebar link by route id. */
export const navLink = (id: string): Finder => () => {
	const path = pathOf(id);
	return path ? all(`.atlas-rail a.atlas-nav-item[href="${path}"]`) : [];
};

/** Sidebar sections by title (all of those present). */
export const navSection = (...titles: string[]): Finder => () =>
	all('.atlas-rail .atlas-nav-section').filter((s) => titles.includes(s.querySelector('.atlas-nav-section__head span')?.textContent?.trim() ?? ''));

export const css = (selector: string): Finder => () => all(selector);

/** Everything several finders turn up, highlighted together. Empty unless all of them find something. */
export const both = (...finders: Finder[]): Finder => () => {
	const found = finders.map((find) => find().filter(isShown));
	return found.every((f) => f.length > 0) ? found.flat() : [];
};

/** The first finder that turns up something visible. */
export const firstOf = (...finders: Finder[]): Finder => () => {
	for (const find of finders) {
		const shown = find().filter(isShown);
		if (shown.length > 0) return shown;
	}
	return [];
};

export interface TourLayout {
	/** One highlight per element; empty = nothing to point at, card centred. */
	boxes: Box[];
	card: { top: number; left: number } | null;
}

const CENTRED: TourLayout = { boxes: [], card: null };
const NOTHING: Finder = () => [];

/** Tracks the step's targets through scrolling, resizing and layout changes. */
export function useTourLayout(open: boolean, target: Finder | null, cardRef: RefObject<HTMLElement | null>): TourLayout {
	const [layout, setLayout] = useState<TourLayout>(CENTRED);
	const find = target ?? NOTHING;

	useEffect(() => {
		if (!open) return;
		let frame = 0;
		const measure = () => {
			frame = 0;
			const boxes = find().filter(isShown).map((e) => {
				const r = e.getBoundingClientRect();
				return { top: r.top, left: r.left, width: r.width, height: r.height };
			});
			const all = unionBox(boxes);
			const card = cardRef.current;
			const next: TourLayout = !all || !card ? CENTRED : {
				boxes,
				card: placeCard(all, { width: card.offsetWidth, height: card.offsetHeight }, { width: window.innerWidth, height: window.innerHeight }),
			};
			// Skip the render when nothing moved (the observers fire often).
			setLayout((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
		};
		const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
		// Bring the target into view before measuring it (a scrolled sidebar, a section below the fold).
		find().filter(isShown)[0]?.scrollIntoView({ block: 'nearest' });
		schedule();
		const ro = new ResizeObserver(schedule);
		if (cardRef.current) ro.observe(cardRef.current);
		window.addEventListener('resize', schedule);
		document.addEventListener('scroll', schedule, { capture: true, passive: true });
		// The sidebar and Home load after the tour opens; follow them as they settle.
		const mo = new MutationObserver(schedule);
		mo.observe(document.body, { childList: true, subtree: true });
		return () => {
			ro.disconnect();
			mo.disconnect();
			window.removeEventListener('resize', schedule);
			document.removeEventListener('scroll', schedule, { capture: true });
			if (frame) cancelAnimationFrame(frame);
		};
	}, [open, find, cardRef]);

	return open ? layout : CENTRED;
}
