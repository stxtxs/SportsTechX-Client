/**
 * Company logo helpers for GSTVCR26: uploaded logo first, else the favicon of
 * the company's real website (from Prod v2), else callers show initials.
 */
/** Bare hostname from a website URL ("https://www.x.com/a" → "x.com"); null if unusable. */
export function websiteDomain(website: string | null | undefined): string | null {
  const host = (website || "").trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").split(/[/?#]/)[0]?.toLowerCase();
  return host && host.includes(".") ? host : null;
}
/** Logo image for a company: uploaded logo first, else the real website's favicon.
 *  Callers render the initials tile underneath, shown when this is null or fails. */
export function companyLogoSrc(logoUrl: string | null | undefined, website: string | null | undefined): string | null {
  if (logoUrl) return logoUrl;
  const domain = websiteDomain(website);
  return domain ? `https://www.google.com/s2/favicons?sz=128&domain=${domain}` : null;
}
/** Absolute link for a company website, or undefined when there is none. */
export function websiteHref(website: string | null | undefined): string | undefined {
  const domain = websiteDomain(website);
  return domain ? `https://${domain}` : undefined;
}
