import { DollarSign } from 'lucide-react';
import { VerifiedBadge } from '@/components/atlas/icons/verified-badge';
import { SECTOR_ICONS } from '@/components/atlas/icons/sector-icons';
import { PILLARS } from '@/components/features/framework/framework-content';

/**
 * Small self-describing marks for company lists: an icon whose meaning shows
 * on hover (an instant tooltip from `data-tip`, styled by `.has-tip`) and to
 * screen readers (aria-label), instead of a pill or a column of text. `.has-tip`
 * also lifts the mark above a row's stretched link, which otherwise swallowed
 * the hover.
 */

/**
 * Verified (the Atlas verified badge) and, for Scout only, actively fundraising
 * ($). In a table they sit in their own column with fixed slots, so they line up
 * down the page; `inline` (a tile, next to the name) shows only those that apply.
 * Pass `raising` only when the viewer may see it (see `useCanSeeFundraising`).
 */
export function StatusMarks({ verified, raising, showRaisingSlot, inline }: {
	verified?: boolean;
	raising?: boolean;
	/** Table only: keep an empty $ slot so columns stay aligned. */
	showRaisingSlot?: boolean;
	inline?: boolean;
}) {
	const tick = verified && (
		<span className="co-mark has-tip" data-tip="Verified" aria-label="Verified" role="img"><VerifiedBadge size={15} /></span>
	);
	const dollar = raising && (
		<span className="co-mark has-tip" style={{ color: 'var(--a-warn-ring)' }} data-tip="Actively fundraising" aria-label="Actively fundraising" role="img">
			<DollarSign size={15} strokeWidth={1.75} aria-hidden="true" />
		</span>
	);
	if (inline) return verified || raising ? <span className="co-marks co-marks--inline">{tick}{dollar}</span> : null;
	return (
		<span className="co-marks">
			{tick || <span className="co-mark" />}
			{showRaisingSlot && (dollar || <span className="co-mark" />)}
		</span>
	);
}

/** The company's Sector (Athlete / Fan / Executive Tech) as its icon, in the Framework colour; its name on hover. */
export function SectorMark({ slug, size = 15 }: { slug: string | null | undefined; size?: number }) {
	const key = slug?.split('__')[0] ?? '';
	const pillar = PILLARS[key];
	const Icon = SECTOR_ICONS[key];
	if (!pillar || !Icon) return null;
	return (
		<span className="co-mark has-tip" style={{ color: pillar.color }} data-tip={pillar.badge} aria-label={pillar.badge} role="img">
			<Icon size={size} />
		</span>
	);
}
