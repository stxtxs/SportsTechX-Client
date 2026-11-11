import { reportMetadata } from '@/lib/report-metadata';

export const generateMetadata = () => reportMetadata('gster26', 'Global Sports Tech Ecosystem Report 2026');

export default function Layout({ children }: { children: React.ReactNode }) {
	return children;
}
