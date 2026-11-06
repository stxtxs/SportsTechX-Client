'use client';

import Link from 'next/link';
import { ArrowUpRight, Mail, MapPin } from 'lucide-react';
import { SOLUTIONS, selectSolution, solutionHref } from '@/components/landing/atlas-solutions';

/* Root-relative so the anchors also work from the legal pages. Each product
   link opens its own card in the Solutions section. */

/* The rest of the SportsTechX family, as in the sportstechx.com footer. */
const SPORTSTECHX: [string, string][] = [
	['SportsTechX', 'https://www.sportstechx.com'],
	['Playmakers', 'https://www.playmakers.sportstechx.com'],
	['Boardroom', 'https://www.sportstechx.com/#boardroom'],
	['Media', 'https://www.sportstechx.com/#media'],
	['About', 'https://www.sportstechx.com/about'],
];

const Svg = ({ children }: { children: React.ReactNode }) => (
	<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>{children}</svg>
);
/* Only the two SportsTechX socials that exist — Instagram and X were removed. */
const CONNECT: [string, React.ReactNode, string][] = [
	['LinkedIn', <Svg key="li"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" /></Svg>, 'https://www.linkedin.com/company/sportstechx/'],
	['YouTube', <Svg key="yt"><path d="M23.5 6.2a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.51A3.02 3.02 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3.02 3.02 0 0 0 2.12 2.14c1.88.51 9.38.51 9.38.51s7.5 0 9.38-.51a3.02 3.02 0 0 0 2.12-2.14A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z" /></Svg>, 'https://www.youtube.com/@SportsTechX'],
	['Contact', <Mail key="mail" size={16} aria-hidden />, 'mailto:hello@sportstechx.com'],
];

export function LandingFooter() {
	return (
		<footer className="lp-footer">
			<div className="lp-footer-top-rule" />
			<div className="lp-footer-inner">
				<div className="lp-inner">
					<div className="lp-footer-cols">
						<div>
							{/* Dark-ink wordmark — the stock file is a white→pink gradient
							    and would vanish on the light footer. */}
							<div className="lp-footer-lockup">
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img className="lp-footer-wordmark" src="/landing/atlas-wordmark-dark.svg" alt="Atlas" />
								<a className="lp-footer-by" href="https://www.sportstechx.com" target="_blank" rel="noreferrer">
									BY SPORTSTECHX ↗
								</a>
							</div>
							<p className="lp-footer-desc">Your insider guide to sports tech &amp; venture. A SportsTechX product.</p>
							<div className="lp-footer-meta">
								<div><MapPin size={16} /> Berlin, Germany</div>
							</div>
						</div>
						<div>
							<div className="lp-footer-h">Solutions</div>
							<nav className="lp-footer-links">
								{SOLUTIONS.map((s) => (
									<Link key={s.id} href={solutionHref(s.id)} onClick={(e) => selectSolution(s.id, e)}>
										Atlas {s.name.charAt(0)}{s.name.slice(1).toLowerCase()}
									</Link>
								))}
								<Link href="/#pricing">Plans &amp; Pricing</Link>
							</nav>
						</div>
						<div>
							<div className="lp-footer-h">SportsTechX</div>
							<nav className="lp-footer-links">
								{SPORTSTECHX.map(([l, href], i) => (
									<a key={l} href={href} target="_blank" rel="noreferrer">
										{l}
										{/* The main site gets the outbound-link arrow. */}
										{i === 0 && <ArrowUpRight size={16} aria-hidden />}
									</a>
								))}
							</nav>
						</div>
						<div>
							<div className="lp-footer-h">Connect</div>
							<nav className="lp-footer-links">
								{CONNECT.map(([l, ico, href]) => (
									<a key={l} href={href} {...(href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}>
										{ico}
										{l}
									</a>
								))}
							</nav>
						</div>
					</div>
					<div className="lp-footer-bottom">
						<span>© 2026 SportsTechX GmbH. All rights reserved.</span>
						{/* These were a plain string; both pages exist and are public. */}
						<span>
							<a href="/privacy-policy">Privacy Policy</a>
							{' · '}
							<a href="/terms-of-service">Terms of Service</a>
							{''}
						</span>
					</div>
				</div>
			</div>
		</footer>
	);
}
