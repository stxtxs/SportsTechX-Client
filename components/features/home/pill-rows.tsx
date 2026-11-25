'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

/**
 * Preference pills on at most two lines (Home, 4.3). When more don't fit, the
 * last pill is "+N" (the number hidden), in the same pill style, linking to
 * Preferences. Re-measured as the window width changes.
 */
const GAP = 6;
const ROWS = 2;

export function PillRows({ pills, moreHref }: { pills: string[]; moreHref: string }) {
	const boxRef = useRef<HTMLDivElement>(null);
	const measureRef = useRef<HTMLDivElement>(null);
	const [width, setWidth] = useState(0);
	const [sizes, setSizes] = useState<number[]>([]);
	const [moreW, setMoreW] = useState(0);

	useEffect(() => {
		const box = boxRef.current, m = measureRef.current;
		if (!box || !m) return;
		const ro = new ResizeObserver(() => {
			setWidth(box.clientWidth);
			const els = [...m.querySelectorAll<HTMLElement>('[data-pill]')];
			const next = els.map((el) => el.offsetWidth);
			setSizes((prev) => (prev.length === next.length && prev.every((w, i) => w === next[i]) ? prev : next));
			setMoreW(m.querySelector<HTMLElement>('[data-more]')?.offsetWidth ?? 0);
		});
		ro.observe(box);
		ro.observe(m);
		return () => ro.disconnect();
	}, []);

	const count = fitCount(sizes, width, moreW);
	const hidden = pills.length - count;
	return (
		<div className="scout-tags scout-tags--rows" ref={boxRef}>
			{pills.slice(0, count).map((p) => <span key={p} className="scout-tag">{p}</span>)}
			{hidden > 0 && <Link href={moreHref} className="scout-tag scout-tag--more" aria-label={`${hidden} more preferences`}>+{hidden}</Link>}
			<div className="scout-tags scout-tags--measure" ref={measureRef} aria-hidden="true">
				{pills.map((p) => <span key={p} data-pill className="scout-tag">{p}</span>)}
				<span data-more className="scout-tag">+{Math.max(pills.length, 10)}</span>
			</div>
		</div>
	);
}

/** How many pills fit on two lines, leaving room for "+N" when some don't. */
function fitCount(sizes: number[], width: number, moreW: number): number {
	if (!width || !sizes.length) return sizes.length;
	const rowsFor = (n: number, extra: number) => {
		let rows = 1, x = 0;
		const ws = [...sizes.slice(0, n), ...(extra ? [extra] : [])];
		for (const w of ws) {
			const need = x === 0 ? w : x + GAP + w;
			if (need > width && x > 0) { rows++; x = w; } else x = need;
		}
		return rows;
	};
	if (rowsFor(sizes.length, 0) <= ROWS) return sizes.length;
	let n = sizes.length - 1;
	while (n > 0 && rowsFor(n, moreW) > ROWS) n--;
	return n;
}
