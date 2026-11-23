'use client';

import { use, useEffect, useRef, useState } from 'react';
import { ReportErrorBoundary } from '@/components/features/reports/gster26/error-boundary';
import { REPORT_TEMPLATES } from '@/components/features/reports/templates';

/** Only the admin panel may drive this page (and only it may frame it — next.config). */
const ADMIN_ORIGIN = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'https://www.admin.sportstechx.com';
// The www host is accepted even if the env var still names the old bare host.
const allowed = (origin: string) => origin === ADMIN_ORIGIN || origin === 'https://www.admin.sportstechx.com' || /^http:\/\/localhost(:\d+)?$/.test(origin);

/**
 * The admin editor's live preview of a custom report template (/report-preview/<template>?slug=…):
 * the real template, rendered from the draft document the editor posts in — so every keystroke
 * shows exactly as it will on the report. The template has no content of its own; the draft is
 * all of it. Frozen chart data still loads from the report (`slug`).
 *
 * Messages (from the framing admin window only), `<t>` = the template name:
 *   → <t>:hello                 ← <t>:ready
 *   → <t>:content { content }   re-render with this draft
 *   → <t>:jump { anchor }       scroll to a part (e.g. '#peak2026')
 */
export default function ReportTemplatePreviewPage({ params }: { params: Promise<{ template: string }> }) {
	const { template } = use(params);
	const tpl = REPORT_TEMPLATES[template];
	const [content, setContent] = useState<Record<string, unknown> | null>(null);
	const [slug, setSlug] = useState('');
	const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

	useEffect(() => {
		setSlug(new URLSearchParams(window.location.search).get('slug') ?? template);
		const jump = (anchor: string) => {
			timers.current.forEach(clearTimeout);
			// Templates lay out lazily after mount; re-aim as the page settles. Smooth-scrolling
			// templates listen for `<t>:jump`; the others are scrolled directly.
			timers.current = [0, 400, 1200].map((ms) => setTimeout(() => {
				window.dispatchEvent(new CustomEvent(`${template}:jump`, { detail: anchor }));
				if (template === 'benchmark26') document.querySelector(anchor)?.scrollIntoView({ block: 'start' });
			}, ms));
		};
		const onMessage = (e: MessageEvent) => {
			if (e.source !== window.parent || !allowed(e.origin)) return;
			const m = e.data as { type?: string; content?: unknown; anchor?: unknown };
			if (m?.type === `${template}:hello`) window.parent.postMessage({ type: `${template}:ready` }, e.origin);
			else if (m?.type === `${template}:content` && m.content && typeof m.content === 'object') setContent(m.content as Record<string, unknown>);
			else if (m?.type === `${template}:jump` && typeof m.anchor === 'string' && /^#[\w-]+$/.test(m.anchor)) jump(m.anchor);
		};
		window.addEventListener('message', onMessage);
		// Announce once listening — the editor's hello can arrive before this page has hydrated.
		try {
			const parentOrigin = document.referrer ? new URL(document.referrer).origin : '';
			if (window.parent !== window && allowed(parentOrigin)) window.parent.postMessage({ type: `${template}:ready` }, parentOrigin);
		} catch { /* no usable referrer: the editor's hello still works */ }
		return () => { window.removeEventListener('message', onMessage); timers.current.forEach(clearTimeout); };
	}, [template]);

	if (!tpl) return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>Unknown report template.</div>;
	if (!content || !slug) return <div style={{ minHeight: '100vh', background: tpl.background }} />;
	return (
		// Shows the error while the draft breaks the page; the next draft retries.
		<ReportErrorBoundary resetKey={content}>
			<tpl.Component slug={slug} content={content} preview />
		</ReportErrorBoundary>
	);
}
