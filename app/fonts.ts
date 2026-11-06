import localFont from 'next/font/local';

/**
 * Landing / legal fonts, declared once and shared.
 *
 * Self-hosted (next/font/local), NOT next/font/google. The Google loader fetches
 * the font files from fonts.gstatic.com at build time, and when that fetch flakes
 * on a cold Vercel build the whole deploy fails with a font module-not-found —
 * which it did, repeatedly. The latin woff2s live in ./fonts and ship with the
 * repo, so builds never touch the network. CSS variable names must match
 * landing.css. Weights for the variable faces are given as ranges.
 */
/* Headlines: Bebas Neue, as on sportstechx.com and Playmakers. */
export const lpDisplay = localFont({
	src: './fonts/bebas-neue-400.woff2',
	weight: '400',
	variable: '--lp-display',
	display: 'swap',
});

/* Labels, pills and buttons: Commit Mono, as on sportstechx.com. */
export const lpMono = localFont({
	src: [
		{ path: './fonts/commit-mono-400.woff2', weight: '400', style: 'normal' },
		{ path: './fonts/commit-mono-500.woff2', weight: '500', style: 'normal' },
		{ path: './fonts/commit-mono-700.woff2', weight: '700', style: 'normal' },
	],
	variable: '--lp-mono',
	display: 'swap',
});

export const lpSerif = localFont({
	src: [
		{ path: './fonts/newsreader.woff2', weight: '200 800', style: 'normal' },
		{ path: './fonts/newsreader-italic.woff2', weight: '200 800', style: 'italic' },
	],
	variable: '--lp-serif-fb',
	display: 'swap',
});
