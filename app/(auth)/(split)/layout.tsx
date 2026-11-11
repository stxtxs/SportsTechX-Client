import { preload } from 'react-dom';
import { AuthSplit } from '@/components/auth/auth-shell';
import { AuthSidePanel } from '@/components/auth/auth-quotes';

/**
 * Login and signup share this layout so the left panel is mounted once and
 * survives moving between them (see `AuthSplit`). The pages render only the
 * form column. The route group adds nothing to the URL.
 */
export default function SplitLayout({ children }: { children: React.ReactNode }) {
	// The panel headline is Satoshi Bold; fetching it early stops the lines
	// reflowing from the fallback font after first paint.
	preload('/fonts/atlas/Satoshi-Bold.woff2', { as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' });
	return <AuthSplit panel={<AuthSidePanel />}>{children}</AuthSplit>;
}
