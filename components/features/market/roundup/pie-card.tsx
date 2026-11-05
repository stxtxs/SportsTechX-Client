'use client';

import { useState, type ReactNode } from 'react';
import { Info } from 'lucide-react';
import { Card, Seg, paletteAt } from '@/components/atlas';
import { Modal } from '@/components/atlas/patterns/modal';
import { fmtM, type Grouping, type Metric, type RoundupMode } from './roundup-format';

/**
 * One IH roundup pie: per-card Amount/Count toggle, title + info button that
 * opens the "Complete Breakdown" table, and a full pie (not a donut) with
 * leader-line labels on slices over 5% and a value + % tooltip.
 *
 * IH slice order is the server's `ORDER BY deal_count DESC`; Country shows the
 * first 10 of that order only (no "Others" slice), and its tooltip % is of
 * those 10. The breakdown lists every group, sorted by the active metric.
 */
export function PieCard({ mode, title, plural, dimension, rows, defaultMetric, extra, top }: {
	mode: RoundupMode;
	/** e.g. "Funding by Sector". */
	title: string;
	/** Plural noun for the breakdown description ("sectors", "countries"). */
	plural: string;
	/** First breakdown column header ("Sector", "Country"). */
	dimension: string;
	rows: Grouping[];
	defaultMetric: Metric;
	extra?: ReactNode;
	top?: number;
}) {
	const [metric, setMetric] = useState<Metric>(defaultMetric);
	const [open, setOpen] = useState(false);
	const val = (g: Grouping) => (metric === 'amount' ? g.total_amount : g.deal_count);
	const fmt = (n: number) => (metric === 'amount' ? fmtM(n) : `${n.toLocaleString()} deal${n === 1 ? '' : 's'}`);

	const ordered = [...rows].sort((a, b) => b.deal_count - a.deal_count || b.total_amount - a.total_amount);
	const shown = top ? ordered.slice(0, top) : ordered;
	const slices = shown.map((g, i) => ({ name: g.label, v: val(g), color: paletteAt(i) })).filter((s) => s.v > 0);

	const all = [...rows].sort((a, b) => val(b) - val(a));
	const allSum = all.reduce((a, x) => a + val(x), 0);

	return (
		<Card style={{ padding: 24, minWidth: 0 }}>
			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
				<Seg<Metric> ariaLabel="Metric" value={metric} onChange={setMetric} options={[{ key: 'amount', label: 'Amount' }, { key: 'count', label: 'Count' }]} />
				{extra}
			</div>
			<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
				<h3 style={{ margin: 0, fontFamily: 'var(--a-font)', fontSize: 15, fontWeight: 600, color: 'var(--a-ink)' }}>{title}</h3>
				<button type="button" aria-label={`${title} - complete breakdown`} title="Complete breakdown" onClick={() => setOpen(true)}
					style={{ display: 'inline-grid', placeItems: 'center', width: 24, height: 24, padding: 0, border: 0, borderRadius: 6, background: 'none', color: 'var(--a-muted)', cursor: 'pointer' }}>
					<Info size={16} />
				</button>
			</div>

			{slices.length === 0
				? <div style={{ height: 320, display: 'grid', placeItems: 'center', fontSize: 13, color: 'var(--a-faint)' }}>No data for this view.</div>
				: <Pie slices={slices} fmt={fmt} />}

			{open && (
				<Modal open onOpenChange={(o) => { if (!o) setOpen(false); }} title={`${title} - Complete Breakdown`} width={640}>
					<div style={{ fontSize: 13, color: 'var(--a-muted)', marginBottom: 12 }}>
						Detailed view of all {plural} with {metric === 'amount' ? (mode === 'ma' ? 'M&A amounts' : 'funding amounts') : 'deal counts'} and percentages
					</div>
					<div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
						<div style={rowStyle(true)}>
							<span>{dimension}</span>
							<span style={{ textAlign: 'right' }}>{metric === 'amount' ? (mode === 'ma' ? 'Amount ($M)' : 'Funding Amount') : 'Deal Count'}</span>
							<span style={{ textAlign: 'right' }}>Percentage</span>
						</div>
						{all.map((g) => (
							<div key={g.label} style={rowStyle(false)}>
								<span style={{ fontWeight: 600 }}>{g.label}</span>
								<span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{metric === 'amount' ? fmtM(g.total_amount) : g.deal_count}</span>
								<span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{allSum > 0 ? ((val(g) / allSum) * 100).toFixed(1) : '0.0'}%</span>
							</div>
						))}
					</div>
				</Modal>
			)}
		</Card>
	);
}

