'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { qk } from '@/lib/query-keys';
import { ReportNav } from '../report-nav';
import { DARK, LIGHT } from '../ftabr26/lib/report-theme';
import { LandingFooter } from '@/components/landing/landing-footer';
import '@/components/landing/landing.css';
import './methodology.css';

/**
 * Methodology template: a single note page (title, back link, paragraphs), styled like the
 * web reports — same header and footer, dark by default. Its words are the report's own
 * document (reports.content: title, backLabel, backHref, paragraphs).
 */
type Doc = { title: string; backLabel: string; backHref: string; paragraphs: string[] };

export default function ReportMethodology({ slug = 'methodology', content }: { slug?: string; content?: Record<string, unknown> | null; preview?: boolean }) {
	const { data, isLoading } = useSWR<{ content?: Doc | null }>(content !== undefined ? null : qk.reports.detail(slug));
	const doc = (content !== undefined ? content : data?.content) as Doc | null | undefined;
	const [isDark, setIsDark] = useState(true);
	const [isMobile, setIsMobile] = useState(false);
	const [back, setBack] = useState<string | null>(null);
	useEffect(() => {
		const mq = window.matchMedia('(max-width: 639px)');
		const on = () => setIsMobile(mq.matches);
		on(); mq.addEventListener('change', on);
		// The back link returns to the report that linked here; otherwise to the document's default.
		try { const r = new URL(document.referrer); if (r.origin === location.origin && r.pathname.startsWith('/reports/') && r.pathname !== location.pathname) setBack(r.pathname); } catch { /* no referrer */ }
		return () => mq.removeEventListener('change', on);
	}, []);
	const t = isDark ? DARK : LIGHT;

	return (
		<div style={{ minHeight: '100vh', background: t.bg, color: isDark ? '#bed0e3' : t.textSec, fontFamily: "'DM Sans', sans-serif", transition: 'background 0.35s, color 0.35s' }}>
			<ReportNav items={[]} activeIndex={0} isDark={isDark} isMobile={isMobile} theme={t}
				mobileOpen={false} onToggleMobile={() => {}} onToggleDark={() => setIsDark((d) => !d)} onNavigate={() => {}} />
			<div style={{ maxWidth: 800, margin: '0 auto', padding: '132px 24px 60px' }}>
				{isLoading ? null : !doc?.paragraphs ? (
					<p style={{ fontSize: 16 }}>This page is being published. Check back shortly.</p>
				) : (
					<>
						<a href={back ?? doc.backHref} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: "'DM Mono', monospace", fontSize: 12, letterSpacing: 2, color: '#ff3c7d', textDecoration: 'none', textTransform: 'uppercase', marginBottom: 40 }}>
							{doc.backLabel}
						</a>

						<h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(36px, 5vw, 56px)', letterSpacing: 4, color: t.titleColor, margin: '0 0 32px' }}>
							{doc.title}
						</h1>

						<div className="methodology-body" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, lineHeight: 1.8, color: isDark ? 'rgba(190, 208, 227, 0.75)' : t.textMuted }}>
							{doc.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
						</div>
					</>
				)}
			</div>
			<div className="lp"><LandingFooter /></div>
		</div>
	);
}
