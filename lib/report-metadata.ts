import type { Metadata } from 'next';

/**
 * Share-card metadata (LinkedIn, Slack, WhatsApp, X…) for report pages. Preview
 * bots are let past the login gate on /reports/* (lib/public-paths.ts →
 * isLinkPreview) and read only these tags, so every report needs its own.
 * FTABR26 sets its own in its layout (custom image and copy).
 */

const SITE = 'Atlas by SportsTechX';
const DEFAULT_IMAGE = { url: '/opengraph-image.png', width: 1200, height: 630, alt: SITE };

type Card = { title: string; description?: string | null; path: string; cover?: string | null };

/**
 * Report covers sit in Supabase storage at up to ~2 MB; WhatsApp drops preview
 * images over ~300 KB. Supabase's render endpoint serves an 800×420 crop
 * (≤ ~230 KB, 1.9:1 like the cards). Covers hosted anywhere else are used as-is.
 */
function cardImage(cover: string | null | undefined, alt: string) {
	if (!cover) return DEFAULT_IMAGE;
	if (!cover.includes('/storage/v1/object/public/')) return { url: cover, alt };
	const url = `${cover.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')}?width=800&height=420&resize=cover`;
	return { url, width: 800, height: 420, alt };
}

export function reportCard({ title, description, path, cover }: Card): Metadata {
	const shareTitle = `${title} | ${SITE}`;
	const desc = description?.trim() || `${title}, a SportsTechX report on ${SITE}.`;
	const image = cardImage(cover, `${title} by SportsTechX`);
	return {
		title,
		description: desc,
		alternates: { canonical: path },
		openGraph: { type: 'article', siteName: SITE, locale: 'en_US', url: path, title: shareTitle, description: desc, images: [image] },
		twitter: { card: 'summary_large_image', title: shareTitle, description: desc, images: [image] },
	};
}

/**
 * Card for a stored report, from the public report API (published reports only).
 * A draft or miss still gets a card with the fallback title, never the Atlas
 * homepage card it would otherwise inherit.
 */
export async function reportMetadata(slug: string, fallbackTitle = 'Report'): Promise<Metadata> {
	const path = `/reports/${slug}`;
	try {
		const r = await fetch(`${process.env.BACKEND_URL}/api/reports/${encodeURIComponent(slug)}`, { next: { revalidate: 300 } });
		if (r.ok) {
			const report = (await r.json()) as { title?: string | null; description?: string | null; cover_url?: string | null };
			if (report.title) return reportCard({ title: report.title, description: report.description, path, cover: report.cover_url });
		}
	} catch { /* fall back below */ }
	return reportCard({ title: fallbackTitle, path });
}
