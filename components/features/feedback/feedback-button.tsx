'use client';

import { useEffect, useRef, useState, type ClipboardEvent } from 'react';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { ImagePlus, MessageSquarePlus, X } from 'lucide-react';
import { Button, Field, Input, Textarea, cx } from '@/components/atlas';
import { Modal } from '@/components/atlas/patterns/modal';
import { apiRequest } from '@/lib/query-client';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import './feedback.css';

type Kind = 'bug' | 'feedback' | 'feature_request' | 'enhancement';
const KINDS: [Kind, string][] = [['bug', 'Bug'], ['feedback', 'Feedback'], ['feature_request', 'Feature request'], ['enhancement', 'Improvement']];
const SEVERITIES: [string, string][] = [['blocking', 'Blocks me'], ['major', 'Gets in the way'], ['minor', 'Minor']];
const TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_FILES = 5;
const MAX_BYTES = 5 * 1024 * 1024;

interface Shot { file: File; url: string }

/**
 * The top bar's feedback entry point (every page, every plan): report a bug, send feedback,
 * ask for a feature or suggest an improvement, with up to five screenshots. Screenshots go
 * straight to private storage through one-time upload URLs; the report records the page and
 * the browser details so the team can reproduce it.
 */
export function FeedbackButton() {
	const [open, setOpen] = useState(false);
	return (
		<>
			<button type="button" className="atlas-navbar__iconbtn" aria-label="Report a bug or send feedback" title="Report a bug or send feedback" onClick={() => setOpen(true)}>
				<MessageSquarePlus size={15} strokeWidth={1.75} aria-hidden="true" />
			</button>
			{open && <FeedbackModal onClose={() => setOpen(false)} />}
		</>
	);
}

