import type { NextConfig } from "next";

/**
 * Where `/api/*` is proxied. No fallback, on purpose.
 *
 * This used to default to `http://localhost:3001`, which meant an unset
 * BACKEND_URL produced a *successful* production build: the marketing page
 * rendered fine and every authenticated API call 502'd against the deploy
 * host's own localhost. The port was wrong everywhere too — .env.example
 * documents 5000 and the server defaults to 3000.
 *
 * `lib/site-content.ts` already refuses a fallback for the same reason. Failing
 * the build is the loud, early version of that failure.
 */
const BACKEND_URL = process.env.BACKEND_URL;
if (!BACKEND_URL) {
  throw new Error(
    'BACKEND_URL is not set. It is required to proxy /api/* to the API server — ' +
      'without it every authenticated request fails at runtime. Set it in .env.local ' +
      'for development (see .env.example) and in the hosting environment for deploys.',
  );
}

const nextConfig: NextConfig = {
  // Only NEXT_PUBLIC_* reaches the browser; the PostHog key is stored on Vercel
  // as NEXT_POSTHOG_KEY. It is a public project token (phc_…), not a secret.
  env: {
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY || process.env.NEXT_POSTHOG_KEY,
  },
  // Dev only: let Cloudflare quick-tunnel links (cloudflared) load dev assets/HMR.
  allowedDevOrigins: ['*.trycloudflare.com'],
  // The onboarding page is gone; confirmation emails already sent still carry
  // `next=/onboarding`, so send them to the plan choice that replaced it.
  // The GSTER26 editor preview may be framed by the admin panel only.
  async headers() {
    // VC Benchmark R2 (full) and R3 (personal): never a shared CDN cache, never
    // indexed. `:suffix*` covers the -summary and -yours entries too. The API
    // must send the same on its report endpoints (see the backend page).
    const privateReport = [
      { key: "Cache-Control", value: "private, no-store, max-age=0" },
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
    ];
    return [{
      source: "/reports/investors-survey26",
      headers: privateReport,
    }, {
      source: "/reports/investors-survey26-:suffix",
      headers: privateReport,
    }, {
      source: "/report-preview/:path*",
      headers: [{
        key: "Content-Security-Policy",
        value: `frame-ancestors 'self' ${process.env.NEXT_PUBLIC_ADMIN_URL ?? ""} https://www.admin.sportstechx.com http://localhost:*`,
      }],
    }];
  },
  async redirects() {
    return [
      { source: "/onboarding", destination: "/solutions?welcome=1", permanent: false },
      // The pricing page moved from /plans to /solutions; old links, emails and the
      // FTABR26 PDF/QR still point at /plans (the query string carries over).
      { source: "/plans", destination: "/solutions", permanent: true },
      // The Scouting thesis folded into Preferences (D1, 1.1).
      { source: "/thesis", destination: "/interests", permanent: false },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.supabase.in" },
      { protocol: "https", hostname: "logo.clearbit.com" },
      { protocol: "https", hostname: "*.apollo.io" },
    ],
  },
};

export default nextConfig;
