// @ts-nocheck
/* eslint-disable */
import { Ftabr26PartnerHeader } from "./ftabr26-partner-header";
import "./ftabr26-soccerment-feature.css";

type CopyLink = { label: string; url: string };

/** Phrases in the copy that link out (soccermentLabels.copyLinks) become links. */
function linkifyCopy(copy: string, copyLinks: CopyLink[]) {
  if (!copyLinks.length) return copy;
  const pattern = new RegExp(`(${copyLinks.map(({ label }) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");
  return copy.split(pattern).map((part, index) => {
    const link = copyLinks.find(({ label }) => label === part);
    return link
      ? <a key={`${part}-${index}`} className="soc-copy-link" href={link.url} target="_blank" rel="noopener noreferrer">{part}</a>
      : part;
  });
}

/** Shared editorial panel, following the report's Playermaker row structure. */
export function Ftabr26SoccermentFeature({ print = false, data: S, labels: L }: { print?: boolean; data: any; labels: any }) {
  const linkify = (copy: string) => linkifyCopy(copy, L.copyLinks ?? []);
  const titleId = print ? "soccerment-print-title" : "soccerment-title";
  const images = [S.images.monitor, ...S.images.gallery];

  return (
    <article className={`ft26-soccerment${print ? " soc-print" : ""}`} aria-labelledby={titleId}>
      <div className="soc-inner">
        <div className="soc-header">
          <Ftabr26PartnerHeader
            headline={S.headline} subline={L.subline} visit={L.visit} websiteAria={L.websiteAria}
            url={S.url} accent={L.accent} buttonColor={L.buttonColor} print={print} titleId={titleId}
            logo={
              <div className="soc-logo">
                <img src={S.logo} alt={S.name} />
                <img className="soc-logo-emblem" src={S.logo} alt="" aria-hidden="true" />
              </div>
            }
          />
        </div>

        <div className="soc-story-row">
          <div className="soc-story">
            <section className="soc-about">
              <h3 className="soc-label">{S.problemLabel}</h3>
              {S.about.map((paragraph, index) => (
                <p key={paragraph} className={`soc-body${index === 0 ? " soc-intro" : ""}`}>{linkify(paragraph)}</p>
              ))}
            </section>
            <section className="soc-achievement-panel">
              <h3 className="soc-label">{S.achievementsLabel}</h3>
              <ol className="soc-achievements">
                <li>
                  <span className="soc-index" aria-hidden="true">01</span>
                  <p>
                    {S.metrics.map((metric, i) => (
                      <span key={metric.label}>{i > 0 ? "; " : ""}{metric.value} {metric.label.charAt(0).toLowerCase() + metric.label.slice(1)}</span>
                    ))}.
                  </p>
                </li>
                {S.achievements.map((text, i) => (
                  <li key={text}>
                    <span className="soc-index" aria-hidden="true">{String(i + 2).padStart(2, "0")}</span>
                    <p>{linkify(text)}</p>
                  </li>
                ))}
              </ol>
            </section>
          </div>
          <div className="soc-mosaic" aria-label={L.mosaicAria}>
            {images.map((image, index) => (
              <figure className={`soc-figure${index === 0 ? " soc-figure--lead" : ""}`} key={image.src}>
                <img className="soc-screen" src={image.src} alt={image.alt} loading={print ? "eager" : "lazy"} />
              </figure>
            ))}
          </div>
        </div>

        <div className="soc-bottom">
          <div className="soc-founder-col">
          {S.quote ? <h3 className="soc-quote">{S.quote}</h3> : null}
          <div className="soc-founder">
            <img src={S.founder.photo} alt={L.founderAlt} loading={print ? "eager" : "lazy"} />
            <div><strong>{S.founder.name}</strong><span>{S.founder.role}</span></div>
          </div>
          </div>
          <div className="soc-next">
            <h3 className="soc-label">{S.nextLabel}</h3>
            <p className="soc-body">{linkify(S.next)}</p>
          </div>
        </div>
      </div>
    </article>
  );
}