function FeedbackModal({ onClose }: { onClose: () => void }) {
	const pathname = usePathname();
	const [kind, setKind] = useState<Kind>('bug');
	const [severity, setSeverity] = useState('');
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [steps, setSteps] = useState('');
	const [page, setPage] = useState('');
	const [shots, setShots] = useState<Shot[]>([]);
	const [busy, setBusy] = useState(false);
	const [sent, setSent] = useState(false);
	const fileRef = useRef<HTMLInputElement>(null);

	// The page they were on, with its query (filters), editable in case the problem was elsewhere.
	useEffect(() => { setPage(`${window.location.pathname}${window.location.search}`); }, [pathname]);
	// Free the previews.
	useEffect(() => () => shots.forEach((s) => URL.revokeObjectURL(s.url)), [shots]);

	const addFiles = (files: File[]) => {
		const next = [...shots];
		for (const f of files) {
			if (!TYPES.includes(f.type)) { toast.error('Screenshots must be PNG, JPEG or WebP.'); continue; }
			if (f.size > MAX_BYTES) { toast.error(`${f.name || 'Screenshot'} is over 5 MB.`); continue; }
			if (next.length >= MAX_FILES) { toast.error('Up to five screenshots.'); break; }
			next.push({ file: f, url: URL.createObjectURL(f) });
		}
		setShots(next);
	};
	// Paste a screenshot straight from the clipboard.
	const onPaste = (e: ClipboardEvent) => {
		const files = [...e.clipboardData.files].filter((f) => f.type.startsWith('image/'));
		if (files.length) { e.preventDefault(); addFiles(files); }
	};

	const valid = title.trim().length >= 3 && description.trim().length > 0;

	const submit = async () => {
		if (!valid || busy) return;
		setBusy(true);
		try {
			const paths: string[] = [];
			for (const s of shots) {
				const res = await apiRequest('POST', '/api/feedback/screenshot-upload-url', { content_type: s.file.type, size: s.file.size });
				if (!res.ok) throw new Error('Could not upload a screenshot.');
				const { bucket, path, token } = await res.json() as { bucket: string; path: string; token: string };
				const up = await getSupabaseBrowser().storage.from(bucket).uploadToSignedUrl(path, token, s.file, { contentType: s.file.type });
				if (up.error) throw new Error('Could not upload a screenshot.');
				paths.push(path);
			}
			const res = await apiRequest('POST', '/api/feedback', {
				kind, severity: kind === 'bug' && severity ? severity : null,
				title: title.trim(), description: description.trim(), steps: kind === 'bug' ? steps.trim() || null : null,
				page_url: page.trim() || null, page_title: document.title.slice(0, 300), screenshots: paths,
				context: {
					user_agent: navigator.userAgent.slice(0, 500),
					viewport: `${window.innerWidth}×${window.innerHeight}`,
					timezone: Intl.DateTimeFormat().resolvedOptions().timeZone?.slice(0, 80),
					language: navigator.language?.slice(0, 40),
					app_version: (process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? '').slice(0, 12) || undefined,
				},
			});
			if (!res.ok) throw new Error(res.status === 429 ? 'You’ve sent a lot of reports — please try again in a while.' : 'Could not send your report.');
			setSent(true);
		} catch (e) {
			toast.error((e as Error).message || 'Could not send your report.');
		} finally { setBusy(false); }
	};

	if (sent) {
		return (
			<Modal open onOpenChange={(o) => { if (!o) onClose(); }} icon={<MessageSquarePlus size={16} />} title="Thanks — we’ve got it"
				footer={<Button onClick={onClose}>Close</Button>}>
				<p className="atlas-fb__lead">The team will look at it. If it’s a bug we can confirm, you may receive STX credits as a thank-you — we’ll let you know in your notifications.</p>
			</Modal>
		);
	}

	return (
		<Modal open onOpenChange={(o) => { if (!o && !busy) onClose(); }} icon={<MessageSquarePlus size={16} />} title="Send feedback" width={560}
			footer={<>
				<Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
				<Button onClick={() => void submit()} disabled={!valid || busy}>{busy ? 'Sending…' : 'Send'}</Button>
			</>}>
			<div className="atlas-fb" onPaste={onPaste}>
				<div className="atlas-fb__kinds" role="radiogroup" aria-label="What is it?">
					{KINDS.map(([k, label]) => (
						<button key={k} type="button" role="radio" aria-checked={kind === k} className={cx('atlas-fb__kind', kind === k && 'is-on')} onClick={() => setKind(k)}>{label}</button>
					))}
				</div>
				<Field label="Title" required>
					<Input value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)}
						placeholder={kind === 'bug' ? 'e.g. Export button does nothing on Companies' : 'A short summary'} />
				</Field>
				<Field label={kind === 'bug' ? 'What happened?' : 'Details'} required>
					<Textarea value={description} maxLength={5000} rows={4} onChange={(e) => setDescription(e.target.value)}
						placeholder={kind === 'bug' ? 'What you did, what you expected, and what happened instead.' : 'Tell us more.'} />
				</Field>
				{kind === 'bug' && (
					<>
						<Field label="How bad is it?">
							<div className="atlas-fb__kinds" role="radiogroup" aria-label="How bad is it?">
								{SEVERITIES.map(([v, label]) => (
									<button key={v} type="button" role="radio" aria-checked={severity === v} className={cx('atlas-fb__kind', severity === v && 'is-on')} onClick={() => setSeverity(severity === v ? '' : v)}>{label}</button>
								))}
							</div>
						</Field>
						<Field label="Steps to reproduce (optional)">
							<Textarea value={steps} maxLength={5000} rows={3} onChange={(e) => setSteps(e.target.value)} placeholder={'1. Go to …\n2. Click …'} />
						</Field>
					</>
				)}
				<Field label="Page">
					<Input value={page} maxLength={2000} onChange={(e) => setPage(e.target.value)} />
				</Field>
				<Field label={`Screenshots (optional, up to ${MAX_FILES})`}>
					<div className="atlas-fb__shots">
						{shots.map((s, i) => (
							<div key={s.url} className="atlas-fb__shot">
								{/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
								<img src={s.url} alt={`Screenshot ${i + 1}`} />
								<button type="button" aria-label={`Remove screenshot ${i + 1}`} onClick={() => setShots(shots.filter((_, j) => j !== i))}><X size={12} /></button>
							</div>
						))}
						{shots.length < MAX_FILES && (
							<button type="button" className="atlas-fb__add" onClick={() => fileRef.current?.click()}>
								<ImagePlus size={16} aria-hidden="true" /><span>Add</span>
							</button>
						)}
					</div>
					<input ref={fileRef} type="file" accept={TYPES.join(',')} multiple hidden
						onChange={(e) => { addFiles([...(e.target.files ?? [])]); e.target.value = ''; }} />
					<p className="atlas-fb__hint">PNG, JPEG or WebP, up to 5 MB each. You can also paste a screenshot here.</p>
				</Field>
			</div>
		</Modal>
	);
}
