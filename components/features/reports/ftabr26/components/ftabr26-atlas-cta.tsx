/* ─────────────────────────────────────────────────────────────────────────
   FTABR26 · Atlas CTA band

   One band in the report style: deep pitch green, white copy, a single pink
   button. Reused for every Atlas call to action, on the web page and in the PDF;
   copy and links come from the report content (soccermentCta, pagePrint.ctas).
   - Web: one CTA (generic, between Playermaker and Soccerment).
   - PDF (`compact`): Explore on the About page, Raise after the leaderboards,
     Scout under Startups to Watch, and the closing band. Each carries a QR code
     next to the button (printed and forwarded copies can't always be clicked)
     and its links are UTM-tagged (in the content) so PDF sign-ups can be tracked.
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
