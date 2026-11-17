import { flushSync } from 'react-dom';

/**
 * The light/dark switch on Atlas, ported from the sportstechx.com landing page
 * toggle (SportsTechX-Landing `components/theme-toggle.tsx`) so both read as
 * one gesture (handover v1 A2, D1): the incoming theme is clipped in through a
 * circle grown from the switch to the furthest corner of the viewport.
 *
 * The geometry goes straight into Web Animations keyframes as pixel values,
 * not through custom properties the ::view-transition tree would have to
 * inherit — that inheritance is the cross-engine weak spot the landing page
 * already worked around. Where View Transitions are missing, or the viewer
 * prefers reduced motion, the theme simply swaps.
 */
type ViewTransition = { ready: Promise<unknown>; finished: Promise<unknown>; updateCallbackDone: Promise<unknown> };
type WithViewTransition = Document & { startViewTransition?: (cb: () => void) => ViewTransition };

const TIMING = { duration: 520, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' };

export function sweepTheme(from: HTMLElement | null, apply: () => void): void {
	if (typeof document === 'undefined') { apply(); return; }
	const doc = document as WithViewTransition;
	const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	if (reduced || typeof doc.startViewTransition !== 'function' || !from) { apply(); return; }

	const box = from.getBoundingClientRect();
	const x = box.left + box.width / 2;
	const y = box.top + box.height / 2;
	const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
	const grow: Keyframe[] = [
		{ clipPath: `circle(0px at ${x}px ${y}px)` },
		{ clipPath: `circle(${radius}px at ${x}px ${y}px)` },
	];

	const root = document.documentElement;
	root.setAttribute('data-theme-sweep', '');
	const done = () => root.removeAttribute('data-theme-sweep');
	// flushSync, not an awaited frame: rAF does not fire while the transition is
	// capturing, which deadlocks the callback until the browser times it out.
	const t = doc.startViewTransition(() => { flushSync(apply); });
	t.ready
		.then(() => root.animate(grow, { ...TIMING, pseudoElement: '::view-transition-new(root)' }).finished)
		// A second toggle mid-flight aborts the running transition.
		.catch(() => {})
		.finally(done);
	t.finished.catch(() => {});
	t.updateCallbackDone.catch(() => {});
}
