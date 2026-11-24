/**
 * GSTVCR26 · Unicorns: the 2026 unicorn list.
 *
 * Source of truth: Google Sheet "Unicorns 2026"
 * (id 1L59trSN0tRvrgZEk8L4aWwQvuZ3cG2vQsQ835wrkvJw, tab "Unicorns 2026").
 *   UNICORNS  ← rows with "To include in unicorn list" = Y
 *   PENDING   ← rows marked "Pending" (not counted)
 *   LEFT      ← rows from the 2025 list marked N
 * Columns used: Valuation 2025/2026 $b, Last recorded valuation year, Sector,
 * Business Model, "2026 Basis and date" and "2026 Source".
 *
 * `domain` is the company's website host as stored in Atlas (companies.website);
 * the server matches on it to link each row to its Atlas company page.
 * `status` is set from the Remarks column, not the raw IPO?/Acquired flags,
 * which the sheet itself marks as needing checks for several rows.
 */

export type UnicornSector = "fans" | "athletes" | "execs";
export type UnicornStatus = "public" | "owned" | "private";
export type UnicornContinent = "North America" | "Europe" | "Asia" | "South America";

export interface Unicorn {
  name: string;
  domain: string;
  city: string;
  country: string;
  continent: UnicornContinent;
  /** $B. Null when the company was not on the 2025 list. */
  val2025: number | null;
  /** $B. */
  val2026: number;
  /** Year of the last recorded valuation mark. */
  markYear: number;
  sector: UnicornSector;
  subSector: string;
  model: "B2C" | "B2B" | "B2B2C";
  status: UnicornStatus;
  basis: string;
  source: string;
  /** The 2025 figure was a data error, so the change is not a real move. */
  prevCorrected?: boolean;
  /** Note of at most 4 words for the "Joined" list (new entrants only). */
  short?: string;
}

export interface UnicornExit {
  name: string;
  domain: string;
  country: string;
  val2025: number;
  reason: string;
  /** At most 4 words. */
  short: string;
  source: string;
}

export interface UnicornPending {
  name: string;
  domain: string;
  country: string;
  val2026: number;
  note: string;
  /** At most 4 words. */
  short: string;
  source: string;
}

/** Size and combined valuation of the published 2025 list (GSTVCR25). */
export const UNICORNS_2025_COUNT = 45;
export const UNICORNS_2025_VALUE_B = 208.7;

export const SECTOR_COLORS: Record<UnicornSector, string> = {
  fans: "#0482FF",
  athletes: "#4F2484",
  execs: "#1FCC96",
};

export const STATUS_LABELS: Record<UnicornStatus, string> = {
  public: "Listed",
  owned: "Acquired / group-owned",
  private: "Private",
};

const u = (row: Unicorn): Unicorn => row;

