'use client';

import { useSyncExternalStore } from 'react';
import { displayCurrency, subscribeCurrency, type DisplayCurrency } from '@/lib/currency';

/** Hover text on the gated-report sign (fix brief N2, 17 Nov). */
export const GATED_REPORT_HOVER = 'Report contains gated content';

/**
 * The gated-report marker on Explore (fix brief N2): the viewer's currency
 * sign ($ or €, from Preferences). A marker only: hover says the report has
 * gated content; it isn't a link — the way to Solutions sits inside the report,
 * at each gated section. Raise and Scout never see it.
 *
 * Not to be confused with Scout's "$ actively fundraising" mark, which stays
 * Scout-only, so the two signs never appear together.
 */
export function CurrencyMark() {
	const currency = useSyncExternalStore(subscribeCurrency, displayCurrency, () => 'USD' as DisplayCurrency);
	return (
		<span className="atlas-lock atlas-currency-mark" role="img" tabIndex={0} data-tip={GATED_REPORT_HOVER} aria-label={GATED_REPORT_HOVER}>
			{currency === 'EUR' ? '€' : '$'}
		</span>
	);
}
