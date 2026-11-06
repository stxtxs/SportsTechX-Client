'use client';

import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { MobileMenuButton, useMobileMenu } from '@/components/landing/mobile-menu';
import { ATLAS_LINKS, SOLUTIONS, selectSolution } from '@/components/landing/atlas-solutions';

const subscribe = (onChange: () => void) => {
	window.addEventListener('scroll', onChange, { passive: true });
	return () => window.removeEventListener('scroll', onChange);
};

/**
 * True once the page has moved far enough to dock the bar.
 *
 * A dead band rather than a single threshold: parking exactly on one number
 * makes the bar flicker between states on every sub-pixel scroll. Docking at 24
 * and releasing at 8 gives it somewhere to settle (as Playmakers does).
 */
let docked = false;
const isScrolled = () => {
	const y = window.scrollY;
	if (y > 24) docked = true;
	else if (y < 8) docked = false;
	return docked;
};

/**
 * The Atlas header, matching sportstechx.com and Playmakers: it rests 16/24px
 * down and docks into a full-width glass band once the page scrolls.
 *
 * Left: the Atlas wordmark (this site's home link) with "BY SPORTSTECHX"
 * stacked underneath, the way back to sportstechx.com. Right: a pill with
 * SOLUTIONS (hover or focus opens a drop-down of the three solutions), PRICING
 * and FAQ, then LOG IN.
 */
export function LandingNav() {
	const { open: drawerOpen, lockedY } = useMobileMenu();
	const [menu, setMenu] = useState(false);
	// useSyncExternalStore, not useState + useEffect: it reports the right value
	// on the FIRST client render, so reloading halfway down the page shows the
	// docked bar instead of flashing the transparent one.
	const scrolled = useSyncExternalStore(subscribe, isScrolled, () => false);

	return (
		<nav
			// While the drawer is out the shell is transformed, and a transformed
			// ancestor becomes the containing block for `fixed` children: anchor
			// the bar to the captured offset instead. `top` is never transitioned
			// (see .lp-nav), or opening the drawer would send the bar gliding.
			style={drawerOpen ? { top: lockedY } : undefined}
			className={`lp-nav${scrolled && !drawerOpen ? ' is-scrolled' : ''}${drawerOpen ? ' is-drawer' : ''}`}
			aria-label="Primary"
		>
			<div className="lp-nav-inner">
				{/* First, not last: the page slides right when the drawer opens, so
				    anything on the trailing edge would travel off-screen with it. */}
				<MobileMenuButton />

				<div className="lp-lockup">
					<Link
						href="/"
						className="lp-nav-mark"
						aria-label="Atlas home"
						onClick={(e) => {
							// Already home (maybe at /#faq): back to the hero, and drop the hash.
							if (location.pathname !== '/') return;
							e.preventDefault();
							history.replaceState(null, '', '/');
							window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
						}}
					>
						{/* eslint-disable-next-line @next/next/no-img-element -- SVG; next/image does not optimise it */}
						<img src="/landing/atlas-wordmark-white.svg" alt="Atlas" />
					</Link>
					<a className="lp-lockup-by" href={ATLAS_LINKS.stxHome} target="_blank" rel="noreferrer">
						BY SPORTSTECHX ↗
					</a>
				</div>

				<div className="lp-nav-right">
					<div
						className="lp-nav-links"
						onMouseLeave={() => setMenu(false)}
						onBlur={(e) => {
							if (!e.currentTarget.contains(e.relatedTarget as Node)) setMenu(false);
						}}
						onKeyDown={(e) => {
							if (e.key === 'Escape') setMenu(false);
						}}
					>
						<Link
							className={`lp-nav-link${menu ? ' is-open' : ''}`}
							href="/#solutions"
							aria-expanded={menu}
							aria-haspopup="true"
							onMouseEnter={() => setMenu(true)}
							onFocus={() => setMenu(true)}
						>
							SOLUTIONS <span aria-hidden className="lp-nav-caret">▾</span>
						</Link>
						<Link className="lp-nav-link" href="/#pricing" onMouseEnter={() => setMenu(false)} onFocus={() => setMenu(false)}>
							PRICING
						</Link>
						<Link className="lp-nav-link" href="/#faq" onMouseEnter={() => setMenu(false)} onFocus={() => setMenu(false)}>
							FAQ
						</Link>

						{/* The wrapper's top padding bridges the gap to the pill, so the
						    pointer can travel down to the card without closing it. */}
						<div className={`lp-nav-menu${menu ? ' is-open' : ''}`}>
							<div className="lp-nav-menu-card">
								{SOLUTIONS.map((s) => (
									<Link
										key={s.id}
										className="lp-nav-menu-item"
										href="/#solutions"
										tabIndex={menu ? 0 : -1}
										onClick={(e) => {
											selectSolution(s.id, e);
											setMenu(false);
										}}
									>
										<span className="lp-nav-menu-aud">{s.menuAudience}</span>
										<span className="lp-nav-menu-name">
											Atlas <em style={{ color: s.colour }}>{s.name}</em>
										</span>
										<span className="lp-nav-menu-promise">{s.menuPromise}</span>
									</Link>
								))}
							</div>
						</div>
					</div>

					<Link className="lp-nav-login" href={ATLAS_LINKS.login}>
						LOG IN
					</Link>
				</div>
			</div>
		</nav>
	);
}
