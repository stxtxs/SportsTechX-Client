'use client';

/* eslint-disable @next/next/no-img-element */
import { ATLAS_LINKS, SOLUTIONS, selectSolution } from '@/components/landing/atlas-solutions';

/** Hero counters. The first three follow sportstechx.com. */
const STATS: [string, string][] = [
	['10,000+', 'Companies Tracked'],
	['2,500+', 'Investors Mapped'],
	['$130B+', 'Deal Flow Tracked'],
	['8,000+', 'Deals Tracked'],
];

/**
 * Intro hero, compact (about half its old height).
 *
 * The background is the original Figma composition, unchanged: the pink wash,
 * the concentric rings and the two ellipses, positioned in % of `.lp-hero-bg`.
 * Do not substitute CSS shapes for these assets.
 *
 * Content: the gradient wordmark, a byline, three headline lines (each opens
 * its solution's card; the full stop takes that solution's colour),
 * two CTAs and a counter row.
 */
export function IntroHero() {
	return (
		<header className="lp-hero lp-hero--intro lp-hero--compact" id="top">
			<div className="lp-hero-grad" aria-hidden />
			<div className="lp-hero-bg" aria-hidden>
				<img className="lp-hero-orb lp-hero-rings" src="/landing/hero-rings.svg" alt="" />
				{/* Ellipse 2 — radial pink */}
				<img className="lp-hero-orb" src="/landing/hero-ellipse-1.svg" alt=""
					style={{ left: '-61.640%', top: '56.802%', width: '103.902%', height: '156.008%', transform: 'rotate(-25.65deg)' }} />
				{/* Ellipse 3 — linear dark, on top */}
				<img className="lp-hero-orb" src="/landing/hero-ellipse-2.svg" alt=""
					style={{ left: '-61.640%', top: '56.802%', width: '103.902%', height: '156.008%', transform: 'rotate(144.3deg)' }} />
			</div>

			<div className="lp-hero-inner lp-hero-inner--compact">
				<img className="lp-hero-wordmark lp-hero-wordmark--compact" src="/landing/atlas-wordmark.svg" alt="Atlas" />
				<p className="lp-hero-byline">Your insider guide to sports tech &amp; venture</p>

				<h1 className="lp-display lp-hero-lines">
					{SOLUTIONS.map((s) => (
						<a key={s.id} className="lp-hero-line" href="#solutions" onClick={(e) => selectSolution(s.id, e)}>
							{s.heroLine}
							<span style={{ color: s.colour }}>.</span>
						</a>
					))}
				</h1>

				<div className="lp-hero-ctas">
					<a className="lp-btn lp-btn--pink" href="#solutions">Explore solutions</a>
					<a className="lp-btn lp-btn--outline" href={ATLAS_LINKS.bookDemo} target="_blank" rel="noreferrer">
						Book a demo
					</a>
				</div>

				<dl className="lp-hero-stats">
					{STATS.map(([value, label]) => (
						<div key={label} className="lp-hero-stat">
							<dt>{label}</dt>
							<dd>{value}</dd>
						</div>
					))}
				</dl>
			</div>
		</header>
	);
}
