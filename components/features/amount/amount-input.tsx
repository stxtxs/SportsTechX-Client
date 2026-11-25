'use client';

import { useState, useSyncExternalStore } from 'react';
import { convert, displayCurrency, subscribeCurrency, type DisplayCurrency } from '@/lib/currency';
import './amount-input.css';

/**
 * An amount field in the viewer's currency (D1, 2.4).
 *
 * The figure is stored in `storeCurrency` (the column's own currency) and shown
 * in the currency chosen in Preferences, with thousands separators as you type. Conversion uses the current year's
 * rate, the same one `fmtAmount` uses for an undated amount, so a stored value
 * shows the figure every other screen shows.
 */
const SYMBOL: Record<DisplayCurrency, string> = { USD: '$', EUR: '€' };

const group = (digits: string): string => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const digitsOf = (s: string): string => s.replace(/[^\d]/g, '').replace(/^0+(?=\d)/, '');

/** Stored amount → whole units in the display currency, as grouped digits. */
function toText(value: number | null, store: DisplayCurrency, shown: DisplayCurrency): string {
	if (value == null || !Number.isFinite(value) || value <= 0) return '';
	return group(String(Math.round(convert(value, store, shown))));
}

export function AmountInput({ value, onChange, storeCurrency, placeholder, ariaLabel, id }: {
	/** In `storeCurrency`; null when empty. */
	value: number | null;
	onChange: (next: number | null) => void;
	storeCurrency: DisplayCurrency;
	/** Whole units in the display currency, e.g. 250000. Shown grouped. */
	placeholder?: number;
	ariaLabel?: string;
	id?: string;
}) {
	const shown = useSyncExternalStore(subscribeCurrency, displayCurrency, () => 'USD' as DisplayCurrency);
	const [text, setText] = useState(() => toText(value, storeCurrency, shown));
	// Follow outside changes (load, reset, currency switch) without fighting the
	// user's typing: re-derive the text only when what's typed no longer stands
	// for the stored value. Adjusting state during render, not in an effect.
	const typed = Number(digitsOf(text) || NaN);
	const typedStored = Number.isFinite(typed) ? Math.round(convert(typed, shown, storeCurrency)) : null;
	const current = value == null ? null : Math.round(value);
	if (typedStored !== current) {
		const next = toText(value, storeCurrency, shown);
		if (next !== text) setText(next);
	}

	const onType = (raw: string) => {
		const d = digitsOf(raw).slice(0, 15);
		setText(d ? group(d) : '');
		onChange(d ? Math.round(convert(Number(d), shown, storeCurrency)) : null);
	};

	return (
		<div className="amt">
			<label className="amt__box">
				<span className="amt__sym" aria-hidden="true">{SYMBOL[shown]}</span>
				<input
					id={id}
					className="amt__input"
					type="text"
					inputMode="numeric"
					autoComplete="off"
					aria-label={ariaLabel}
					placeholder={placeholder != null ? group(String(placeholder)) : undefined}
					value={text}
					onChange={(e) => onType(e.target.value)}
				/>
			</label>
		</div>
	);
}
