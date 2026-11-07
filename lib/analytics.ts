'use client';

import type { PostHog } from 'posthog-js';

/**
 * PostHog (EU Cloud) wrapper. Initialised at app boot from the providers tree
 * once NEXT_PUBLIC_POSTHOG_KEY is set (next.config maps Vercel's
 * NEXT_POSTHOG_KEY onto it); a no-op otherwise, so dev environments
 * without the key don't send anything.
 *
 * Consent, without a banner: an anonymous visitor is tracked in MEMORY only
 * (no cookie, no localStorage, nothing survives the tab). Once signed in (the
 * user accepted the Terms and Privacy Policy) tracking persists and session
 * replay starts, with every input masked. Sign-out resets back to memory.
 *
 * Free tier: no card on the PostHog org = hard caps, never a bill. Kept lean:
 * person profiles for identified users only, no page-leave events, no surveys.
 *
 * Call `track(Events.x, …)` directly. Wired today: page views (automatic, every
 * route), sign in, sign out, company opened, checkout started, plus PostHog's
 * autocapture of clicks. `Events` lists the agreed names for the rest.
 */

let initialized = false;
let userId: string | null = null;
let ph: PostHog | null = null;
// Calls made before the SDK has loaded, replayed in order once it has.
const queue: ((p: PostHog) => void)[] = [];
const withPh = (fn: (p: PostHog) => void) => { if (ph) fn(ph); else if (initialized) queue.push(fn); };

/** A Supabase session cookie: this browser belongs to a signed-in user. */
const signedIn = () => /(?:^|;\s*)sb-[^=]+-auth-token/.test(document.cookie);

export function initAnalytics(): void {
	if (initialized) return;
	const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
	if (!key) return;
	initialized = true;
	// Off the critical path: the SDK loads once the browser is idle.
	const load = () => {
		import('posthog-js')
			.then(({ default: p }) => {
				p.init(key, {
					api_host: 'https://eu.i.posthog.com',
					ui_host: 'https://eu.posthog.com',
					persistence: signedIn() ? 'localStorage+cookie' : 'memory',
					person_profiles: 'identified_only',
					// Every route, public pages included (client-side navigations too).
					capture_pageview: 'history_change',
					capture_pageleave: false,
					disable_surveys: true,
					// Replay is for signed-in users only: started in identify().
					disable_session_recording: true,
					session_recording: { maskAllInputs: true },
				});
				ph = p;
				queue.splice(0).forEach((fn) => fn(p));
			})
			.catch(() => { /* analytics is best-effort; a blocked script must not break the app */ });
	};
	if ('requestIdleCallback' in window) window.requestIdleCallback(load, { timeout: 4000 });
	else setTimeout(load, 1500);
}

export function identify(profileId: string, traits?: Record<string, unknown>): void {
	if (!initialized) return;
	if (userId === profileId) return;
	userId = profileId;
	withPh((p) => {
		p.set_config({ persistence: 'localStorage+cookie' });
		p.identify(profileId, traits);
		p.startSessionRecording();
	});
}

export function reset(): void {
	if (!initialized || userId === null) return;
	userId = null;
	withPh((p) => {
		p.stopSessionRecording();
		p.reset();
		p.set_config({ persistence: 'memory' });
	});
}

export function track(event: string, props?: Record<string, unknown>): void {
	if (!initialized) return;
	withPh((p) => p.capture(event, props));
}

/** Canonical event names so we don't typo at call sites. */
export const Events = {
	signedIn: 'signed_in',
	signedOut: 'signed_out',
	companySearched: 'company_searched',
	companyOpened: 'company_opened',
	dealOpened: 'deal_opened',
	investorOpened: 'investor_opened',
	reportOpened: 'report_opened',
	reportDownloaded: 'report_downloaded',
	filterApplied: 'filter_applied',
	savedSearchCreated: 'saved_search_created',
	chatTurnSent: 'chat_turn_sent',
	chatSuggestionUsed: 'chat_suggestion_used',
	chatExported: 'chat_exported',
	billingCheckoutStarted: 'billing_checkout_started',
	billingPortalOpened: 'billing_portal_opened',
} as const;
