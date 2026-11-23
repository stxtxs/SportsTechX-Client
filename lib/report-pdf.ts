import { toast } from 'sonner';
import { apiRequest } from '@/lib/query-client';

/**
 * Download a report's PDF. (Viewing happens in-app at /reports/:slug — see
 * pdf-report-view — so a raw storage link is never shown.)
 *
 * The URL has to be minted per request: self-hosted PDFs get a fresh signed
 * URL from `/api/reports/versions/:id/pdf-url` (tier-gated with the caller's
 * own token), so nothing here can be a plain href. The `download=1` URL
 * carries a Content-Disposition, so an anchor click saves the file in place.
 */
interface Version { id: string; language_code: string | null; access_tier: string }

async function versionFor(slug: string, versionId?: string): Promise<string | null> {
	if (versionId) return versionId;
	const res = await apiRequest('GET', `/api/reports/${encodeURIComponent(slug)}/versions`);
	if (!res.ok) return null;
	const versions = (await res.json()) as Version[];
	// The server lists only what this plan may open: the paid edition first when there is one
	// (a Raise/Scout reader gets the full PDF, not the free one), then English.
	const rank = (v: Version) => (v.access_tier === 'explore' ? 0 : 10) + (v.language_code === 'en' ? 1 : 0);
	return [...versions].sort((a, b) => rank(b) - rank(a))[0]?.id ?? null;
}

async function pdfUrl(versionId: string): Promise<string | null> {
	const res = await apiRequest('GET', `/api/reports/versions/${versionId}/pdf-url?download=1`);
	if (!res.ok) return null;
	return ((await res.json()) as { url?: string }).url ?? null;
}

export async function downloadReport(slug: string, versionId?: string): Promise<void> {
	try {
		const id = await versionFor(slug, versionId);
		const url = id ? await pdfUrl(id) : null;
		if (!url) throw new Error('no pdf');
		// Count the download for admin report analytics (fire-and-forget: never blocks or fails the download).
		void apiRequest('POST', `/api/reports/${encodeURIComponent(slug)}/downloads`, {}).catch(() => {});
		const a = document.createElement('a');
		a.href = url;
		a.rel = 'noopener';
		document.body.appendChild(a);
		a.click();
		a.remove();
	} catch {
		toast.error('This report could not be downloaded. It may need another solution.');
	}
}
