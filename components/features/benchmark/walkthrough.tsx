'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button, Eyebrow } from '@/components/atlas';
import { getUserType, useUserProfile } from '@/hooks/use-user-profile';
import { hrefOf } from '@/lib/routes';
import { ENTRY_PATH, FLAGS } from './config';
import { useBenchmarkAccess, useThesisPrefill, useWalkthroughState } from './use-benchmark';
import './benchmark.css';

/**
 * First-login walkthrough: five skippable steps that end on thesis setup.
 * Relaunch it from anywhere with `openWalkthrough()` (the account menu and
 * the banner do). Started / completed / skipped are stored per user.
 *
 * Steps are the spec's proposal, still to confirm with product.
 */
const TOUR_EVENT = 'stx:open-walkthrough';

export function openWalkthrough(): void {
	if (typeof window !== 'undefined') window.dispatchEvent(new Event(TOUR_EVENT));
}

interface Step { eyebrow: string; title: string; body: string; points?: string[] }

const STEPS: Step[] = [
	{ eyebrow: 'Home', title: 'Start from Home', body: 'Home shows what changed in sports tech since your last visit. Ask Atlas answers questions about companies, funding, events and sectors in plain language.', points: ['Pinned research sits at the top of Home', 'Ask Atlas is in the search bar and the button at the bottom right'] },
	{ eyebrow: 'Discover', title: 'Find companies', body: 'Search the company database, see companies matched to your thesis in Recommended, and follow funding and product news in Signals.', points: ['Companies: the full database with filters', 'Recommended: matches for your thesis', 'Signals: what the companies you follow are doing'] },
	{ eyebrow: 'Ecosystem and Intelligence', title: 'Read the market', body: 'Investors, programs and events make up the ecosystem. Analytics, the Monthly Roundup and M&A show where money and attention are going.' },
	{ eyebrow: 'Reports', title: 'Read the research', body: 'SportsTechX reports live in Reports, including the VC Deal Sourcing Benchmark 2026. Unpin anything from Home and you’ll still find it there.' },
	{ eyebrow: 'Your thesis', title: 'Set up your thesis', body: 'Tell Atlas your stages, regions and sectors, and it tunes recommendations, signals and Home to them. It takes a couple of minutes and you can change it any time.' },
];

/** Mounted in AppShell for everyone; its hooks (and requests) only run when the flag is on. */
export function Walkthrough() {
	return FLAGS.walkthrough ? <WalkthroughInner /> : null;
}

function WalkthroughInner() {
	const router = useRouter();
	const { data: profile } = useUserProfile();
	const { ready, state, record } = useWalkthroughState();
	const { access } = useBenchmarkAccess();
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
	const last = step === STEPS.length - 1;
	const contributor = access.entries.r3 === 'open';
	const prefilled = !!prefill && (prefill.stages.length > 0 || prefill.regions.length > 0);

	const skip = () => { record('skipped'); setManual(false); };
	const finish = () => {
		record('completed');
		setManual(false);
		const tier = getUserType(profile);
		if (tier === 'scout' || profile?.user_role === 'admin') {
			// The thesis wizard is a global modal that `?setup=thesis` opens on any
			// page, so it opens over where they land: a contributor's benchmark
			// (stored return URL), else Home. Opening it by event instead raced the
			// navigation and left them on the current page.
			const dest = contributor ? (state.return_url ?? ENTRY_PATH.r3) : hrefOf('home');
			router.push(`${dest}${dest.includes('?') ? '&' : '?'}setup=thesis`);
			return;
		}
		// Raise and Explore set their focus on a page of its own.
		router.push(hrefOf(tier === 'raise' ? 'raise-settings' : 'interests'));
	};

	return (
		<div className="bm-tour-overlay" role="presentation">
			<div className="atlas bm-tour" role="dialog" aria-modal="true" aria-labelledby="bm-tour-title">
				<div className="bm-tour__steps" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
					{STEPS.map((x, i) => <span key={x.title} className={i <= step ? 'on' : undefined} />)}
				</div>
				<Eyebrow>{s.eyebrow} · {step + 1} of {STEPS.length}</Eyebrow>
				<h2 id="bm-tour-title">{s.title}</h2>
				<p>{s.body}</p>
				{last && prefilled && <p style={{ marginTop: 12 }}>We’ve pre-filled your stage and region from your survey answers. Check them and change anything that’s off.</p>}
				{s.points && <ul>{s.points.map((x) => <li key={x}>{x}</li>)}</ul>}
				<div className="bm-tour__nav">
					<button type="button" className="bm-linkbtn" onClick={skip}>Skip the tour</button>
					<div className="bm-actions">
						{step > 0 && <Button variant="ghost" onClick={() => setStep(step - 1)}><ArrowLeft size={13} /> Back</Button>}
						{last
							? <Button onClick={finish}>Set up your thesis <ArrowRight size={13} /></Button>
							: <Button onClick={() => setStep(step + 1)}>Next <ArrowRight size={13} /></Button>}
					</div>
				</div>
			</div>
		</div>
	);
}
