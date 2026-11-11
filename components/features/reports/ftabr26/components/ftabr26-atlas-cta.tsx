/* ─────────────────────────────────────────────────────────────────────────
   FTABR26 · Atlas CTA band

   One band in the report style: deep pitch green, white copy, a single pink
   button. Reused for every Atlas call to action, on the web page and in the PDF,
   so a new one is one entry in ATLAS_CTAS plus one <Ftabr26AtlasCta />.
   - Web: one CTA (generic, between Playermaker and Soccerment).
   - PDF (`compact`): Explore on the About page, Raise after the leaderboards,
     Scout under Startups to Watch, and the closing band. Each carries a QR code
     next to the button (printed and forwarded copies can't always be clicked)
     and its links are UTM-tagged so PDF-driven sign-ups can be tracked.
   Copy rule: never "trial", "upgrade", "plan" or "tier", and no prices. The
   three Atlas products are "solutions", each for a different user.
   ──────────────────────────────────────────────────────────────────────── */
import { BRAND } from "../lib/report-theme";

export type Ftabr26AtlasCtaProps = {
  id?: string;
  eyebrow: string;
  headline: string;
  body: string[];
  button: { label: string; href: string };
  /** PDF: a QR code image (same target as the button) shown beside it */
  qr?: string;
  isMobile?: boolean;
  /** PDF: a compact rounded card sized for an A4 page */
  compact?: boolean;
};

/* Every Atlas link in the PDF carries these, so PDF-driven sign-ups can be told apart.
   The QR codes in public/reports/ftabr26/qr/ encode the same tagged URLs. */
export const FTABR26_PDF_UTM = "utm_source=ftabr26&utm_medium=pdf&utm_campaign=ftabr26";
export const withPdfUtm = (url: string) => `${url}${url.includes("?") ? "&" : "?"}${FTABR26_PDF_UTM}`;

export const ATLAS_CTAS = {
  /* Web: after Data in Full, before the Soccerment feature */
  generic: {
    id: "atlas-cta",
    eyebrow: "Atlas by SportsTechX",
    headline: "Every number in this report lives in Atlas",
    body: [
      "Filter the deals, companies and investors behind these charts, and go beyond football. Atlas Explore is free and includes all 30+ SportsTechX reports.",
      "Currently fundraising or startup hunting? Atlas Raise and Atlas Scout are built for you.",
    ],
    button: { label: "Find your fit →", href: "https://www.atlas.sportstechx.com/plans" },
  },

  /* PDF 1: About page, below the partners, above the contents */
  pdfExplore: {
    eyebrow: "Atlas by SportsTechX",
    headline: "This report is built on Atlas",
    body: [
      "Every deal, company and investor behind these charts lives in Atlas, our sports tech intelligence platform. Atlas Explore is free, includes all 30+ reports, newsletters, analytics and all the other content from SportsTechX.",
    ],
    button: { label: "Explore Atlas for free →", href: withPdfUtm("https://www.atlas.sportstechx.com/") },
    qr: "/reports/ftabr26/qr/atlas-explore.svg",
  },

  /* PDF 2: end of the leaderboards (founders have just read who raised what) */
  pdfRaise: {
    eyebrow: "Atlas Raise · For founders",
    headline: "Raising your next round?",
    body: [
      "Find the investors backing football and sports tech, benchmark your round against deals like these, and get your pitch deck analysed before you send it.",
    ],
    button: { label: "See Atlas Raise →", href: withPdfUtm("https://sandbox.sportstechx.com/preview/raise") },
    qr: "/reports/ftabr26/qr/atlas-raise.svg",
  },

  /* PDF 3: under the Startups to Watch grid */
  pdfScout: {
    eyebrow: "Atlas Scout · For investors & accelerators",
    headline: "Scouting football startups?",
    body: [
      "Every startup on this page came from someone's shortlist. Atlas Scout lets you build your own: filter 10,000+ sports tech companies by sport, sector and stage, and see which ones are raising right now.",
    ],
    button: { label: "See Atlas Scout →", href: withPdfUtm("https://sandbox.sportstechx.com/preview/scout") },
    qr: "/reports/ftabr26/qr/atlas-scout.svg",
  },

  /* PDF 4: closing band on the last page */
  pdfClosing: {
    eyebrow: "Atlas by SportsTechX",
    headline: "Explore, Raise or Scout: Find your fit",
    body: [
      "Atlas Explore is free for everyone. Atlas Raise is built for founders preparing a round. Atlas Scout is built for investors and accelerators finding their next deal.",
    ],
    button: { label: "Find your fit →", href: withPdfUtm("https://www.atlas.sportstechx.com/plans") },
    qr: "/reports/ftabr26/qr/atlas-plans.svg",
  },
} satisfies Record<string, Omit<Ftabr26AtlasCtaProps, "isMobile" | "compact">>;

