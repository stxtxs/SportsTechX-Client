'use client';

import { Combobox } from '@/components/atlas/ui/combobox';
import { cx } from '@/components/atlas';

export type StageTone = 'neutral' | 'navy' | 'ok' | 'warn' | 'danger';
export interface StageOption { key: string; label: string; tone: StageTone }

/**
 * A stage shown as a pill (the Badge look) that is also its own control:
 * click it to pick another stage (2.13). The menu is the standard dropdown.
 */
export function StagePill({ value, options, onChange, ariaLabel }: {
	value: string;
	options: StageOption[];
	onChange: (key: string) => void;
	ariaLabel: string;
}) {
	const tone = options.find((o) => o.key === value)?.tone ?? 'neutral';
	return (
		<Combobox
			className={cx('atlas-badge', `atlas-badge--${tone}`, 'atlas-stage-pill')}
			ariaLabel={ariaLabel}
			value={value}
			onChange={(v) => { if (v !== value) onChange(v); }}
			options={options.map((o) => [o.key, o.label] as [string, string])}
		/>
	);
}

/** Order of a stage in its list, for sorting by stage. Unknown stages sort last. */
export const stageRank = (options: StageOption[], key: string | null | undefined) => {
	const i = options.findIndex((o) => o.key === key);
	return i < 0 ? options.length : i;
};
