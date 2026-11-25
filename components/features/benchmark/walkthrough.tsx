'use client';

import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button, Eyebrow } from '@/components/atlas';
import { firstNameOf, getUserType, useUserProfile } from '@/hooks/use-user-profile';
import { hrefOf } from '@/lib/routes';
import { qk } from '@/lib/query-keys';
import { openRaiseSetup } from '@/lib/setup-events';
import { FLAGS } from './config';
import { useThesisPrefill, useWalkthroughState } from './use-benchmark';
import { useTourLayout } from './tour-targets';
import { deviceOf, welcomeName } from './tour-layout';
import { TOURS, textOf, type TourCopy } from './tour-steps';
import './benchmark.css';

/**
 * First-login walkthrough: skippable steps (tour-steps.ts, per product) that
 * end on setting up the thesis, the raise or interests. Step 1 is a centred
 * welcome; each later step highlights what it explains (sidebar sections, a
 * Home section, a top-bar button) and its card sits beside it. With nothing
 * on screen to point at (the sidebar is a closed drawer on phones and
 * tablets) the card is centred.
 * Relaunch it from anywhere with `openWalkthrough()` (the account menu and
 * the banner do). Started / completed / skipped are stored per user.
 *
 * The copy is product's (tour-steps.ts).
 */
const TOUR_EVENT = 'stx:open-walkthrough';

export function openWalkthrough(): void {
	if (typeof window !== 'undefined') window.dispatchEvent(new Event(TOUR_EVENT));
}

/** Room around the highlighted element. */
const SPOT_PAD = 6;

/** Mounted in AppShell for everyone; its hooks (and requests) only run when the flag is on. */
export function Walkthrough() {
	return FLAGS.walkthrough ? <WalkthroughInner /> : null;
}

function WalkthroughInner() {
	const router = useRouter();
	const pathname = usePathname();
	const { data: profile } = useUserProfile();
	const tier = getUserType(profile);
	const STEPS = TOURS[tier];
	const setUp = useSetUp(tier);
	const { ready, state, record } = useWalkthroughState();
	const { prefill } = useThesisPrefill();
	// null = follow the stored state; true/false = the user opened or closed it here.
	const [manual, setManual] = useState<boolean | null>(null);
	const [step, setStep] = useState(0);
	const stamped = useRef(false);

	// Opens by itself on a first login, and again after a reload that
	// interrupted it (started, never completed or skipped).
	const fresh = ready && state.first_login && state.status === 'not_started';
	const auto = fresh || (ready && state.status === 'started');
	const open = manual ?? auto;
	const cardRef = useRef<HTMLDivElement>(null);
	const { boxes, card } = useTourLayout(open, STEPS[step].target, cardRef);

	// A first-login open is recorded as started (an external write, once).
	useEffect(() => {
		if (!fresh || stamped.current) return;
		stamped.current = true;
		record('started');
	}, [fresh, record]);

	useEffect(() => {
		const onOpen = () => { setStep(0); setManual(true); record('started'); };
		window.addEventListener(TOUR_EVENT, onOpen);
		return () => window.removeEventListener(TOUR_EVENT, onOpen);
	}, [record]);

	if (!FLAGS.walkthrough || !open) return null;

	const s = STEPS[step];
	const copy: TourCopy = { name: tourName(profile), device: browserDevice(), setUp };
	const last = step === STEPS.length - 1;
	const prefilled = !!prefill && (prefill.stages.length > 0 || prefill.regions.length > 0);

	// The welcome leads to Home, where the next stops are.
	const forward = () => {
		if (step === 0 && pathname !== hrefOf('home')) router.push(hrefOf('home'));
		setStep(step + 1);
	};
	const skip = () => { record('skipped'); setManual(false); };
	const finish = () => {
		record('completed');
		setManual(false);
		if (tier === 'scout' || profile?.user_role === 'admin') {
			// Scout setup is Preferences now; the thesis wizard is gone (D1, 1.2).
			router.push(hrefOf('interests'));
			return;
		}
		// The tour ends on Home's setup prompt: Raise opens its setup there,
		// Explore goes to Interests.
		if (tier === 'raise') { openRaiseSetup(setUp ? { edit: true } : undefined); return; }
		router.push(hrefOf('interests'));
	};

	return (
		<div className="bm-tour-layer" role="presentation">
			<svg className="bm-tour-mask" aria-hidden="true">
				<defs>
					<mask id="bm-tour-holes">
						<rect width="100%" height="100%" fill="white" />
						{boxes.map((b, i) => <rect key={i} x={b.left - SPOT_PAD} y={b.top - SPOT_PAD} width={b.width + SPOT_PAD * 2} height={b.height + SPOT_PAD * 2} rx={10} fill="black" />)}
					</mask>
				</defs>
				<rect width="100%" height="100%" mask="url(#bm-tour-holes)" />
			</svg>
			{boxes.map((b, i) => (
				<div key={i} className="bm-tour-spot" style={{ top: b.top - SPOT_PAD, left: b.left - SPOT_PAD, width: b.width + SPOT_PAD * 2, height: b.height + SPOT_PAD * 2 }} />
			))}
			<div ref={cardRef} className={`atlas bm-tour${card ? ' is-anchored' : ''}`} style={card ? { top: card.top, left: card.left } : undefined} role="dialog" aria-modal="true" aria-labelledby="bm-tour-title">
				<div className="bm-tour__steps" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
					{STEPS.map((x, i) => <span key={x.eyebrow} className={i <= step ? 'on' : undefined} />)}
				</div>
				<Eyebrow>{s.eyebrow} · {step + 1} of {STEPS.length}</Eyebrow>
				<h2 id="bm-tour-title">{textOf(s.title, copy)}</h2>
				<p>{textOf(s.body, copy)}</p>
				{last && prefilled && <p style={{ marginTop: 12 }}>We’ve pre-filled your stage and region from your survey answers. Check them and change anything that’s off.</p>}
				<div className="bm-tour__nav">
					<button type="button" className="bm-linkbtn" onClick={skip}>Skip the tour</button>
					<div className="bm-actions">
						{step > 0 && <Button variant="ghost" onClick={() => setStep(step - 1)}><ArrowLeft size={13} /> Back</Button>}
						<Button onClick={last ? finish : forward}>{s.next ? textOf(s.next, copy) : 'Next'} <ArrowRight size={13} /></Button>
					</div>
				</div>
			</div>
		</div>
	);
}

/** First name for the welcome; never the email handle. */
function tourName(profile: { full_name?: string | null; display_name?: string | null; email?: string | null } | null | undefined): string | null {
	const full = firstNameOf(profile?.full_name);
	return full ?? welcomeName(firstNameOf(profile?.display_name), true, profile?.email);
}

/** The device's shortcut keys, from the browser (client only: the tour never renders on the server). */
function browserDevice() {
	const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
	return deviceOf(nav.userAgentData?.platform || nav.platform);
}

/**
 * Whether the last step's subject is already set up: a Raise round, or
 * Explore interests. Same keys as the Home pages, so no extra requests there.
 */
function useSetUp(tier: string): boolean {
	const raise = useSWR<{ needs_setup?: boolean }>(tier === 'raise' ? qk.raise.home() : null);
	const explore = useSWR<{ sectors?: unknown[]; sports?: unknown[] }>(tier === 'explore' ? qk.explore.interests() : null);
	if (tier === 'raise') return !!raise.data && !raise.data.needs_setup;
	if (tier === 'explore') return (explore.data?.sectors?.length ?? 0) + (explore.data?.sports?.length ?? 0) > 0;
	return false;
}
