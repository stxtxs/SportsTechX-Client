import { reportMetadata } from '@/lib/report-metadata';

export const generateMetadata = () => reportMetadata('investors-survey26', 'Sports Tech VC Deal Sourcing Benchmark 2026');

export default function Layout({ children }: { children: React.ReactNode }) {
	return children;
}
