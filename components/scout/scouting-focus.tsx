'use client';

import { useSyncExternalStore } from 'react';
import { Chip, Section } from '@/components/explore/interests-editor';
import { AmountInput } from '@/components/features/amount/amount-input';
import { convert, displayCurrency, subscribeCurrency, type DisplayCurrency } from '@/lib/currency';
import { fmtAmount } from '@/lib/format';
import { FOCUS_OPTIONS, tractionFloor, tractionOptions, type ScoutFocus } from './scout-focus';

/**
 * The Scouting focus block at the end of Preferences on Scout (D1, 1.1, 1.4):
 * Stages · Cheque size · Lead or follow · Minimum traction. What a Scout looks
 * for and avoids is under Tags → Include / Avoid. Edited in place like the rest
 * of the page; every option is the Preferences pill (2.1, 2.2).
 */
export function ScoutingFocus({ value, onChange }: { value: ScoutFocus; onChange: (next: ScoutFocus) => void }) {
	const set = (p: Partial<ScoutFocus>) => onChange({ ...value, ...p });
	const toggle = (list: string[], o: string) => (list.includes(o) ? list.filter((x) => x !== o) : [...list, o]);
	const chequeBad = value.chequeMin != null && value.chequeMax != null && value.chequeMin > value.chequeMax;
	const active = useSyncExternalStore(subscribeCurrency, displayCurrency, () => 'USD' as DisplayCurrency);
	// A cheque is kept in the currency it was typed in (9): typing in another
	// currency moves both ends into it.
	const setCheque = (end: 'chequeMin' | 'chequeMax', v: number | null) => {
		const from = value.chequeCurrency;
		const inActive = (n: number | null) => (n == null ? null : Math.round(convert(n, from, active)));
		set({
			chequeMin: end === 'chequeMin' ? inActive(v) : inActive(value.chequeMin),
			chequeMax: end === 'chequeMax' ? inActive(v) : inActive(value.chequeMax),
			chequeCurrency: active,
		});
	};
	// The options are in the active currency; a floor chosen in the other one stays picked, shown converted.
	const traction = tractionOptions(active);
	const tractionLine = value.traction && !traction.includes(value.traction) ? [...traction, value.traction] : traction;

	return (
		<Section title="Scouting focus">
			<div className="scout-focus">
				<Field label="Stages">
					<div className="int-chips">
						{FOCUS_OPTIONS.stages.map((s) => (
							<Chip key={s} on={value.stages.includes(s)} onClick={() => set({ stages: toggle(value.stages, s) })}>{stageLabel(s)}</Chip>
						))}
					</div>
				</Field>

				<Field label="Cheque size">
					<div className="scout-focus__range">
						<AmountInput ariaLabel="Cheque size, minimum" storeCurrency={value.chequeCurrency} value={value.chequeMin} onChange={(v) => setCheque('chequeMin', v)} placeholder={250000} />
						<span className="scout-focus__to" aria-hidden="true">–</span>
						<AmountInput ariaLabel="Cheque size, maximum" storeCurrency={value.chequeCurrency} value={value.chequeMax} onChange={(v) => setCheque('chequeMax', v)} placeholder={1000000} />
					</div>
					{chequeBad && <p className="scout-focus__err" role="alert">The minimum is above the maximum.</p>}
				</Field>

				<Field label="Lead or follow">
					<div className="int-chips">
						{FOCUS_OPTIONS.invStyle.map((s) => (
							<Chip key={s} on={value.invStyle === s} onClick={() => set({ invStyle: value.invStyle === s ? '' : s })}>{s}</Chip>
						))}
					</div>
				</Field>

				<Field label="Minimum traction">
					<div className="int-chips">
						{tractionLine.map((t) => (
							<Chip key={t} on={value.traction === t} onClick={() => set({ traction: value.traction === t ? '' : t })}>{tractionLabel(t)}</Chip>
						))}
					</div>
				</Field>

			</div>
		</Section>
	);
}

/** Stage names in sentence case, as the Preferences pills (2.1). Stored names are unchanged. */
const STAGE_LABEL: Record<string, string> = {
	'Pre Seed Round': 'Pre-seed round', 'Seed Round': 'Seed round', 'Late Stage Venture': 'Late-stage venture',
};
export function stageLabel(s: string): string {
	return STAGE_LABEL[s] ?? s;
}

/** "€500k+ ARR" in the viewer's currency, in the master format (2.4); stored as chosen. */
export function tractionLabel(t: string): string {
	const floor = tractionFloor(t);
	return floor ? `${fmtAmount(floor.amount, floor.currency)}+ ARR` : t;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="scout-focus__field">
			<div className="scout-focus__label">{label}</div>
			{children}
		</div>
	);
}

