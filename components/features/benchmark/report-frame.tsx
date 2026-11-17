'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { AtlasLogo, Loading, Screen } from '@/components/atlas';
import { hrefOf } from '@/lib/routes';
import './benchmark.css';

/**
 * The page frame for R1, R3 and the R2 upgrade screen. The report routes are
 * chrome-less (no sidebar — see app/(report)/layout.tsx), so this gives them
 * the Atlas surface, a way home and a way back to the library.
 */
export function ReportFrame({ children, loading }: { children?: ReactNode; loading?: boolean }) {
	return (
		<div className="atlas bm-page">
			<div className="bm-topbar">
				<Link href={hrefOf('home')} aria-label="Atlas home"><AtlasLogo height={24} /></Link>
				<Link href={hrefOf('reports')}><ArrowLeft size={13} aria-hidden="true" /> All reports</Link>
			</div>
			<Screen width={960}>{loading ? <Loading /> : children}</Screen>
		</div>
	);
}
