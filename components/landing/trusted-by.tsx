'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { SiteItem } from '@/lib/site-content';

/* eslint-disable @next/next/no-img-element */

/**
 * Trusted by, in the sportstechx.com format: a left-aligned Bebas title over an
 * uppercase subtitle, then two rows of partner cards drifting in opposite
 * directions, with a hairline before every card and a soft fade at each edge.
 * Below four partners the second row would just repeat the first, so only one
 * row shows.
 *
 * Each row is a pure-CSS marquee (translateX 0 → -50% on a track that renders
 * the list twice). The arrows shift the animation's phase via a negative
 * `animation-delay`, so stepping keeps the drift running rather than fighting
 * it. Hover pauses; reduced-motion stops it.
 *
 * Photos: each card paints `url(...) , <gradient>`. If the photo is missing the
 * gradient underneath still shows, with no broken image icon.
 */
interface Card {
	img: string;
	tone: string;
	name: string;
	title: string;
	logoUrl: string | null;
	logoText: string;
}

/* Shown until an admin puts real cards in this section (Site assets → Atlas →
   Carousel gallery). One uploaded card replaces ALL of these, not just one. */
const TONES = [
	'linear-gradient(160deg,#8d7f6f,#332c26)',
	'linear-gradient(160deg,#9a6f56,#31241d)',
	'linear-gradient(160deg,#7e8a93,#282e33)',
	'linear-gradient(160deg,#8a7a86,#2c262c)',
	'linear-gradient(160deg,#6f8479,#242b28)',
	'linear-gradient(160deg,#94816b,#302a24)',
];
const PLACEHOLDER_PARTNERS: Card[] = TONES.map((tone, i) => ({
	img: `/landing/partner-${i + 1}.jpg`,
	tone,
	name: 'Alexander Janssen',
	title: 'CEO, Dutch SportsTech Fund',
	logoUrl: null,
	logoText: 'BCG',
}));

/** Desktop stride (card 210 + hairline + 2 × 37 gap); replaced by a measurement. */
const DEFAULT_STRIDE = 285;
/** ≈50px per second, the rate all three sites run at. */
const SPEED = 50;

/** The second row is the same people rotated by half, so it reads as a different rail. */
function rotate(cards: Card[]): Card[] | null {
	if (cards.length < 4) return null;
	const half = Math.floor(cards.length / 2);
	return [...cards.slice(half), ...cards.slice(0, half)];
}

export function TrustedBy({ items }: { items?: SiteItem[] }) {
	const usingCms = Boolean(items?.length);
	const partners: Card[] = items?.length
		? items.map((it, i) => ({
			img: it.url ?? '',
			tone: TONES[i % TONES.length],
			name: it.title ?? '',
			title: it.subtitle ?? '',
			logoUrl: it.logoUrl,
			logoText: '',
		}))
		: PLACEHOLDER_PARTNERS;
	const second = rotate(partners);

	return (
		<section className="lp-cream lp-trusted" id="trusted">
			<div className="lp-inner">
				<div className="lp-trusted-head">
					<h2>Trusted by</h2>
					<p>Founders, investors, sports organisations</p>
				</div>
			</div>

			<div className="lp-trusted-rows">
				<Rail cards={partners} direction="ltr" alwaysLoop={!usingCms} label="Trusted by, row 1" />
				{second && <Rail cards={second} direction="rtl" alwaysLoop={!usingCms} label="Trusted by, row 2" />}
			</div>
		</section>
	);
}

function Rail({
	cards: partners,
	direction,
	alwaysLoop,
	label,
}: {
	cards: Card[];
	direction: 'ltr' | 'rtl';
	/** The built-in placeholders are the designed full rail, so they always drift. */
	alwaysLoop: boolean;
	label: string;
}) {
	const [phase, setPhase] = useState(0); // seconds into the loop

	/* Whether the cards already fill the rail decides everything below, and only
	   the browser knows it. Starts at 0 so the server and the first client render
	   agree (no hydration mismatch). The stride is measured too, since the card
	   size changes with the viewport. */
	const viewport = useRef<HTMLDivElement | null>(null);
	const track = useRef<HTMLDivElement | null>(null);
	const [railW, setRailW] = useState(0);
	const [stride, setStride] = useState(DEFAULT_STRIDE);
	useEffect(() => {
		const el = viewport.current;
		if (!el) return;
		const measure = () => {
			setRailW(el.clientWidth);
			const first = track.current?.firstElementChild as HTMLElement | null;
			if (first?.offsetWidth) setStride(first.offsetWidth);
		};
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	/* A short list of uploaded cards should not scroll: everything is already
	   visible. "Fits" means room for another whole card, not just a squeeze. */
	const naturalW = partners.length * stride;
	const measured = railW > 0;
	const fits = measured && railW - naturalW >= stride;
	const looping = alwaysLoop || (measured && !fits);

	/* The marquee wraps by exactly one copy, so that copy has to be at least as
	   wide as the rail or the rail runs out of cards and snaps; repeat until it is. */
	const reps = looping ? Math.max(1, Math.ceil((railW || naturalW) / naturalW)) : 1;
	const copy = reps === 1 ? partners : Array.from({ length: reps }, () => partners).flat();
	const copyW = copy.length * stride;
	const duration = copyW / SPEED;
	// One arrow press is always one card, however often the list was repeated.
	const step = (stride / copyW) * duration;
	// Arrows move the cards the way they point, whichever way the row drifts.
	const sign = direction === 'ltr' ? -1 : 1;
	const shift = (dir: number) => setPhase((p) => (p + sign * dir * step + duration) % duration);

	const cards = looping ? [...copy, ...copy] : partners;

	return (
		<div className="lp-carousel" role="region" aria-label={label}>
			{looping && (
				<button className="lp-carousel-arrow lp-carousel-arrow--prev" aria-label="Previous partners" onClick={() => shift(-1)}>
					<ChevronLeft size={30} strokeWidth={1.5} />
				</button>
			)}

			<div className="lp-carousel-viewport" ref={viewport}>
				<div
					ref={track}
					className={`lp-carousel-marquee${looping ? '' : ' is-static'}${direction === 'ltr' ? ' is-ltr' : ''}`}
					style={looping ? { animationDuration: `${duration}s`, animationDelay: `${-phase}s` } : undefined}
				>
					{cards.map((p, i) => (
						<div className="lp-partner" key={i} aria-hidden={i >= partners.length}>
							<div className="lp-partner-photo" style={{ background: photoBg(p.img, p.tone) }}>
								{/* The company mark at the middle bottom of the photo. An
								    uploaded logo replaces the wordmark; with neither, the slot
								    stays empty rather than showing stale branding. */}
								{p.logoUrl
									? <img className="lp-partner-logo lp-partner-logo--img" src={p.logoUrl} alt="" />
									: p.logoText ? <span className="lp-partner-logo">{p.logoText}</span> : null}
							</div>
							<div className="lp-partner-name">{p.name}</div>
							<div className="lp-partner-title">{p.title}</div>
						</div>
					))}
				</div>
			</div>

			{looping && (
				<button className="lp-carousel-arrow lp-carousel-arrow--next" aria-label="Next partners" onClick={() => shift(1)}>
					<ChevronRight size={30} strokeWidth={1.5} />
				</button>
			)}
		</div>
	);
}

/**
 * `url('') , <gradient>` is valid CSS and the gradient does show, but an empty
 * URL resolves against the document base, so the browser issues a real GET for
 * the page itself, per card. Omit the layer instead.
 */
export function photoBg(img: string, tone: string): string {
	return img ? `url('${img}') center/cover no-repeat, ${tone}` : tone;
}
