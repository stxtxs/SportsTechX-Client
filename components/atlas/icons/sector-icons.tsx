/**
 * The three Framework sectors as thin line icons, in the style of
 * sportstechx.com's audience pills (rounded strokes, currentColor):
 *
 *   Athlete Tech   → a running figure
 *   Fan Tech       → two people (the landing site's own "fans" glyph, redrawn on 24px)
 *   Executive Tech → a briefcase
 *
 * Colour comes from the parent (the Framework pillar colour).
 */
type IconProps = { size?: number; strokeWidth?: number };

const svg = (size: number, strokeWidth: number, children: React.ReactNode) => (
	<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
		{children}
	</svg>
);

export function AthleteIcon({ size = 16, strokeWidth = 1.75 }: IconProps) {
	return svg(size, strokeWidth, <>
		<circle cx="15" cy="4.5" r="2" />
		<path d="M12.5 8 10 14" />
		<path d="M10 14l3.5 2.5L12 21" />
		<path d="M10 14l-2.5 4H4" />
		<path d="M6.5 10.5 9 8.5l3.5-.5 2.5 3 3 1" />
	</>);
}

export function FanIcon({ size = 16, strokeWidth = 1.75 }: IconProps) {
	return svg(size, strokeWidth, <>
		<circle cx="9" cy="8" r="3.25" />
		<path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
		<path d="M15.5 4.9a3.25 3.25 0 0 1 0 6.2" />
		<path d="M17.5 14.4c2.1.7 3.5 2.7 3.5 5.1" />
	</>);
}

export function ExecutiveIcon({ size = 16, strokeWidth = 1.75 }: IconProps) {
	return svg(size, strokeWidth, <>
		<rect x="3" y="7" width="18" height="13" rx="2" />
		<path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
		<path d="M3 12.5h18" />
		<path d="M11 12.5V14h2v-1.5" />
	</>);
}

/** Framework pillar slug → its icon. */
export const SECTOR_ICONS: Record<string, (p: IconProps) => React.ReactElement> = {
	activity_performance: AthleteIcon,
	fans_content: FanIcon,
	management_organisation: ExecutiveIcon,
};
