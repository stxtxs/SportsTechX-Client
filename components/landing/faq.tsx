'use client';

import { useState } from 'react';

/* Atlas FAQ copy, from the website-redesign dev brief. */
const FAQS: [string, string][] = [
	['What is Atlas?', 'Atlas brings together three products: Explore for market intelligence, Raise for fundraising support and Scout for investment discovery.'],
	['Which Atlas product is right for me?', 'Explore if you want to understand the market. Raise if you are a founder preparing a round. Scout if you are an investor or accelerator sourcing deals.'],
	['Is Explore really free?', 'Yes. You get all 30+ SportsTechX reports, the SportsTech Framework, our newsletter and events, plus limited access to our lists of companies, investors and innovation programs.'],
	['How does Raise analyse my pitch deck?', 'Upload your deck to identify strengths, gaps and likely investor concerns.'],
	['How does Scout personalise recommendations?', 'Set your stage, geography, sector, sport, cheque size and business model, plus any exclusions.'],
	['How much does Atlas cost?', 'Explore is free. Raise is €720 for 6 months. Scout is €2,500 per year.'],
];

export function Faq() {
	/* The first question starts open. */
	const [open, setOpen] = useState<number | null>(0);
	return (
		<section className="lp-cream lp-faq" id="faq">
			<div className="lp-inner">
				<h2 className="lp-display">Frequently asked questions</h2>
				<div className="lp-faq-list">
					{FAQS.map(([q, a], i) => (
						<div className={`lp-faq-item ${open === i ? 'open' : ''}`} key={i}>
							<button className="lp-faq-q" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
								{q}
								<span className="lp-faq-icon" aria-hidden>{open === i ? '−' : '+'}</span>
							</button>
							<div className="lp-faq-a"><div className="lp-faq-a-inner">{a}</div></div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
