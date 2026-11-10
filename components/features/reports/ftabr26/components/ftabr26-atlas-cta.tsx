/* ─────────────────────────────────────────────────────────────────────────
   FTABR26 · Atlas CTA band

   One full-width band in the report style: deep pitch green, white copy,
   a single pink button. Reused for every Atlas call to action in the report,
   so a new one (e.g. a closing CTA above the footer) is one entry in
   ATLAS_CTAS plus one <Ftabr26AtlasCta /> where it should appear.
   Copy rule: never "trial", "upgrade" or "plan".
   ──────────────────────────────────────────────────────────────────────── */
import { BRAND } from "../lib/report-theme";

export type Ftabr26AtlasCtaProps = {
  id?: string;
  eyebrow: string;
  headline: string;
  body: string[];
  button: { label: string; href: string };
  isMobile?: boolean;
};

export const ATLAS_CTAS = {
  /* After Data in Full, before the Soccerment feature */
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
  /* End of the Ecosystem section, after the tables */
  scout: {
    id: "atlas-scout-cta",
    eyebrow: "For scouts, accelerators and investors",
    headline: "Scouting football startups?",
    body: [
      "Atlas Scout tracks the startups these programmes back, and the ones they haven't found yet, with funding, investors and signals in one place.",
    ],
    button: { label: "See Atlas Scout →", href: "https://sandbox.sportstechx.com/preview/scout" },
  },
} satisfies Record<string, Omit<Ftabr26AtlasCtaProps, "isMobile">>;

const CTA_BG = "#1C332B";

export function Ftabr26AtlasCta({ id, eyebrow, headline, body, button, isMobile = false }: Ftabr26AtlasCtaProps) {
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
