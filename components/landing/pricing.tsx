'use client';

/* eslint-disable @next/next/no-img-element */
import { useState, type CSSProperties } from 'react';
import { Check } from 'lucide-react';
import { ATLAS_LINKS, SOLUTIONS, type SolutionId } from '@/components/landing/atlas-solutions';

type Plan = {
	id: SolutionId;
	/** Small label above the lockup, as on the Solutions cards. */
	audience: string;
	/** One line under the lockup. */
	pitch: string;
	price: string;
	period: string;
	credits: string;
	creditsUnit: string;
	creditsNote: string;
	ticks: string[];
	cta: { label: string; href: string; primary?: boolean };
	/** Raise: guarantee line. Scout: secondary demo link. */
	extra?: { label: string; href?: string };
};

const EVERYTHING_IN_EXPLORE = 'Everything in Explore';
const FULL_ACCESS = 'Full Access to 13k+ Companies, Programs & Investors';

const PLANS: Plan[] = [
	{
		id: 'explore',
		audience: 'For everyone',
		pitch: 'Insights and resources to explore the sports tech ecosystem.',
		price: '€0',
		period: 'Free forever',
		credits: '300',
		creditsUnit: 'welcome credits',
		creditsNote: 'One-time on sign-up · Top up anytime',
		ticks: [
			'30+ Industry Reports',
			'Weekly Newsletter',
			'Market Analysis Dashboard',
			'Monthly Investment Roundup incl. Archive',
			'Events Directory',
			'Limited Access to 13k+ Companies, Programs & Investors',
		],
		cta: { label: 'Sign up for free', href: ATLAS_LINKS.signup },
	},
	{
		id: 'raise',
		audience: 'For founders',
		pitch: 'Investor intelligence and tools to support your fundraising journey.',
		price: '€600',
		period: 'Per 6 months',
		credits: '2,000',
		creditsUnit: 'credits / month',
		creditsNote: 'Reloaded to your account each month',
		ticks: [EVERYTHING_IN_EXPLORE, FULL_ACCESS, 'Active Investors', 'Screen by Thesis', 'Deal History'],
		cta: { label: 'Get Atlas Raise', href: ATLAS_LINKS.raiseCheckout, primary: true },
		extra: { label: '30-day money-back guarantee' },
	},
	{
		id: 'scout',
		audience: 'For investors & accelerators',
		pitch: 'Live fundraising opportunities and intelligence to support due diligence.',
		price: '€2,500',
		period: 'Per year',
		credits: '5,000',
		creditsUnit: 'credits / month',
		creditsNote: 'Reloaded to your account each month',
		ticks: [EVERYTHING_IN_EXPLORE, FULL_ACCESS, 'Matched to Your Thesis', 'Verified Raises', 'Deck Screening'],
		cta: { label: 'Get Atlas Scout', href: ATLAS_LINKS.scoutCheckout },
		extra: { label: 'Or book a demo →', href: ATLAS_LINKS.bookDemo },
	},
];

/** Feature table rows: [feature, in Explore]. Raise and Scout include everything. */
const FEATURES: [string, boolean][] = [
	['Reports library access', true],
	['Full companies database', false],
	['Full funding tracker', false],
	['Full investors directory', false],
	['Full M&A tracker', false],
	['Programs directory', true],
	['Events calendar', true],
	['SportsTechX framework', true],
	['Newsletter archive', true],
	['Analytics dashboards', false],
	['CSV export', true],
	['Developer API', false],
	['AI research assistant', true],
	['Saved searches', true],
	['Watchlists', true],
	['Personalised recommendations', false],
	['Advanced filters', false],
	['Company contacts', false],
];

/**
 * Pricing: three plan cards, a note on credits, and a collapsible table of
 * what each plan includes (closed by default).
 */
export function Pricing() {
	const [compare, setCompare] = useState(false);
	return (
		<section className="lp-pricing" id="pricing">
			<div className="lp-inner">
				<h2 className="lp-display lp-section-title">Pricing</h2>

				<div className="lp-plans">
					{PLANS.map((p) => {
						const s = SOLUTIONS.find((x) => x.id === p.id)!;
						return (
							<div
								key={p.id}
								className={`lp-plan${p.cta.primary ? ' lp-plan--featured' : ''}`}
								style={{ '--sol': s.colour, '--sol-fill': s.fill } as CSSProperties}
							>
								<div>
									<p className="lp-plan-aud">{p.audience}</p>
									<span className="lp-plan-brand" role="img" aria-label={`Atlas ${s.name}`}>
										<img src="/landing/atlas-wordmark-dark.svg" alt="" />
										<em>{s.name}</em>
									</span>
									<p className="lp-plan-pitch">{p.pitch}</p>
								</div>
								<div>
									<p className="lp-display lp-plan-price">{p.price}</p>
									<p className="lp-plan-period">{p.period}</p>
								</div>
								<div className="lp-plan-credits">
									<p className="lp-plan-credits-n">{p.credits}</p>
									<p className="lp-plan-credits-unit">{p.creditsUnit}</p>
									<p className="lp-plan-credits-note">{p.creditsNote}</p>
								</div>
								{p.ticks.length > 0 && (
									<ul className="lp-plan-ticks">
										{p.ticks.map((t) => (
											<li key={t}>
												<Check aria-hidden size={18} strokeWidth={2.25} />
												{t}
											</li>
										))}
									</ul>
								)}
								<div className="lp-plan-foot">
									<a className={`lp-plan-cta${p.cta.primary ? ' is-primary' : ''}`} href={p.cta.href}>
										{p.cta.label}
									</a>
									{p.extra &&
										(p.extra.href ? (
											<a className="lp-plan-extra" href={p.extra.href} target="_blank" rel="noreferrer">
												{p.extra.label}
											</a>
										) : (
											<p className="lp-plan-extra">{p.extra.label}</p>
										))}
								</div>
							</div>
						);
					})}
				</div>

				<p className="lp-plans-note">
					Credits power AI chat, pitch-deck analysis and data exports. Monthly credits don&rsquo;t roll over. Top up anytime
					if you need more.
				</p>

				<div className="lp-compare">
					<button
						type="button"
						className="lp-compare-toggle"
						aria-expanded={compare}
						aria-controls={compare ? 'lp-compare-table' : undefined}
						onClick={() => setCompare((v) => !v)}
					>
						<span>
							<span className="lp-display lp-compare-title">What each plan includes</span>
							<span className="lp-compare-sub">Raise and Scout share the same data. They differ by workspace.</span>
						</span>
						<span aria-hidden className="lp-compare-icon">
							{compare ? '−' : '+'}
						</span>
					</button>
					{compare && (
						<div className="lp-compare-scroll" id="lp-compare-table">
							<table className="lp-compare-table">
								<thead>
									<tr>
										<th scope="col">Feature</th>
										{SOLUTIONS.map((s) => (
											<th scope="col" key={s.id}>
												{s.name}
											</th>
										))}
									</tr>
								</thead>
								<tbody>
									{FEATURES.map(([f, inExplore]) => (
										<tr key={f}>
											<th scope="row">{f}</th>
											{[inExplore, true, true].map((on, i) => (
												<td key={i}>
													{on ? (
														<span role="img" aria-label="Included">✓</span>
													) : (
														<span role="img" aria-label="Not included" className="is-off">
															—
														</span>
													)}
												</td>
											))}
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			</div>
		</section>
	);
}