const CTA_BG = "#1C332B";
const CTA_STRIPES = `repeating-linear-gradient(90deg, ${CTA_BG} 0, ${CTA_BG} 14.2857%, #213A31 14.2857%, #213A31 28.5714%)`;

export function Ftabr26AtlasCta({ id, eyebrow, headline, body, button, qr, isMobile = false, compact = false }: Ftabr26AtlasCtaProps) {
  if (compact) {
    return (
      <section id={id} aria-label={headline} style={{ background: CTA_BG, backgroundImage: CTA_STRIPES, color: "#fff", borderRadius: 10, padding: "18px 20px", display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 8.5, letterSpacing: 2.5, textTransform: "uppercase", color: "rgba(255,255,255,0.7)", margin: "0 0 6px" }}>{eyebrow}</p>
          <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 27, lineHeight: 0.95, letterSpacing: 0.4, color: "#fff", margin: 0 }}>{headline}</h2>
          {body.map((para, i) => (
            <p key={i} style={{ fontSize: 10.5, lineHeight: 1.6, color: "rgba(255,255,255,0.86)", margin: "8px 0 0" }}>{para}</p>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <a href={button.href} target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-block", background: BRAND.pink, color: "#fff", textDecoration: "none", fontFamily: "'DM Mono',monospace", fontSize: 9.5, letterSpacing: 1.6, textTransform: "uppercase", padding: "10px 14px", borderRadius: 999, whiteSpace: "nowrap" }}>
            {button.label}
          </a>
          {qr && (
            <a href={button.href} target="_blank" rel="noopener noreferrer" aria-label={`${button.label} (QR code)`}
              style={{ display: "block", background: "#fff", borderRadius: 6, padding: 4, lineHeight: 0 }}>
              <img src={qr} alt="" width={64} height={64} style={{ width: 64, height: 64, display: "block" }} />
            </a>
          )}
        </div>
      </section>
    );
  }
  return (
    <section id={id} aria-label={headline} style={{ background: CTA_BG, color: "#fff", padding: isMobile ? "44px 0" : "64px 0" }}>
      <div style={{
        maxWidth: 1280, margin: "0 auto", padding: isMobile ? "0 16px" : "0 40px",
        display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "center",
        justifyContent: "space-between", gap: isMobile ? 24 : 48,
      }}>
        <div style={{ maxWidth: 760 }}>
          <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,255,255,0.7)", margin: "0 0 12px" }}>{eyebrow}</p>
          <h2 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: isMobile ? 34 : "clamp(36px,4vw,56px)", lineHeight: 0.95, letterSpacing: 0.5, color: "#fff", margin: 0 }}>{headline}</h2>
          {body.map((para, i) => (
            <p key={i} style={{ fontSize: 15, lineHeight: 1.8, color: "rgba(255,255,255,0.86)", margin: i === 0 ? "16px 0 0" : "8px 0 0" }}>{para}</p>
          ))}
        </div>
        <a href={button.href} target="_blank" rel="noopener noreferrer"
          style={{
            flexShrink: 0, display: "inline-block", background: BRAND.pink, color: "#fff", textDecoration: "none",
            fontFamily: "'DM Mono',monospace", fontSize: 12, letterSpacing: 2, textTransform: "uppercase",
            padding: "14px 26px", borderRadius: 999, whiteSpace: "nowrap",
          }}>
          {button.label}
        </a>
      </div>
    </section>
  );
}
