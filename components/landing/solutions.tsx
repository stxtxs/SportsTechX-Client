'use client';

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState, type CSSProperties } from 'react';
import type { SiteItem } from '@/lib/site-content';
import {
	SOLUTIONS,
	SOLUTION_EVENT,
	TESTIMONIALS_ENABLED,
	type Solution,
	type SolutionId,
} from '@/components/landing/atlas-solutions';

/** The longest pill label: every pill holds this width so all three match. */
const SIZER = SOLUTIONS.reduce((a, s) => (s.pill.length > a.length ? s.pill : a), '');

/* Roles as the dev brief words them; they win over the CMS subtitle, which
   still carries the older team-section titles. */
const EXPERT_ROLES: Record<string, string[]> = {
	'Rohn Malhotra': ['Co-Founder & CEO | SportsTechX', 'Investment Director | Match Ventures'],
	'Thomas Preiss': ['Co-Founder | Common Goal & Playmakers'],
};

/* Shown until an admin fills Site assets → Atlas → Team / experts. */
const EXPERT_FALLBACK: SiteItem[] = [
	{
		url: '/landing/team-1.jpg',
		alt: 'Rohn Malhotra',
		logoUrl: null,
		logoAlt: '',
		title: 'Rohn Malhotra',
		subtitle: 'Founder at SportsTechX | VC at Match Ventures',
		body: 'Co-Founder & Managing Director at SportsTechX, the leading sports innovation intelligence platform, exited founder and Investment Director at Match Ventures.',
	},
	{
		url: '/landing/team-2.jpg',
		alt: 'Thomas Preiss',
		logoUrl: null,
		logoAlt: '',
		title: 'Thomas Preiss',
		subtitle: 'Playmakers and Common Goal Co-Founder',
		body: 'Serial entrepreneur and community builder in sports, Co-Founder of Common Goal with deep expertise in building and operating high-impact membership networks.',
	},
];

export type SolutionShots = Partial<Record<SolutionId, SiteItem[]>>;

/**
 * Solutions: one platform, three ways in.
 *
 * "I WANT TO" plus three pills picks a solution; the matching card shows below.
 * Each card takes its own height (the step decks all match; Raise runs longer
 * for its experts strip). The hidden ones are not displayed and are inert.
 *
 * Anything else on the page (header drop-down, hero lines, closing CTA,
 * footer) opens a card by dispatching `atlas:solution`.
 */
