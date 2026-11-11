'use client';

import dynamic from 'next/dynamic';
import { ReportErrorBoundary } from '@/components/features/reports/gstvcr26/error-boundary';

// The ported STX flagship is a fully client-side, self-chromed report (particle
// canvas, gsap/ScrollTrigger, Lenis smooth-scroll, Next-incompatible SSR). Mount
// it client-only; a static `gstvcr26` segment takes priority over `[slug]`, so
// this overrides the generic section renderer. Started as a copy of GSTER26.
const ReportGSTVCR26 = dynamic(
	() => import('@/components/features/reports/gstvcr26/report-gstvcr26'),
	{ ssr: false, loading: () => <div style={{ minHeight: '100vh', background: '#0c0f1a' }} /> },
);

export default function Gstvcr26ReportPage() {
	return (
		// If edited copy breaks the page, readers get the report with its original copy instead.
		<ReportErrorBoundary fallback={<ReportErrorBoundary><ReportGSTVCR26 content={{}} /></ReportErrorBoundary>}>
			<ReportGSTVCR26 />
		</ReportErrorBoundary>
	);
}
