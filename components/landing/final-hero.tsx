'use client';

import type { CSSProperties } from 'react';
import { SOLUTIONS, selectSolution } from '@/components/landing/atlas-solutions';

/**
 * Closing CTA: one button per solution. Each opens that solution's card in
 * the Solutions section.
 */
export function FinalHero() {
	return (
		<section className="lp-closing" id="start">
			<div className="lp-inner">
				<h2 className="lp-display lp-closing-title">Where do you want to start?</h2>
				<div className="lp-closing-ctas">
					{SOLUTIONS.map((s) => (
						<a
							key={s.id}
							className="lp-closing-btn"
							href="#solutions"
							style={{ '--sol-fill': s.fill } as CSSProperties}
							onClick={(e) => selectSolution(s.id, e)}
						>
							{s.closingCta}
						</a>
					))}
				</div>
			</div>
		</section>
	);
}