export function Solutions({
	shots,
	experts,
	testimonials,
}: {
	/** CMS dashboard screenshots per solution, in step order. */
	shots?: SolutionShots;
	/** CMS Team / experts, for Raise's "Experts in your corner". */
	experts?: SiteItem[];
	/** CMS testimonials; each card picks its own by name. */
	testimonials?: SiteItem[];
}) {
	const [active, setActive] = useState<SolutionId>('explore');

	useEffect(() => {
		const onPick = (e: Event) => {
			const id = (e as CustomEvent<SolutionId>).detail;
			if (SOLUTIONS.some((s) => s.id === id)) setActive(id);
		};
		window.addEventListener(SOLUTION_EVENT, onPick);
		return () => window.removeEventListener(SOLUTION_EVENT, onPick);
	}, []);

	return (
		<section className="lp-cream lp-sol" id="solutions">
			<div className="lp-inner">
				<p className="lp-eyebrow">Solutions</p>
				<h2 className="lp-display lp-section-title">One platform. Three ways in.</h2>

				<div className="lp-sol-select">
					<span className="lp-sol-label">I want to</span>
					<div className="lp-sol-pills">
						{SOLUTIONS.map((s) => (
							<div key={s.id} className="lp-sol-opt">
								<button
									type="button"
									className="lp-sol-pill"
									aria-pressed={active === s.id}
									style={{ '--sol-fill': s.fill } as CSSProperties}
									onClick={() => setActive(s.id)}
								>
									{/* The visible label and an invisible copy of the longest
									    one share a cell, so every pill holds one width. */}
									<span>{s.pill}</span>
									<span aria-hidden className="lp-sol-sizer">{SIZER}</span>
								</button>
								<span className="lp-sol-hint">{s.hint}</span>
							</div>
						))}
					</div>
				</div>

				<div className="lp-sol-stack">
					{SOLUTIONS.map((s) => {
						const shown = s.id === active;
						return (
							<div key={s.id} className={`lp-sol-slot${shown ? ' is-shown' : ''}`} inert={!shown} aria-hidden={!shown}>
								<SolutionCard
									solution={s}
									shots={shots?.[s.id]}
									experts={experts?.length ? experts : EXPERT_FALLBACK}
									testimonials={testimonials}
								/>
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
}

function SolutionCard({
	solution: s,
	shots,
	experts,
	testimonials,
}: {
	solution: Solution;
	shots?: SiteItem[];
	experts: SiteItem[];
	testimonials?: SiteItem[];
}) {
	const quotes = TESTIMONIALS_ENABLED
		? s.testimonialNames
				.map((name) => testimonials?.find((t) => (t.title || t.alt) === name))
				.filter((t): t is SiteItem => Boolean(t?.body))
		: [];

	return (
		<article className="lp-sol-card" style={{ '--sol': s.colour, '--sol-tint': s.tint, '--sol-fill': s.fill, '--sol-accent': s.accent } as CSSProperties}>
			<div className="lp-sol-head">
				<div className="lp-sol-copy">
				<span className="lp-sol-aud">{s.audience}</span>
				<span className="lp-sol-brand">
					<img src="/landing/atlas-wordmark-white.svg" alt="Atlas" />
					<em style={{ color: s.colour }}>{s.name}</em>
				</span>
				<p className="lp-sol-intro">{s.intro}</p>
				</div>
				<div className="lp-sol-actions">
				<div className="lp-sol-ctas">
					{s.ctas.map((c, i) => (
						<a
							key={c.label}
							href={c.href}
							className={`lp-sol-btn${i === 0 ? ' lp-sol-btn--primary' : ''}`}
							{...(c.external ? { target: '_blank', rel: 'noreferrer' } : {})}
						>
							{c.label}
						</a>
					))}
				</div>
				{s.note && <p className="lp-sol-note">{s.note}</p>}
				</div>
			</div>

			<StepDeck solution={s} shots={shots} />

			{s.experts && <Experts people={experts} />}

			{quotes.length > 0 && <CardTestimonials items={quotes} />}
		</article>
	);
}

/**
 * The three steps as a deck: one open (headline, bullets, screenshot), the
 * others collapsed into numbered vertical tabs. Clicking a tab opens it.
 */
function StepDeck({ solution: s, shots }: { solution: Solution; shots?: SiteItem[] }) {
	const [open, setOpen] = useState(0);
	return (
		<div className="lp-steps">
			{s.steps.map((step, i) => {
				const isOpen = i === open;
				const num = String(i + 1).padStart(2, '0');
				// Clamp: with fewer screenshots uploaded, later steps reuse the last.
				const shot = shots?.length ? shots[Math.min(i, shots.length - 1)] : undefined;
				if (!isOpen) {
					return (
						<button
							key={step.label}
							type="button"
							className="lp-step-tab"
							aria-expanded={false}
							aria-label={`Step ${i + 1}: ${step.label}`}
							onClick={() => setOpen(i)}
						>
							<span className="lp-step-num">{num}</span>
							<span className="lp-step-tab-label">{step.label}</span>
						</button>
					);
				}
				return (
					<div key={step.label} className="lp-step-open" aria-expanded>
						<div className="lp-step-text">
							<span className="lp-step-num">
								{num} · {step.label}
							</span>
							<h3 className="lp-display lp-step-title">{step.headline}</h3>
							<ul className="lp-step-bullets">
								{step.bullets.map((b) => (
									<li key={b}>
										<span className="lp-step-dot" aria-hidden />
										{b}
									</li>
								))}
							</ul>
						</div>
						<div className="lp-step-shot">
							{shot?.url ? (
								<img src={shot.url} alt={shot.alt || `Atlas ${s.name} — ${step.label}`} />
							) : (
								<div className="lp-step-shot-fallback" aria-hidden>
									<img src="/landing/atlas-a-dark.svg" alt="" />
								</div>
							)}
						</div>
					</div>
				);
			})}
		</div>
	);
}

/** Raise only: quarterly check-ins with SportsTechX leadership. */
function Experts({ people }: { people: SiteItem[] }) {
	return (
		<div className="lp-experts">
			<div className="lp-experts-intro">
				<p className="lp-sol-aud">Included with Raise</p>
				<p className="lp-display lp-experts-title">Experts in your corner</p>
				<p className="lp-experts-text">
					Two check-ins with SportsTechX leadership to pressure-test your story and sharpen your investor approach.
				</p>
			</div>
			<div className="lp-experts-people">
				{people.slice(0, 2).map((p, i) => {
					const name = p.title || p.alt;
					return (
						<div key={`${name}-${i}`} className="lp-expert">
							<span className="lp-expert-photo" style={{ backgroundImage: p.url ? `url('${p.url}')` : undefined }} />
							<span>
								<strong className="lp-expert-name">{name}</strong>
								{(EXPERT_ROLES[name] ?? (p.subtitle ? [p.subtitle] : [])).map((role) => (
									<span key={role} className="lp-expert-role">{role}</span>
								))}
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}

/**
 * Testimonials at the foot of a card, in the format of the solution cards on
 * sportstechx.com: a TESTIMONIALS label, then quotes with an avatar/name chip.
 * Switched off for the relaunch (TESTIMONIALS_ENABLED), ready to turn on.
 */
function CardTestimonials({ items }: { items: SiteItem[] }) {
	return (
		<div className="lp-sol-testi">
			<p className="lp-sol-testi-label">Testimonials</p>
			<div className="lp-sol-testi-row">
				{items.map((t, i) => (
					<figure key={i} className="lp-sol-quote">
						<blockquote>&ldquo;{t.body}&rdquo;</blockquote>
						<figcaption className="lp-chip">
							{t.url && <img className="lp-chip-avatar" src={t.url} alt="" />}
							<span>
								<span className="lp-chip-name">{t.title || t.alt}</span>
								{t.subtitle && <span className="lp-chip-role">{t.subtitle}</span>}
							</span>
						</figcaption>
					</figure>
				))}
			</div>
		</div>
	);
}
