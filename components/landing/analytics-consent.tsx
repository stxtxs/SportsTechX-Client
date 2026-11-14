'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

/**
 * Google Analytics 4 for the public marketing pages, behind a consent banner.
 *
 * Scope: the landing page and the legal pages only (wherever this component is
 * mounted). The signed-in product is measured by PostHog (lib/analytics.ts) and
 * never by GA: app URLs can carry tokens and ids that must not reach Google.
 * Two things keep GA inside that scope:
 *
 *  1. Unmounting (leaving the marketing pages) flips Google's opt-out switch,
 *     so a GA script that is already loaded sends nothing from app routes.
 *  2. Page views are sent by hand, once per mount. The stream's automatic
 *     "page changes based on browser history events" is switched OFF in GA
 *     (Admin > Data streams > STX Atlas > Enhanced measurement > Page views);
 *     leave it off, or the first route after a marketing page gets reported.
 *
 * Consent: nothing from Google loads and no cookie is set until the visitor
 * accepts. Declining stores the choice and loads nothing. A link to
 * `#cookie-settings` (the landing footer has one) reopens the banner;
 * withdrawing stops GA and removes its cookies.
 *
 * GA runs on the production hosts only, so previews and localhost neither show
 * the banner nor send hits. Set NEXT_PUBLIC_GA_MEASUREMENT_ID to test it on
 * another host (it then also replaces the ID below).
 */

/** Stream "STX Atlas" in the GA4 property "SportsTechX – GA4 (Clean)". */
const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-XN87QV11RG';
const GA_HOSTS = ['atlas.sportstechx.com', 'www.atlas.sportstechx.com'];

const STORAGE_KEY = 'stx:analytics-consent';
const CHANGE_EVENT = 'stx:analytics-consent';
const SETTINGS_HASH = '#cookie-settings';

type Status = 'off' | 'unset' | 'granted' | 'denied';

declare global {
	interface Window {
		dataLayer?: unknown[];
		gtag?: (...args: unknown[]) => void;
	}
}

/** Kept in memory too, for browsers that refuse localStorage. */
let memory: Status = 'unset';

function enabled(): boolean {
	return Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) || GA_HOSTS.includes(window.location.hostname);
}

function readStatus(): Status {
	if (!enabled()) return 'off';
	try {
		const stored = window.localStorage.getItem(STORAGE_KEY);
		if (stored === 'granted' || stored === 'denied') return stored;
	} catch {
		/* storage blocked: fall through to the in-memory choice */
	}
	return memory;
}

function writeStatus(next: 'granted' | 'denied'): void {
	memory = next;
	try {
		window.localStorage.setItem(STORAGE_KEY, next);
	} catch {
		/* storage blocked: the choice lasts for this page view only */
	}
	window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void): () => void {
	window.addEventListener(CHANGE_EVENT, onChange);
	window.addEventListener('storage', onChange);
	return () => {
		window.removeEventListener(CHANGE_EVENT, onChange);
		window.removeEventListener('storage', onChange);
	};
}

/** Google's documented opt-out switch: while true, gtag sends nothing. */
function setGaDisabled(disabled: boolean): void {
	(window as unknown as Record<string, boolean>)[`ga-disable-${GA_ID}`] = disabled;
}

let loaded = false;

function startGa(): void {
	setGaDisabled(false);
	if (loaded) return;
	loaded = true;
	window.dataLayer = window.dataLayer || [];
	// gtag.js reads the `arguments` object itself, so a rest array will not do.
	window.gtag = function gtag() {
		// eslint-disable-next-line prefer-rest-params -- required by gtag.js
		window.dataLayer!.push(arguments);
	};
	window.gtag('js', new Date());
	// No automatic page view: see (2) above.
	window.gtag('config', GA_ID, { send_page_view: false });
	const script = document.createElement('script');
	script.async = true;
	script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
	document.head.appendChild(script);
}

function stopGa(): void {
	setGaDisabled(true);
	// GA sets its cookies on the widest domain it can, so clear every level.
	const names = ['_ga', `_ga_${GA_ID.replace(/^G-/, '')}`];
	const parts = window.location.hostname.split('.');
	const domains = ['', ...parts.map((_, i) => `.${parts.slice(i).join('.')}`).filter((d) => d.split('.').length > 2)];
	for (const name of names) {
		for (const domain of domains) {
			document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ''}`;
		}
	}
}

export function AnalyticsConsent() {
	// 'off' on the server and during hydration, so the banner never flashes.
	const status = useSyncExternalStore<Status>(subscribe, readStatus, () => 'off');
	const [reopened, setReopened] = useState(false);

	useEffect(() => {
		if (status === 'denied') stopGa();
		if (status !== 'granted') return;
		startGa();
		window.gtag?.('event', 'page_view', { page_location: window.location.href });
		// Leaving the marketing pages: GA stays loaded but goes silent.
		return () => setGaDisabled(true);
	}, [status]);

	// Any link to #cookie-settings reopens the banner.
	useEffect(() => {
		const onClick = (event: MouseEvent) => {
			const link = (event.target as Element | null)?.closest?.('a[href]');
			if (!link || !link.getAttribute('href')?.endsWith(SETTINGS_HASH)) return;
			event.preventDefault();
			setReopened(true);
		};
		document.addEventListener('click', onClick);
		return () => document.removeEventListener('click', onClick);
	}, []);

	if (status === 'off') return null;
	if (status !== 'unset' && !reopened) return null;

	const choose = (next: 'granted' | 'denied') => {
		writeStatus(next);
		setReopened(false);
	};

	return (
		<section aria-label="Cookie consent" className="lp-consent">
			<p>
				We use Google Analytics cookies to see how this site is used. They are set only if you accept.{' '}
				<a href="/privacy-policy">Privacy Policy</a>
				{status !== 'unset' && (
					<span className="lp-consent-current">
						Current choice: {status === 'granted' ? 'accepted' : 'declined'}.
					</span>
				)}
			</p>
			<div className="lp-consent-actions">
				<button type="button" onClick={() => choose('denied')} className="lp-btn lp-consent-decline">
					Decline
				</button>
				<button type="button" onClick={() => choose('granted')} className="lp-btn lp-btn--pink">
					Accept
				</button>
			</div>
		</section>
	);
}
