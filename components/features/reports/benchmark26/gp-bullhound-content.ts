/**
 * Benchmark 2026 · partner feature: GP Bullhound.
 *
 * Source: Notion "Feature Partner" form, entry "Simon Miremadi, Partner at
 * GP Bullhound" (submitted 25 Nov 2026). Copy is the partner's own, split into
 * the same blocks as the Football Tech report's partner features (Soccerment,
 * Playermaker). Brand: gpbullhound.com is black and white, IBM Plex, with a
 * single "traffic red" accent. Images live in /public/reports/benchmark26/gp-bullhound.
 *
 * The report's saved content can override this with a `gpBullhound` block of
 * the same shape (report-benchmark26 reads `content.gpBullhound ?? default`).
 */

export interface PartnerImage { src: string; alt: string; position?: string }

export interface PartnerFeatureContent {
  name: string;
  url: string;
  logo: string;
  headline: string;
  subline: string;
  visit: string;
  websiteAria: string;
  sectionAria: string;
  /** Brand accent (labels, numbers, rules) and the visit button colour. */
  accent: string;
  buttonColor: string;
  problemLabel: string;
  /** First paragraph is the bold intro. */
  about: string[];
  achievementsLabel: string;
  achievementsLead: string;
  achievements: string[];
  nextLabel: string;
  next: string;
  person: { name: string; role: string; photo: string; alt: string };
  images: PartnerImage[];
  mosaicAria: string;
}

const ASSETS = "/reports/benchmark26/gp-bullhound";

export const GP_BULLHOUND_DEFAULT: PartnerFeatureContent = {
  name: "GP Bullhound",
  url: "https://www.gpbullhound.com/sectors/consumer-technology/sports-tech/",
  logo: `${ASSETS}/gp-bullhound-logo.png`,
  headline: "Where the world's best tech founders go when the next move is the big one",
  subline: "Partner feature · GP Bullhound",
  visit: "Visit GP Bullhound",
  websiteAria: "GP Bullhound website (opens in a new tab)",
  sectionAria: "Partner feature: GP Bullhound",
  accent: "#E0231F",
  buttonColor: "#CC0605",
  problemLabel: "What we do",
  about: [
    "Since 1999, GP Bullhound has advised on over 700 transactions valued at $58 billion.",
    "Our proprietary data and AI capabilities mean sharper insights and faster execution. In SportsTech, we have a proven track record of advising the category leaders in performance data, fan engagement and participation, and a network that reaches the world's most successful athletes.",
  ],
  achievementsLabel: "Recent SportsTech deals",
  achievementsLead: "We see the market first-hand from inside the deals.",
  achievements: [
    "Advised Urban Sports Club on its $600M+ sale to Wellhub.",
    "Advised Runna on its sale to Strava.",
    "Advised IMPECT on its sale to Catapult for up to €78M.",
    "Our proprietary AI-powered SportsTech Market Update tracks the deal activity, trade activity and management changes shaping the sector.",
  ],
  nextLabel: "The next 12–18 months",
  next: "SportsTech is one of technology's most active markets, and we are right at its centre. The GP Bullhound Allstars Awards recognise the best companies in our SportsTech category, sponsored by SportsTechX. Last year's finalists included aiball, bsport, Carv, MAGIC AI, Mindfly, MatchWornShirt, Playermaker, Sportlight, WeWard and Zenniz, with MAGIC AI winning. Nominations for our 25th Allstars Awards open next year.",
  person: {
    name: "Simon Miremadi",
    role: "Partner, GP Bullhound",
    photo: `${ASSETS}/simon-miremadi.jpg`,
    alt: "Simon Miremadi, Partner at GP Bullhound",
  },
  images: [
    { src: `${ASSETS}/allstars-venus-williams.jpg`, alt: "Venus Williams on stage at the GP Bullhound Allstars Awards dinner", position: "center 35%" },
    { src: `${ASSETS}/allstars-magic-ai.jpg`, alt: "MAGIC AI receiving Sports Tech Company of the Year at the GP Bullhound Allstars Awards", position: "center 30%" },
  ],
  mosaicAria: "GP Bullhound Allstars Awards",
};