export const UNICORNS: Unicorn[] = [
  u({ name: "Fanatics", domain: "fanaticsinc.com", city: "Jacksonville", country: "USA", continent: "North America", val2025: 31.0, val2026: 31.0, markYear: 2022, sector: "fans", subSector: "Fan Experiences", model: "B2C", status: "private", basis: "Last primary round Dec 2022; Forge secondary price implies $23.1B (Nov 2026)", source: "https://forgeglobal.com/fanatics_stock/" }),
  u({ name: "FanDuel", domain: "fanduel.com", city: "New York City", country: "USA", continent: "North America", val2025: 31.0, val2026: 31.0, markYear: 2025, sector: "fans", subSector: "Fantasy Sports & Betting", model: "B2C", status: "owned", basis: "Implied by the Boyd buyout, Jul 2025; parent Flutter's market cap was $14.4B in Nov 2026", source: "https://www.cityam.com/?p=2347527" }),
  u({ name: "OURA", domain: "ouraring.com", city: "Oulu", country: "Finland", continent: "Europe", val2025: 10.9, val2026: 11.0, markYear: 2025, sector: "athletes", subSector: "Tracking & Analytics", model: "B2C", status: "private", basis: "Series E Oct 2025; IPO pulled 29 Sep 2026 (range up to $15.6B)", source: "https://techcrunch.com/2026/09/29/oura-shelves-its-2-2b-ipo-citing-uncertainty-in-the-market/" }),
  u({ name: "Whoop", domain: "whoop.com", city: "Boston", country: "USA", continent: "North America", val2025: 3.6, val2026: 10.1, markYear: 2026, sector: "athletes", subSector: "Recovery & Injury Prevention", model: "B2C", status: "private", basis: "$575M Series G, Mar 2026", source: "https://www.whoop.com/ae/en/press-center/whoop-announces-series-g-funding/" }),
  u({ name: "DAZN", domain: "dazn.com", city: "London", country: "UK", continent: "Europe", val2025: 1.1, val2026: 10.0, markYear: 2025, sector: "fans", subSector: "Streaming Platform", model: "B2C", status: "private", basis: "Surj paid $1B for 10%, Feb 2025", source: "https://www.insideworldfootball.com/2025/10/10/never-ending-stream-blavatnik-pumps-another-587m-dazn/", prevCorrected: true }),
  u({ name: "DraftKings", domain: "draftkings.com", city: "Boston", country: "USA", continent: "North America", val2025: 17.3, val2026: 9.2, markYear: 2026, sector: "fans", subSector: "Fantasy Sports & Betting", model: "B2C", status: "public", basis: "Market cap, 6 Nov 2026", source: "https://www.foxbusiness.com/quote?stockTicker=DKNG" }),
  u({ name: "Dapper Labs", domain: "dapperlabs.com", city: "Vancouver", country: "Canada", continent: "North America", val2025: 7.6, val2026: 7.6, markYear: 2021, sector: "fans", subSector: "Fan Engagement", model: "B2C", status: "private", basis: "Last round 2021; secondary estimate $0.4B (Jul 2026)", source: "https://trueup.io/co/dapper" }),
  u({ name: "Animoca Brands", domain: "animocabrands.com", city: "Hong Kong SAR", country: "China", continent: "Asia", val2025: 5.9, val2026: 5.9, markYear: 2022, sector: "fans", subSector: "Fan Engagement", model: "B2C", status: "private", basis: "Last round 2022; Nasdaq reverse merger pending", source: "https://www.blockchaingamer.biz/news/42197/animoca-brands-nasdaq-listing-nominally-valued-8-billion/" }),
  u({ name: "Clear", domain: "clearme.com", city: "New York City", country: "USA", continent: "North America", val2025: 2.5, val2026: 5.6, markYear: 2026, sector: "execs", subSector: "Stadium & Facilities", model: "B2B", status: "public", basis: "Market cap, 6 Nov 2026 (NYSE: YOU)", source: "https://massive.com/quote/you" }),
  u({ name: "Napster Corp. (formerly Infinite Reality)", domain: "theinfinitereality.com", city: "Washington D.C.", country: "USA", continent: "North America", val2025: 12.3, val2026: 5.1, markYear: 2024, sector: "fans", subSector: "Fan Engagement", model: "B2B", status: "private", basis: "Last verified mark Jul 2024; the $3B 2025 investment did not materialise", source: "https://sacra.com/research/infinite-reality" }),
  u({ name: "Collectors", domain: "collectors.com", city: "Santa Ana", country: "USA", continent: "North America", val2025: 4.3, val2026: 4.3, markYear: 2022, sector: "fans", subSector: "Fan Engagement", model: "B2C", status: "private", basis: "Last round Mar 2022; bought Beckett Dec 2025", source: "https://stockanalysis.com/private/collectors/" }),
  u({ name: "Sorare", domain: "sorare.com", city: "Paris", country: "France", continent: "Europe", val2025: 4.3, val2026: 4.3, markYear: 2021, sector: "fans", subSector: "Fantasy Sports & Betting", model: "B2C", status: "private", basis: "Last round 2021; secondary estimate $0.9B (Jun 2026)", source: "https://trueup.io/co/sorare" }),
  u({ name: "iQiyi Sports", domain: "sports.iqiyi.com", city: "Beijing", country: "China", continent: "Asia", val2025: 3.8, val2026: 3.8, markYear: 2025, sector: "fans", subSector: "Streaming Platform", model: "B2B2C", status: "owned", basis: "No new data in 2026", source: "https://app.dealroom.co/companies/iqiyi" }),
  u({ name: "Sportradar", domain: "sportradar.com", city: "St. Gallen", country: "Switzerland", continent: "Europe", val2025: 7.6, val2026: 3.6, markYear: 2026, sector: "execs", subSector: "Media Production", model: "B2B2C", status: "public", basis: "Market cap, 30 Oct 2026", source: "https://www.debelegger.nl/en/stock/SRAD.US" }),
  u({ name: "iFit", domain: "ifit.com", city: "Logan", country: "USA", continent: "North America", val2025: 3.0, val2026: 3.0, markYear: 2022, sector: "athletes", subSector: "Classes & Tutorials", model: "B2C", status: "private", basis: "Last round Feb 2022", source: "https://insider.fitt.co/ifit-adds-355m-in-funding-amid-layoffs-leadership-shakeup/" }),
  u({ name: "Technogym", domain: "technogym.com", city: "Cesena", country: "Italy", continent: "Europe", val2025: 3.0, val2026: 2.9, markYear: 2026, sector: "athletes", subSector: "Equipment & Infrastructure", model: "B2B2C", status: "public", basis: "Market cap EUR 2.59B, 9 Oct 2026", source: "https://www.doveinvestire.com/mercato-azionario/azioni-technogym-calo-opportunita-value-trap/" }),
  u({ name: "PrizePicks", domain: "prizepicks.com", city: "Atlanta", country: "USA", continent: "North America", val2025: 1.6, val2026: 2.5, markYear: 2026, sector: "fans", subSector: "Fantasy Sports & Betting", model: "B2C", status: "owned", basis: "Allwyn bought 62.3% for $1.53B, closed Jan 2026", source: "https://sbcamericas.com/2026/01/16/allwyn-closes-deal-stake-in-prizepicks/" }),
  u({ name: "eGym", domain: "egym.com", city: "Munich", country: "Germany", continent: "Europe", val2025: 1.2, val2026: 2.5, markYear: 2026, sector: "athletes", subSector: "Equipment & Infrastructure", model: "B2B", status: "owned", basis: "Valued ~$2.5B in the Playlist merger, closed Mar 2026", source: "https://www.munich-startup.de/en/news/egym-and-playlist-merge" }),
  u({ name: "Peloton", domain: "onepeloton.com", city: "New York City", country: "USA", continent: "North America", val2025: 3.5, val2026: 2.4, markYear: 2026, sector: "athletes", subSector: "Equipment & Infrastructure", model: "B2C", status: "public", basis: "Market cap, 6 Nov 2026", source: "https://www.foxbusiness.com/quote?stockTicker=PTON" }),
  u({ name: "Wellhub (formerly Gympass)", domain: "wellhub.com", city: "New York City", country: "USA", continent: "North America", val2025: 2.4, val2026: 2.4, markYear: 2023, sector: "athletes", subSector: "Classes & Tutorials", model: "B2B2C", status: "private", basis: "Last round Aug 2023", source: "https://www.cbinsights.com/company/gympass/financials" }),
  u({ name: "Strava", domain: "strava.com", city: "San Francisco", country: "USA", continent: "North America", val2025: 2.2, val2026: 2.2, markYear: 2025, sector: "athletes", subSector: "Tracking & Analytics", model: "B2C", status: "private", basis: "May 2025 round; filed confidentially for IPO, Jan 2026", source: "https://forgeglobal.com/insights/strava-upcoming-ipo-news/" }),
  u({ name: "Basic-Fit", domain: "basic-fit.nl", city: "Hoofddorp", country: "Netherlands", continent: "Europe", val2025: 4.5, val2026: 2.2, markYear: 2026, sector: "athletes", subSector: "Classes & Tutorials", model: "B2C", status: "public", basis: "Market cap, 28 Oct 2026", source: "https://multiples.vc/public-comps/basic-fit-valuation-multiples" }),
  u({ name: "Pure Gym", domain: "puregym.com", city: "London", country: "UK", continent: "Europe", val2025: 2.0, val2026: 2.0, markYear: 2025, sector: "athletes", subSector: "Classes & Tutorials", model: "B2C", status: "private", basis: "KKR stake, Feb 2025", source: "https://frontofficesports.com/kkr-buys-396m-stake-in-puregym" }),
  u({ name: "theScore", domain: "thescore.com", city: "Toronto", country: "Canada", continent: "North America", val2025: 2.0, val2026: 2.0, markYear: 2025, sector: "fans", subSector: "News & Content", model: "B2C", status: "owned", basis: "Penn subsidiary since 2021; no standalone mark", source: "https://www.ingame.com/penn-ends-espn-bet-deal/" }),
  u({ name: "Novig", domain: "novig.co", city: "New York City", country: "USA", continent: "North America", val2025: null, val2026: 2.0, markYear: 2026, sector: "fans", subSector: "Fantasy Sports & Betting", model: "B2C", status: "private", short: "$2B round, Sep 2026", basis: "Round at $2B reported 30 Sep 2026 (WSJ), up from $500M in Feb", source: "https://casino.org/news/good-news-for-sydney-sweeney-as-novig-valuation-hits-2-billion" }),
  u({ name: "Smart Fit", domain: "smartfit.com.br", city: "São Paulo", country: "Brazil", continent: "South America", val2025: 4.3, val2026: 1.9, markYear: 2026, sector: "athletes", subSector: "Classes & Tutorials", model: "B2C", status: "public", basis: "Market cap R$10.6B, 2 Oct 2026", source: "https://www.bloomberglinea.com/quote/SMFT3:BS/" }),
  u({ name: "Genius Sports", domain: "geniussports.com", city: "London", country: "UK", continent: "Europe", val2025: 2.9, val2026: 1.7, markYear: 2026, sector: "execs", subSector: "Team & Club Management", model: "B2B", status: "public", basis: "Market cap, 30 Oct 2026", source: "https://www.debelegger.nl/en/stock/GENI.US" }),
  u({ name: "Eight Sleep", domain: "eightsleep.com", city: "New York City", country: "USA", continent: "North America", val2025: null, val2026: 1.5, markYear: 2026, sector: "athletes", subSector: "Recovery & Injury Prevention", model: "B2C", status: "private", short: "Tether-led round, Mar 2026", basis: "$50M round led by Tether, Mar 2026", source: "https://techcrunch.com/2026/03/04/eight-sleep-raises-50m-at-1-5b-valuation" }),
  u({ name: "Teamworks", domain: "teamworks.com", city: "Durham", country: "USA", continent: "North America", val2025: 1.2, val2026: 1.5, markYear: 2026, sector: "execs", subSector: "Team & Club Management", model: "B2B", status: "private", basis: "Hg growth investment, Apr 2026 (above $1.5B)", source: "https://teamworks.com/blog/hg-growth-investment/" }),
  u({ name: "Cult.fit", domain: "cult.fit", city: "Bangalore", country: "India", continent: "Asia", val2025: 1.6, val2026: 1.5, markYear: 2026, sector: "athletes", subSector: "Classes & Tutorials", model: "B2C", status: "private", basis: "Last valuation per DRHP; IPO filed Jul 2026", source: "https://bigul.co/blog/ipo/cultfit-ipo-2026-issue-size-price-band-open-date-listing-date-all-key-details" }),
  u({ name: "TickPick", domain: "tickpick.com", city: "New York City", country: "USA", continent: "North America", val2025: 1.5, val2026: 1.5, markYear: 2024, sector: "fans", subSector: "Ticketing & Merchandise", model: "B2C", status: "private", basis: "No disclosed valuation since its 2024 raise", source: "https://yespress.io/tickpick" }),
  u({ name: "Cosm", domain: "cosm.com", city: "Los Angeles", country: "USA", continent: "North America", val2025: 1.5, val2026: 1.5, markYear: 2024, sector: "fans", subSector: "Fan Engagement", model: "B2B", status: "private", basis: "Sony-led Series C Jun 2026, valuation undisclosed", source: "https://www.bisnow.com/national/news/retail/sony-buys-100m-piece-of-cosms-immersive-theaters-135174" }),
  u({ name: "Tempo", domain: "tempo.fit", city: "San Francisco", country: "USA", continent: "North America", val2025: 1.3, val2026: 1.3, markYear: 2021, sector: "athletes", subSector: "Equipment & Infrastructure", model: "B2C", status: "private", basis: "Last round Apr 2021", source: "https://www.caplight.com/company/tempo-recreational-goods" }),
  u({ name: "Topgolf", domain: "topgolf.com", city: "Dallas", country: "USA", continent: "North America", val2025: 2.7, val2026: 1.1, markYear: 2026, sector: "athletes", subSector: "Booking & Discovery", model: "B2C", status: "owned", basis: "Leonard Green bought 60% at $1.1B EV, closed Q1 2026", source: "https://www.sgieurope.com/corporate/callaway-completes-topgolf-sale-to-lgp/118833.article", prevCorrected: true }),
  u({ name: "Underdog", domain: "underdogfantasy.com", city: "Brooklyn", country: "USA", continent: "North America", val2025: 1.2, val2026: 1.1, markYear: 2026, sector: "fans", subSector: "Fantasy Sports & Betting", model: "B2C", status: "owned", basis: "IG Group deal at $1.1B upfront (up to $1.3B), Jul 2026", source: "https://www.nasdaq.com/articles/ig-group-acquire-underdog-11b-us-prediction-markets-push" }),
  u({ name: "Hero Esports (VSPO)", domain: "heroesports.com", city: "Shanghai", country: "China", continent: "Asia", val2025: 1.1, val2026: 1.1, markYear: 2023, sector: "fans", subSector: "News & Content", model: "B2C", status: "private", basis: "Savvy Games' $265M, Feb 2023", source: "https://sportbusiness.com/news/savvy-claims-record-esports-investment-deal-with-vspo-tie-up" }),
  u({ name: "Fiture", domain: "fiture.com", city: "Chengdu", country: "China", continent: "Asia", val2025: 1.0, val2026: 1.0, markYear: 2021, sector: "athletes", subSector: "Equipment & Infrastructure", model: "B2C", status: "private", basis: "Last round 2021", source: "https://multiples.vc/private-comps/fiture" }),
  u({ name: "Zwift", domain: "zwift.com", city: "Long Beach", country: "USA", continent: "North America", val2025: 1.0, val2026: 1.0, markYear: 2020, sector: "athletes", subSector: "Equipment & Infrastructure", model: "B2C", status: "private", basis: "Last round Sep 2020; acquired ROUVY Apr 2026", source: "https://multiples.vc/private-comps/zwift" }),
  u({ name: "Minute Media", domain: "minutemedia.com", city: "London", country: "UK", continent: "Europe", val2025: 1.0, val2026: 1.0, markYear: 2024, sector: "fans", subSector: "News & Content", model: "B2C", status: "private", basis: "Last round Jan 2024", source: "https://multiples.vc/private-comps/minute-media" }),
  u({ name: "ClassPass", domain: "classpass.com", city: "New York City", country: "USA", continent: "North America", val2025: 1.0, val2026: 1.0, markYear: 2020, sector: "athletes", subSector: "Booking & Discovery", model: "B2C", status: "owned", basis: "Part of Playlist, merged with eGym Mar 2026 ($7.5B combined)", source: "https://www.leisureopportunities.co.uk/news/Playlist-and-EGYM-merge-creating-a-US75-billion-company/362063" }),
  u({ name: "SeatGeek", domain: "seatgeek.com", city: "New York City", country: "USA", continent: "North America", val2025: 1.0, val2026: 1.0, markYear: 2022, sector: "fans", subSector: "Ticketing & Merchandise", model: "B2C", status: "private", basis: "Last round 2022; secondary estimate ~$1.0B (Jul 2026)", source: "https://www.trueup.io/co/seatgeek" }),
  u({ name: "Vagaro", domain: "sales.vagaro.com", city: "San Francisco", country: "USA", continent: "North America", val2025: 1.0, val2026: 1.0, markYear: 2021, sector: "execs", subSector: "Stadium & Facilities", model: "B2B", status: "private", basis: "Last round Nov 2021", source: "https://multiples.vc/private-comps/vagaro" }),
];

