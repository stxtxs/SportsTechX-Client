import { reportCard } from '@/lib/report-metadata';

export const metadata = reportCard({
	title: 'Methodology',
	description: 'How SportsTechX collects, classifies and reports sports tech startups, funding deals and investors.',
	path: '/reports/methodology',
});

export default function Layout({ children }: { children: React.ReactNode }) {
	return children;
}
