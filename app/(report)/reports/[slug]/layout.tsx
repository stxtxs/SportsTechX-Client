import type { Metadata } from 'next';
import { reportMetadata } from '@/lib/report-metadata';

/** Tab title + share card from the report's own title, description and cover; drafts and misses keep "Report". */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
	return reportMetadata((await params).slug);
}

export default function Layout({ children }: { children: React.ReactNode }) {
	return children;
}