const rowStyle = (head: boolean): React.CSSProperties => ({
	display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 130px 90px', gap: 12, padding: head ? '4px 0 8px' : '9px 0',
	borderBottom: '1px solid var(--a-border)', fontSize: head ? 12 : 13,
	color: head ? 'var(--a-faint)' : 'var(--a-ink)',
});

/** IH label wrapping: break into lines of at most 10 characters. */
function wrap(name: string): string[] {
	const lines: string[] = [];
	let cur = '';
	for (const w of name.split(' ')) {
		if (cur.length + w.length + 1 > 10) { if (cur) lines.push(cur); cur = w; }
		else cur = cur ? `${cur} ${w}` : w;
	}
	if (cur) lines.push(cur);
	return lines;
}

const W = 360, H = 320, CX = W / 2, CY = H / 2, R = 92;

/** Full SVG pie, recharts geometry (starts at 3 o'clock, counter-clockwise). */
function Pie({ slices, fmt }: { slices: { name: string; v: number; color: string }[]; fmt: (n: number) => string }) {
	const [tip, setTip] = useState<{ i: number; x: number; y: number } | null>(null);
	const total = slices.reduce((a, s) => a + s.v, 0);
	const pt = (deg: number, r: number) => [CX + r * Math.cos((-deg * Math.PI) / 180), CY + r * Math.sin((-deg * Math.PI) / 180)] as const;

	let acc = 0;
	const arcs = slices.map((s) => {
		const a0 = (acc / total) * 360;
		acc += s.v;
		const a1 = (acc / total) * 360;
		const [x0, y0] = pt(a0, R), [x1, y1] = pt(a1, R);
		const d = a1 - a0 >= 359.999
			? `M${CX - R},${CY} a${R},${R} 0 1 0 ${2 * R},0 a${R},${R} 0 1 0 ${-2 * R},0 Z`
			: `M${CX},${CY} L${x0},${y0} A${R},${R} 0 ${a1 - a0 > 180 ? 1 : 0} 0 ${x1},${y1} Z`;
		return { ...s, d, mid: (a0 + a1) / 2, pct: s.v / total };
	});

	const hovered = tip ? arcs[tip.i] : null;
	return (
		<div style={{ position: 'relative' }} onMouseLeave={() => setTip(null)}>
			<svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', maxHeight: H, overflow: 'visible' }}>
				{arcs.map((s, i) => (
					<path key={s.name} d={s.d} fill={s.color} stroke="var(--a-surface)" strokeWidth={1}
						opacity={tip === null || tip.i === i ? 1 : 0.55} style={{ cursor: 'pointer', transition: 'opacity .15s' }}
						onMouseMove={(e) => {
							const box = (e.currentTarget.ownerSVGElement?.parentElement as HTMLElement).getBoundingClientRect();
							setTip({ i, x: e.clientX - box.left + 12, y: e.clientY - box.top + 12 });
						}} />
				))}
				{arcs.map((s) => {
					if (s.pct <= 0.05) return null;
					const [lx0, ly0] = pt(s.mid, R + 4), [lx1, ly1] = pt(s.mid, R + 16), [tx, ty] = pt(s.mid, R + 22);
					const lines = wrap(s.name);
					return (
						<g key={`l-${s.name}`} pointerEvents="none">
							<line x1={lx0} y1={ly0} x2={lx1} y2={ly1} stroke="var(--a-muted)" strokeWidth={1} />
							<text x={tx} y={ty - ((lines.length - 1) * 13) / 2} fill="var(--a-ink)" fontSize={11} fontWeight={500}
								textAnchor={tx > CX ? 'start' : 'end'} dominantBaseline="central" style={{ fontFamily: 'var(--a-body)' }}>
								{lines.map((l, i) => <tspan key={i} x={tx} dy={i === 0 ? 0 : 13}>{l}</tspan>)}
							</text>
						</g>
					);
				})}
			</svg>
			{hovered && tip && (
				<div style={{
					position: 'absolute', left: tip.x, top: tip.y, pointerEvents: 'none', zIndex: 5, whiteSpace: 'nowrap',
					background: 'var(--a-chart-tip-bg)', color: 'var(--a-chart-tip-ink)', borderRadius: 6, padding: '7px 9px',
					fontFamily: 'var(--a-mono)', fontSize: 11,
				}}>
					<div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
						<span style={{ width: 8, height: 8, borderRadius: 2, background: hovered.color }} />{hovered.name}
					</div>
					<div style={{ fontWeight: 700 }}>{fmt(hovered.v)} ({(hovered.pct * 100).toFixed(1)}%)</div>
				</div>
			)}
		</div>
	);
}
