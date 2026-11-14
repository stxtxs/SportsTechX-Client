import { lpDisplay, lpMono, lpSerif } from './fonts';
import { LandingNav } from '@/components/landing/landing-nav';
import { IntroHero } from '@/components/landing/intro-hero';
// Trusted by is hidden for now (6 Nov 2026). To bring it back, restore this
// import and the <TrustedBy /> line in the page below.
// import { TrustedBy } from '@/components/landing/trusted-by';
import { Solutions } from '@/components/landing/solutions';
import { Pricing } from '@/components/landing/pricing';
import { Faq } from '@/components/landing/faq';
import { FinalHero } from '@/components/landing/final-hero';
import { LandingFooter } from '@/components/landing/landing-footer';
import { AnalyticsConsent } from '@/components/landing/analytics-consent';
import { MobileMenuPanel, MobileMenuProvider, MobileMenuShell } from '@/components/landing/mobile-menu';
import { siteContent } from '@/lib/site-content';
import '@/components/landing/landing.css';

/**
 * Public marketing landing page for Atlas. Fixed theme (its own palette in
 * landing.css, scoped to `.lp`), independent of the app's light/dark toggle.
 * The signed-in product lives at `/app`; `/` is whitelisted in
 * lib/supabase/middleware.ts so it is reachable while logged out.
 *
 * Type follows sportstechx.com: Bebas Neue headlines, New Frank body (Adobe kit
 * jyx6vei, loaded by the root layout) and Commit Mono labels and buttons.
 *
 * Order: hero, trusted by, solutions (one card per product), pricing, FAQ,
 * closing CTA, footer.
 */
export default async function LandingPage() {
	/* Carousel, experts, dashboard screenshots and testimonials come from the
	   admin panel's Site assets page. Every section falls back to placeholders,
	   so a slow or empty API still renders the page. */
	const cms = await siteContent();

	return (
		<div className={`lp ${lpDisplay.variable} ${lpMono.variable} ${lpSerif.variable}`}>
			{/* The panel is a SIBLING before the shell, not a child: the shell is
			    transformed while the drawer is out, so a panel inside it would
			    slide along with the page instead of being revealed by it. */}
			<MobileMenuProvider>
				<MobileMenuPanel />
				<MobileMenuShell nav={<LandingNav />}>
					<main>
						<IntroHero />
						{/* Hidden for now: <TrustedBy items={cms.gallery} /> */}
						<Solutions
							shots={{ explore: cms.dashboard, raise: cms.dashboard_raise, scout: cms.dashboard_scout }}
							experts={cms.team}
							testimonials={cms.testimonials}
						/>
						<Pricing />
						<Faq />
						<FinalHero />
					</main>
					<LandingFooter />
				</MobileMenuShell>
			</MobileMenuProvider>
			{/* Google Analytics for the marketing pages, only after consent. */}
			<AnalyticsConsent />
		</div>
	);
}