export const UNICORN_EXITS: UnicornExit[] = [
  { name: "Dream11", domain: "dream11.com", country: "India", val2025: 8.0, reason: "Lost unicorn status after India's real-money gaming ban (Aug 2025)", short: "India gaming ban", source: "https://www.business-standard.com/industry/news/real-money-gaming-firms-lose-unicorn-status-after-ban-125091101125_1.html" },
  { name: "AutoGraph", domain: "autograph.io", country: "USA", val2025: 3.7, reason: "Merged into Future (Jan 2025), last valued at $275M", short: "Merged into Future", source: "https://techcrunch.com/2025/01/23/tom-bradys-autograph-merges-with-digital-fitness-company-future" },
  { name: "Games24x7", domain: "games24x7.com", country: "India", val2025: 2.5, reason: "Lost unicorn status after India's real-money gaming ban", short: "India gaming ban", source: "https://www.business-standard.com/industry/news/real-money-gaming-firms-lose-unicorn-status-after-ban-125091101125_1.html" },
  { name: "Mobile Premier League", domain: "mpl.live", country: "India", val2025: 2.3, reason: "Lost unicorn status after India's real-money gaming ban", short: "India gaming ban", source: "https://www.business-standard.com/industry/news/real-money-gaming-firms-lose-unicorn-status-after-ban-125091101125_1.html" },
  { name: "Hupu", domain: "hupu.com", country: "China", val2025: 1.0, reason: "Sold to Xunlei for RMB 500M (Jun 2025)", short: "Sold to Xunlei", source: "https://www.thepaper.cn/newsDetail_forward_30942227" },
];

export const UNICORN_PENDING: UnicornPending[] = [
  { name: "Matchroom", domain: "matchroom.com", country: "UK", val2026: 1.3, note: "Bruin Capital bought 15% at a valuation above £1B (May 2026)", short: "Bruin stake, £1B+", source: "https://www.sportcal.com/news/matchroom-targets-us-growth-with-minority-stake-sale-to-bruin-capital/" },
  { name: "TMRW Sports (TGL)", domain: "tmrwsportsgroup.com", country: "USA", val2026: 1.0, note: "Round above $1B being finalised (Sep 2026), close not confirmed", short: "$1B+ round unconfirmed", source: "https://frontofficesports.com/new-funding-doubles-tgl-parent-company-valuation-to-1b/" },
];

/** Every host the section asks the server to link. */
export const UNICORN_DOMAINS: string[] = [
  ...UNICORNS.map((x) => x.domain),
  ...UNICORN_EXITS.map((x) => x.domain),
  ...UNICORN_PENDING.map((x) => x.domain),
];
