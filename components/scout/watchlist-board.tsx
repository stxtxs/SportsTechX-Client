'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Empty, Loading, Logo, cx } from '@/components/atlas';
import { Combobox } from '@/components/atlas/ui/combobox';
import { useWatchlistCompanies } from '@/components/features/watchlists/use-company-watchlists';
import { BOARD_STAGES, type BoardStage } from './sample-data';
import { moveCompanyStage } from './watchlist-stages';
import { companyHref, hrefOf } from '@/lib/routes';

const STAGE_TO_API: Record<BoardStage, string> = {
	'Identified': 'identified', 'Reviewing': 'reviewing', 'Meeting': 'meeting',
	'Due Diligence': 'due_diligence', 'Passed': 'passed', 'Invested': 'invested',
};
const API_TO_STAGE: Record<string, BoardStage> = Object.fromEntries(
	Object.entries(STAGE_TO_API).map(([k, v]) => [v, k as BoardStage]),
) as Record<string, BoardStage>;

export function WatchlistBoard({ id }: { id: string }) {
	const { companies, isLoading } = useWatchlistCompanies(id);
	const [dragging, setDragging] = useState<string | null>(null);
	const [over, setOver] = useState<BoardStage | null>(null);
	const { setEl: boardRef, update: onBoardScroll, fadeLeft, fadeRight } = useEdgeFade();
	const stageOf = (c: { id: string; stage?: string | null }): BoardStage =>
		(c.stage ? API_TO_STAGE[c.stage] : null) ?? 'Identified';
	// Same save as the Stage pill in List view (watchlist-stages).
	const move = (cid: string, s: BoardStage) => moveCompanyStage(id, cid, STAGE_TO_API[s]);

	if (isLoading) return <Loading />;
	return (
		<>
			{companies.length === 0 ? <Empty>No companies yet. <a href={hrefOf('companies')} style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>Browse companies</a> and use &quot;Add to watchlist&quot;.</Empty> : (
				<div ref={boardRef} onScroll={onBoardScroll} className={cx('scout-board', fadeLeft && 'fade-left', fadeRight && 'fade-right')}>
					{BOARD_STAGES.map((s) => {
						const cards = companies.filter((c) => stageOf(c) === s);
						return (
							<section
								key={s}
								className={cx('scout-board__col', over === s && 'is-over')}
								onDragOver={(e) => { e.preventDefault(); setOver(s); }}
								onDragLeave={() => setOver((o) => (o === s ? null : o))}
								onDrop={(e) => { e.preventDefault(); if (dragging) void move(dragging, s); setDragging(null); setOver(null); }}
								aria-label={`${s}: ${cards.length}`}
							>
								<div className="scout-board__head"><span>{s}</span><span className="scout-board__n">{cards.length}</span></div>
								{cards.map((c) => (
									<article key={c.id} className="scout-board__card" draggable onDragStart={() => setDragging(c.id)} onDragEnd={() => { setDragging(null); setOver(null); }}>
										<div className="scout-board__id">
											<Logo co={{ name: c.name, website: c.website, custom_logo_url: c.custom_logo_url }} size={26} radius={5} />
											<Link href={companyHref(c.slug ?? c.id)} className="scout-board__name">{c.name}</Link>
										</div>
										<div className="scout-board__meta">{[c.primary_sector, c.hq_country].filter(Boolean).join(' · ')}</div>
										{/* No stage dropdown on the card: drag it, or "Move to…" on hover (remaining 3). */}
										<Combobox className="scout-board__move" ariaLabel={`Move ${c.name} to another stage`} placeholder="Move to…" value="" onChange={(v) => void move(c.id, v as BoardStage)} options={BOARD_STAGES.filter((x) => x !== s).map((x) => [x, x] as [string, string])} />
									</article>
								))}
							</section>
						);
					})}
				</div>
			)}
			<p className="scout-muted scout-board__note">Drag companies between stages. Passed companies stay on record and are excluded from future recommendations.</p>
		</>
	);
}

/**
 * Whether a sideways-scrolling row has more to show on either side, so the
 * edge can fade (remaining 3). Re-measured on scroll and on resize.
 */
function useEdgeFade() {
	// A callback ref (element in state), so nothing reads a ref during render.
	const [el, setEl] = useState<HTMLDivElement | null>(null);
	const [edges, setEdges] = useState({ left: false, right: false });
	const update = useCallback(() => {
		if (!el) return;
		const left = el.scrollLeft > 1;
		const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
		setEdges((e) => (e.left === left && e.right === right ? e : { left, right }));
	}, [el]);
	useEffect(() => {
		if (!el) return;
		const ro = new ResizeObserver(update);
		ro.observe(el);
		return () => ro.disconnect();
	}, [el, update]);
	return { setEl, update, fadeLeft: edges.left, fadeRight: edges.right };
}
