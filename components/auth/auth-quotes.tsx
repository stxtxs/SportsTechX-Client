'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { PLACEHOLDER_QUOTES, quoted, type Quote } from '@/lib/testimonial-quotes';
import { SOLUTIONS, type Solution } from '@/components/landing/atlas-solutions';
import { AtlasLogo } from '@/components/atlas';

/**
 * The left panel shared by sign-in and sign-up, mounted once by the `(split)`
 * layout so it stays put when moving between the two.
 *
 * Top: the landing hero's three lines (login), or the same lines each pointing
 * to its product lockup (signup), at a fixed distance from the top so nothing
 * below can push them. Under them, a horizontal auto-scrolling testimonial
 * carousel (as tall as its longest quote, loops seamlessly, no controls). The
 * Atlas brand lockup lives on the form (right), not here.
 *
 * Testimonials read the same admin-managed section the Atlas landing does (Site
 * assets → Atlas → Testimonials). The CMS call goes straight to the public
 * endpoint from the browser (next.config rewrites /api/* to the backend, no
 * session). Any failure keeps the built-in set; the panel never blocks auth.
 */
interface SiteItem { url: string | null; title: string | null; subtitle: string | null; body: string | null }

export function AuthSidePanel() {
	const mode = usePathname()?.startsWith('/signup') ? 'signup' : 'login';
	return (
		<aside className="auth-panel auth-panel--side">
			{mode === 'signup' ? (
				<h2 className="auth-panel__tagline auth-panel__tagline--products">
					{SOLUTIONS.map((s) => (
						<span key={s.id} className="auth-pline">
							<HeroLine s={s} />
							{/* An icon, not the "→" glyph: the glyph is set in Satoshi Regular,
							    which arrives after first paint and swapped the arrow visibly. */}
							<ArrowRight className="auth-pline__arrow" aria-hidden strokeWidth={1.75} />

							<ProductLockup s={s} />
						</span>
					))}
				</h2>
			) : (
				<h2 className="auth-panel__tagline">
					{SOLUTIONS.map((s) => (
						<span key={s.id} className="auth-panel__line"><HeroLine s={s} /></span>
					))}
				</h2>
			)}
			<div className="auth-panel__mid">
				<AuthTestimonials />
			</div>
		</aside>
	);
}

/** One of the landing hero's lines; the full stop takes the product colour. */
function HeroLine({ s }: { s: Solution }) {
	return (
		<span className="auth-pline__text">
			{s.heroLine}
			<span style={{ color: s.colour }}>.</span>
		</span>
	);
}

/** "Atlas EXPLORE": the shared lockup, as everywhere else in the product. */
function ProductLockup({ s }: { s: Solution }) {
	return <AtlasLogo height={28} product={s.name} />;
}

/**
 * Horizontal auto-scrolling carousel. The track renders the list twice and
 * animates translateX from 0 to -50%, so copy two sits exactly where copy one
 * began when the loop restarts — no visible jump. `prefers-reduced-motion`
 * drops the animation.
 *
 * It stays invisible until the CMS quotes arrive (or the fallback set takes
 * over), then fades in once, so the built-in quotes never flash and get swapped.
 * The result is kept for the rest of the visit.
 */
const FALLBACK_AFTER_MS = 2500;
let cachedQuotes: Quote[] | null = null;

export function AuthTestimonials() {
	const [loaded, setLoaded] = useState<Quote[] | null>(() => cachedQuotes);

	useEffect(() => {
		if (cachedQuotes) return;
		const ac = new AbortController();
		const settle = (q: Quote[]) => {
			cachedQuotes = q;
			setLoaded(q);
		};
		// A slow CMS should not leave an empty panel.
		const timer = setTimeout(() => setLoaded((cur) => cur ?? PLACEHOLDER_QUOTES), FALLBACK_AFTER_MS);
		fetch('/api/public/site-content?site=atlas', { signal: ac.signal })
			.then((r) => (r.ok ? r.json() : null))
			.then((json: { sections?: { testimonials?: SiteItem[] } } | null) => {
				const items = json?.sections?.testimonials;
				settle(items?.length
					? items.map((it) => ({
						quote: quoted(it.body ?? ''),
						name: it.title ?? '',
						role: it.subtitle ?? '',
						img: it.url ?? '',
					}))
					: PLACEHOLDER_QUOTES);
			})
			.catch((err: unknown) => {
				if ((err as Error)?.name !== 'AbortError') settle(PLACEHOLDER_QUOTES);
			})
			.finally(() => clearTimeout(timer));
		return () => {
			clearTimeout(timer);
			ac.abort();
		};
	}, []);

	const quotes = loaded ?? PLACEHOLDER_QUOTES;
	if (!quotes.length) return null;
	// ~6s on screen per card keeps the speed constant however many there are.
	const duration = `${quotes.length * 6}s`;
	const cards = (clone: boolean) =>
		quotes.map((q, n) => <QuoteCard key={`${clone ? 'b' : 'a'}-${n}`} q={q} clone={clone} />);

	return (
		<div className={`auth-tcarousel${loaded ? ' is-ready' : ''}`} aria-label="What members say" aria-busy={!loaded}>
			<div className="auth-tcarousel__track" style={{ animationDuration: duration }}>
				{cards(false)}
				{cards(true)}
			</div>
		</div>
	);
}

function QuoteCard({ q, clone }: { q: Quote; clone?: boolean }) {
	return (
		<figure className="auth-tcard" aria-hidden={clone || undefined}>
			<blockquote className="auth-tcard__quote">{q.quote}</blockquote>
			<figcaption className="auth-tcard__by">
				{q.img && (
					// eslint-disable-next-line @next/next/no-img-element -- CMS URL or static file; 38px, no next/image gain.
					<img src={q.img} alt="" className="auth-tcard__img" />
				)}
				<span className="auth-tcard__who">
					<span className="auth-tcard__name">{q.name}</span>
					{q.role && <span className="auth-tcard__role">{q.role}</span>}
				</span>
			</figcaption>
		</figure>
	);
}
