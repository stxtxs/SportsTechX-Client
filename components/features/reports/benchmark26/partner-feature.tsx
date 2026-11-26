/* eslint-disable @next/next/no-img-element -- partner logos and photos are plain static files, as elsewhere in this report */
/**
 * Benchmark 2026 · full-width partner feature (first used for GP Bullhound).
 * Same structure as the Football Tech report's partner features (Soccerment,
 * Playermaker): header row (logo · headline · visit), story + achievements
 * beside an image mosaic, then the featured person and the next 12–18 months.
 * Type follows this report (Oswald, Barlow, Space Mono); colour follows the
 * partner's brand through `accent` / `buttonColor`.
 */
import type { CSSProperties } from "react";
import type { PartnerFeatureContent } from "./gp-bullhound-content";
import "./partner-feature.css";

export function PartnerFeature({ content: P, id }: { content: PartnerFeatureContent; id: string }) {
  const titleId = `${id}-title`;
  const style = { "--bmp-accent": P.accent, "--bmp-button": P.buttonColor } as CSSProperties;
  return (
    <section className="bm-partner" id={id} aria-labelledby={titleId} style={style}>
      <header className="bmp-header">
        <img className="bmp-logo" src={P.logo} alt={P.name} />
        <div className="bmp-title">
          <h2 className="bmp-headline" id={titleId}>{P.headline}</h2>
          <p className="bmp-subline">{P.subline}</p>
        </div>
        <div className="bmp-actions">
          <a className="bmp-visit" href={P.url} target="_blank" rel="noopener noreferrer">{P.visit}</a>
          <a className="bmp-website" href={P.url} target="_blank" rel="noopener noreferrer" aria-label={P.websiteAria}>
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </a>
        </div>
      </header>

      <div className="bmp-story-row">
        <div className="bmp-story">
          <div>
            <h3 className="bmp-label">{P.problemLabel}</h3>
            {P.about.map((p, i) => <p key={p} className={i === 0 ? "bmp-intro" : "bmp-body"}>{p}</p>)}
          </div>
          <div>
            <h3 className="bmp-label">{P.achievementsLabel}</h3>
            <p className="bmp-body bmp-lead">{P.achievementsLead}</p>
            <ol className="bmp-achievements">
              {P.achievements.map((a, i) => (
                <li key={a}>
                  <span className="bmp-index" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                  <p>{a}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
        <div className={`bmp-mosaic bmp-mosaic--${Math.min(P.images.length, 3)}`} aria-label={P.mosaicAria}>
          {P.images.map((img, i) => (
            <figure key={img.src} className={`bmp-figure${i === 0 ? " bmp-figure--lead" : ""}`}>
              <img src={img.src} alt={img.alt} loading="lazy" style={{ objectPosition: img.position ?? "center" }} />
            </figure>
          ))}
        </div>
      </div>

      <div className="bmp-bottom">
        <div className="bmp-person">
          <img src={P.person.photo} alt={P.person.alt} loading="lazy" />
          <div><strong>{P.person.name}</strong><span>{P.person.role}</span></div>
        </div>
        <div>
          <h3 className="bmp-label">{P.nextLabel}</h3>
          <p className="bmp-body">{P.next}</p>
        </div>
      </div>
    </section>
  );
}
