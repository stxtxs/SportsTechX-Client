import type { Metadata } from 'next';

/* Share previews for this report only. Without these the page inherits the Atlas homepage
   defaults from app/layout.tsx, so a shared link reads "Atlas | Sports Tech Intelligence".
   The image is 1200 × 630 and lives with the report's other assets. */
const TITLE = 'Football Tech & Business Report 2026';
const SHARE_TITLE = 'Football Tech & Business Report 2026 | Atlas by SportsTechX';
const DESCRIPTION =
	'$7.5B in football tech funding since 2021, what World Cup 26 changed, and the startups to watch. The third edition of the SportsTechX football report.';
const URL = '/reports/ftabr26';
const IMAGE = {
	url: '/reports/ftabr26/og-image.png',
	width: 1200,
	height: 630,
	alt: 'Football Tech & Business Report 2026 by SportsTechX',
};

export const metadata: Metadata = {
	title: TITLE,
	description: DESCRIPTION,
	alternates: { canonical: URL },
	openGraph: {
		type: 'article',
		siteName: 'Atlas by SportsTechX',
		locale: 'en_US',
		url: URL,
		title: SHARE_TITLE,
		description: DESCRIPTION,
		images: [IMAGE],
	},
	twitter: {
		card: 'summary_large_image',
		title: SHARE_TITLE,
		description: DESCRIPTION,
		images: [IMAGE],
	},
};

export default function Layout({ children }: { children: React.ReactNode }) {
	return children;
}
