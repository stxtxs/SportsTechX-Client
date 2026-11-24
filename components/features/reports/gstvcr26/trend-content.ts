/**
 * GSTVCR26 · Trends: the three trend cards and their deep dives.
 *
 * Source of truth: Google Doc "GSTVCR 2026 Trend Research Shortlist"
 * (Drive id 1dGUZDSTaoDugXhesqgZymUdRgw2g6hsA4AVcgHV4u7Y), section 2
 * "Detailed trend research", trends 2, 3 and 14. To re-sync after the doc
 * changes, re-read those three sections and update the matching entry below:
 *   headline / summary / category  ← "Proposed headline", "One-line explanation", "Trend category"
 *   happening                      ← "1. What is happening?" (and 14's "1b. The build-out")
 *   figures / charts               ← "2. Supporting data" + "STX database check"
 *   evidence                       ← "3. Evidence of a recurring pattern" (14: "Beyond Southeast Asia")
 *   watch                          ← "4. Companies and organisations to watch"
 *   meaning / risks                ← "5. Investment implications"
 *   narrative                      ← "7. Suggested report narrative"
 * STX figures are the doc's database cut (January to October each year), so
 * 2026 is compared with the same ten months of 2025.
 */

export type TrendFigure = { value: string; label: string };

/** One bar per item; `group` charts show one bar per series for each row. */
export type TrendChart =
  | {
      kind: "bars";
      title: string;
      note?: string;
      unit: "usd_m" | "count" | "pct" | "usd_b";
      items: { label: string; value: number; display?: string; highlight?: boolean }[];
    }
  | {
      kind: "group";
      title: string;
      note?: string;
      unit: "usd_m" | "count";
      series: string[];
      rows: { label: string; values: (number | null)[]; displays?: (string | null)[] }[];
    };

export type TrendEvidence = { who: string; what: string; date: string; why: string };
export type TrendWatch = { name: string; country: string; note: string };
export type TrendSource = { label: string; url: string };

export type TrendDeepDive = {
  id: string;
  tag: string;
  /** Short card title. */
  title: string;
  /** Long headline shown at the top of the deep dive. */
  headline: string;
  summary: string;
  category: string;
  stat: string;
  statLabel: string;
  /** Optional highlight for the report's Summary card; defaults to stat / statLabel. */
  highlight?: { num: string; label: string };
  icon: "merge" | "watch" | "plane";
  figures: TrendFigure[];
  happening: string[];
  charts: TrendChart[];
  evidenceTitle: string;
  evidence: TrendEvidence[];
  watch: TrendWatch[];
  meaning: string[];
  risks: string;
  narrative: string;
  sources: TrendSource[];
};

const FULL_STACK: TrendDeepDive = {
  id: "full-stack",
  tag: "M&A & CONSOLIDATION",
  title: "THE FULL-STACK SHOPPING SPREE",
  headline: "Platforms buy their way to the whole workflow",
  summary:
    "Scaled sports tech platforms are acquiring data, media and niche software at pace, turning point solutions into features and opening an exit route for early-stage companies.",
  category: "Executive Tech: Team & Club Management, Media & Sponsors · Fan Tech: Fantasy Sports & Betting (enablement)",
  stat: "83%",
  statLabel: "of 2026 acquisitions were made by sportstech companies, up from 64% in 2021",
  highlight: { num: "83%", label: "Of 2026 acquisitions made by SportsTech companies, up from 64% in 2021" },
  icon: "merge",
  figures: [
    { value: "83%", label: "of acquisitions in 2026 (Jan–Oct) were made by sportstech companies, up from 64% in 2021" },
    { value: "$4.6B", label: "disclosed M&A value, Jan–Oct 2026, up from $2.9B a year earlier, across fewer deals (54 vs 75)" },
    { value: "15", label: "deals by Teamworks since 2023, the most active acquirer in the SportsTechX database" },
    { value: "$1.2B", label: "paid (up to) by Genius Sports for Legend, its largest deal, moving from data into media" },
  ],
  happening: [
    "The serial-acquirer pattern the 2025 report noted (Catapult, Hudl, Teamworks) became the main exit path in 2026 and spread to data and betting infrastructure. Teamworks bought PFF's enterprise unit after Zelus, Telemetry Sports and Sportlogiq. Hudl announced its 19th acquisition. Genius Sports closed its largest deal, Legend, moving from data into media and audience monetisation.",
    "Three forces drive it. AI needs proprietary data to be defensible, so platforms buy data owners. Clubs want fewer vendors. And the 2023–2024 funding drought left many subscale startups open to sale. What is new in 2026 is the size, with nine- and ten-figure deals, and the move from adjacent features to data and audience assets.",
    "Other 2026 consolidation in the data: Playlist (ClassPass owner) merging with eGym at $785M, Versant buying Full Swing Golf for $530M, Teamworks buying Atrium Sports from Sportradar for $170M, VALD buying GymAware, DAZN buying three companies including Everpass, and Fastbreak AI two. Stats Perform raised $275M of equity plus $475M of debt to compete with the roll-ups.",
  ],
  charts: [
    {
      kind: "bars",
      title: "Share of acquisitions made by sportstech companies",
      note: "SportsTechX database. 2026 = January to October.",
      unit: "pct",
      items: [
        { label: "2021", value: 64 },
        { label: "2025", value: 82 },
        { label: "2026", value: 83, highlight: true },
      ],
    },
    {
      kind: "group",
      title: "Fewer, larger deals: January to October",
      note: "SportsTechX database. Acquisitions count and disclosed value.",
      unit: "count",
      series: ["2025", "2026"],
      rows: [
        { label: "Acquisitions", values: [75, 54] },
        { label: "Disclosed value", values: [2.9, 4.6], displays: ["$2.9B", "$4.6B"] },
      ],
    },
    {
      kind: "bars",
      title: "Largest 2026 consolidation deals",
      note: "Disclosed or reported value. PFF enterprise is a reported estimate; Genius / Legend includes up to $300M of earn-out.",
      unit: "usd_m",
      items: [
        { label: "Genius Sports / Legend", value: 1200, display: "$1.2B", highlight: true },
        { label: "Playlist + eGym", value: 785 },
        { label: "Versant / Full Swing Golf", value: 530 },
        { label: "Teamworks / Atrium Sports", value: 170 },
        { label: "Teamworks / PFF enterprise", value: 100, display: "$100M+" },
      ],
    },
    {
      kind: "bars",
      title: "Sports tech M&A value, broad market scope",
      note: "Drake Star, full years. Includes deals well outside the SportsTechX framework; Q1 2026 alone: 107 deals, $115B+ disclosed.",
      unit: "usd_b",
      items: [
        { label: "2023", value: 27.0 },
        { label: "2024", value: 71.8 },
        { label: "2025", value: 156.0, highlight: true },
      ],
    },
  ],
  evidenceTitle: "A recurring pattern",
  evidence: [
    { who: "Teamworks / PFF enterprise", what: "Buys event data for the NFL and 240+ D1 programmes", date: "Mar 2026", why: "Data as an AI moat" },
    { who: "Teamworks / Sportlogiq", what: "Hockey and soccer tracking data", date: "Jan 2026", why: "Same playbook, new sports" },
    { who: "Genius Sports / Legend", what: "Data company buys the Covers.com and Casino.org network", date: "May 2026", why: "Vertical integration from data to audience" },
    { who: "Hudl / TeamUp", what: "Adds gamified fundraising for schools", date: "Jul 2026", why: "Platform extends into revenue tools" },
    { who: "IG Group / Underdog", what: "Up to $1.3B", date: "Jul 2026", why: "Cross-industry buyer consolidates the betting funnel" },
    { who: "Catapult / IMPECT", what: "German football data, $90M+", date: "Oct 2025", why: "Baseline for the pattern" },
  ],
  watch: [
    { name: "Teamworks", country: "US", note: "Most active acquirer of performance data" },
    { name: "Hudl", country: "US", note: "Long-running roll-up, now moving into school revenue tools" },
    { name: "Catapult", country: "Australia", note: "Wearables to a full athlete-monitoring stack" },
    { name: "Genius Sports", country: "UK", note: "Data plus media; the test case for data-to-audience integration" },
    { name: "Sportradar", country: "Switzerland", note: "Data incumbent and NBA prediction-market data distributor" },
    { name: "Stats Perform", country: "UK", note: "Likely counter-mover, newly funded" },
  ],
  meaning: [
    "The exit market for B2B team tech is strategic M&A. Investors should underwrite to a strategic buyer list from Seed.",
    "Proprietary data and sport-specific depth command the premium. Generic dashboards get bundled.",
    "This is a mature category: returns come from capital efficiency and timing. Likely targets are sport-specific tracking and event-data startups, scouting tools, and athlete-management systems in Europe and APAC.",
  ],
  risks:
    "Acquirers' public-market reaction (Genius shares fell 27% after the Legend announcement), and undisclosed prices that make multiples hard to benchmark.",
  narrative:
    "In 2025 we noted acquirers assembling full-stack platforms. In 2026 that became the dominant exit route in team and data technology. The logic is the same everywhere: AI products are only as good as the proprietary data behind them, and clubs want fewer vendors. For founders, the likeliest buyer for a sport-specific data or workflow tool is one of a handful of platforms, and the price depends on how hard that data is to recreate.",
  sources: [
    { label: "Teamworks", url: "https://teamworks.com/blog/teamworks-acquires-pff-enterprise/" },
    { label: "Silicon Prairie News", url: "https://siliconprairienews.com/?p=52614" },
    { label: "Business Wire", url: "https://www.businesswire.com/news/home/20260501560591/en" },
    { label: "S&P Global", url: "https://www.spglobal.com/market-intelligence/en/news-insights/research/2026/05/genius-sports-poised-for-sharp-media-revenue-growth-following-legend-acquisition" },
    { label: "Drake Star Q1 2026", url: "https://www.drakestar.com/news/sports-tech-report-q1-2026" },
    { label: "Investing.com", url: "https://in.investing.com/news/stock-market-news/sportradar-to-sell-atrium-sports-to-teamworks-for-170-million-93CH-5622086" },
    { label: "Reuters", url: "https://www.reuters.com/legal/transactional/classpass-owner-playlist-egym-merge-deal-backed-by-jared-kushners-firm-2026-01-15/" },
    { label: "CNBC", url: "https://www.cnbc.com/2026/07/06/versant-to-buy-golf-simulator-company-full-swing.html" },
    { label: "Legal Sports Report", url: "https://www.legalsportsreport.com/271130/underdog-bought-by-ig-group-for-up-to-1-3-billion/" },
    { label: "SBC News", url: "https://sbcnews.co.uk/featurednews/2026/05/01/genius-sports-legend-acquisition/" },
  ],
};

const WRIST_TO_WALL_STREET: TrendDeepDive = {
  id: "wrist-to-wall-street",
  tag: "WEARABLES & HEALTH",
  title: "FROM WRIST TO WALL STREET",
  headline: "Athlete wearables become health platforms and test the public markets",
  summary:
    "The leading performance wearables now sell recurring health services and have reached the scale to file for IPOs, giving Athlete Tech its first public-market benchmark since Peloton.",
  category: "Athlete Tech: Before / After Activity (Recovery & Injury Prevention) · For Activity: Hardware (Wearables)",
  stat: "2x",
  statLabel: "Before / After Activity funding, Jan–Oct 2026 vs 2025 ($738M vs $369M)",
  highlight: { num: "$10.1B", label: "Whoop's valuation as athlete wearables turn into health platforms" },
  icon: "watch",
  figures: [
    { value: "$10.1B", label: "Whoop's valuation after a $575M Series G in March 2026, up from $3.6B in 2021" },
    { value: "$1.21B", label: "Oura revenue in the nine months to June 2026, up 74% year on year" },
    { value: "2x", label: "Before / After Activity funding, Jan–Oct 2026 ($738M) vs the same period of 2025 ($369M)" },
    { value: "48.8%", label: "Activity & Performance's share of 2026 equity value, up from 20.4% in 2025" },
  ],
  happening: [
    "Whoop raised $575M at a $10.1B valuation in March 2026, with more than 2.5M members. Oura filed its S-1 in September, launched a $2.1B–2.2B Nasdaq offering at $40–44 per share, then postponed it citing market uncertainty. Strava filed confidentially in January.",
    "The shift is in the business model. Both leaders now pitch preventive health: blood testing, women's health panels, and in Whoop's case a reimbursed chronic-care pathway with a medtech investor (Abbott) on the cap table. That widens the addressable market from athletes to patients and insurers.",
    "Capital is concentrating in the few devices that became platforms. Recovery & Injury Prevention alone went from $159M to $641M (Jan–Oct, 2025 vs 2026). Hardware for the activity itself (Equipment & Infrastructure plus Wearables) raised $184M across 31 rounds, up from $73M.",
  ],
  charts: [
    {
      kind: "group",
      title: "Funding, January to October",
      note: "SportsTechX database, equity. Before / After Activity: 39 rounds in 2025, 33 in 2026.",
      unit: "usd_m",
      series: ["2025", "2026"],
      rows: [
        { label: "Before / After Activity", values: [369, 738] },
        { label: "Recovery & Injury Prevention", values: [159, 641] },
        { label: "Activity hardware", values: [73, 184] },
      ],
    },
    {
      kind: "bars",
      title: "Health-wearable rounds in 2026",
      note: "SportsTechX database. Ultrahuman's Series C includes Qualcomm; two of the four companies are Indian.",
      unit: "usd_m",
      items: [
        { label: "Whoop (US)", value: 575, highlight: true },
        { label: "Ultrahuman (India)", value: 65 },
        { label: "Temple (India)", value: 54 },
        { label: "Eight Sleep (US)", value: 50 },
      ],
    },
    {
      kind: "bars",
      title: "Valuation marks",
      note: "Oura's IPO figure is the market cap at the midpoint of its postponed range.",
      unit: "usd_b",
      items: [
        { label: "Whoop, 2021", value: 3.6 },
        { label: "Eight Sleep, 2026", value: 1.5 },
        { label: "Whoop, Series G 2026", value: 10.1, highlight: true },
        { label: "Oura, Series E", value: 11.0 },
        { label: "Oura, IPO midpoint", value: 13.5, display: "~$13.5B" },
      ],
    },
  ],
  evidenceTitle: "A recurring pattern",
  evidence: [
    { who: "Whoop", what: "Series G; Abbott and Mayo Clinic among investors; GCC expansion via a Doha lab", date: "Mar 2026", why: "Medtech strategics validate the health thesis" },
    { who: "Oura", what: "Public S-1, roadshow, postponement", date: "Sep–Oct 2026", why: "First public test of the model; price discovery failed for now" },
    { who: "Strava", what: "Confidential IPO filing, Goldman Sachs lead", date: "Jan 2026", why: "Same exit route for software-led fitness" },
    { who: "Temple (India)", what: "$54M for a wearable startup from Steadview and Peak XV", date: "Q1 2026", why: "Pattern spreading to India" },
    { who: "Oura", what: "Tender offer at a 25% discount to its $11B Series E", date: "Jan 2026", why: "Secondary pricing signals valuation tension" },
  ],
  watch: [
    { name: "Whoop", country: "US", note: "Strap plus blood panels plus clinical services; IPO is the stated next step" },
    { name: "Oura", country: "Finland / US", note: "Profitable ring maker, IPO-ready and waiting for a window" },
    { name: "Strava", country: "US", note: "Social training platform with a confidential filing" },
    { name: "Temple", country: "India", note: "New entrant with large seed-to-growth capital" },
    { name: "Ultrahuman", country: "India", note: "Smart ring maker backed by Qualcomm" },
    { name: "Abbott, Dexcom", country: "Strategics", note: "Medtech investors in Whoop and Oura; potential acquirers" },
  ],
  meaning: [
    "The opportunity sits in recurring health revenue on top of hardware: diagnostics, women's health, clinical integrations, and data services for insurers and employers.",
    "Late-stage capital is concentrated in two or three names. Early-stage room exists in specialised sensors and B2B layers, such as team and military use and reimbursement software.",
    "The device is the entry ticket. The valuation comes from the recurring health service built on its data.",
  ],
  risks:
    "Public investors balked at Oura's price and lock-up; big-tech competition (Apple, Samsung, Google); medical-device regulation once products move into diagnosis.",
  narrative:
    "For three years, athlete hardware looked like a post-pandemic hangover. In 2026 two of its survivors became health platforms. Whoop raised at $10.1B with Abbott and Mayo Clinic in the round; Oura showed $1.21B of revenue in nine months and launched a Nasdaq IPO before postponing it. The lesson for founders is that the device is the entry ticket. The valuation comes from the recurring health service built on its data.",
  sources: [
    { label: "Whoop", url: "https://www.whoop.com/ae/en/press-center/whoop-announces-series-g-funding/" },
    { label: "The Next Web", url: "https://thenextweb.com/news/whoop-series-g-575m-valuation-ipo-health-platform" },
    { label: "Fierce Healthcare", url: "https://www.fiercehealthcare.com/digital-health/smart-ring-maker-oura-files-go-public-pitching-investors-ai-driven-preventive-health" },
    { label: "MobiHealthNews", url: "https://www.mobihealthnews.com/news/oura-postpones-ipo-amid-market-uncertainty" },
    { label: "Mobile World Live", url: "https://www.mobileworldlive.com/?p=513873" },
    { label: "SGI Europe", url: "https://www.sgieurope.com/financial/strava-files-for-ipo-as-fitness-app-capitalizes-on-growth/118936.article" },
    { label: "TechCrunch (Ultrahuman)", url: "https://techcrunch.com/2026/09/03/qualcomm-backs-ultrahuman-in-70m-round-on-bet-to-turn-smart-rings-into-computers/" },
    { label: "TechCrunch (Eight Sleep)", url: "https://techcrunch.com/2026/03/04/eight-sleep-raises-50m-at-1-5b-valuation/" },
    { label: "Ventureburn", url: "https://ventureburn.com/temple-raises-54-million-to-build-high-performance-wearable-for-elite-athletes/" },
    { label: "the5krunner", url: "https://the5krunner.com/2026/04/01/whoop-valuation-garmin/" },
  ],
};

const TRAIN_WATCH_TRAVEL: TrendDeepDive = {
  id: "train-watch-travel",
  tag: "SPORTS & WELLNESS TOURISM",
  title: "TRAIN, WATCH, TRAVEL",
  headline: "Southeast Asia turns fitness and fandom into a reason to fly",
  summary:
    "Travellers now book trips around a race, a fight camp or a retreat, and Southeast Asia is building the facilities to capture that spend faster than its startups are raising money.",
  category: "Athlete Tech: Before / After Activity (Booking & Discovery, Coaching) · Executive Tech: Organisations & Venues (League & Event Management)",
  stat: "$0",
  statLabel: "raised by Southeast Asian sports tech in 2025, while race and event crowds set records",
  highlight: { num: "$0", label: "Raised by Southeast Asian SportsTech in 2025, despite record event crowds" },
  icon: "plane",
  figures: [
    { value: "$982.4B", label: "global wellness tourism in 2025, up 11.4%; Asia's grew 15.6%" },
    { value: "20,000+", label: "HYROX Bangkok athletes in August 2026, from 4,500 spots at the 2025 debut" },
    { value: "$4.3M", label: "Southeast Asian sports tech equity, Jan–Oct 2026, across two rounds; zero in 2025" },
    { value: "200", label: "golf courses Vietnam is targeting by 2030, from about 60 in 2023" },
  ],
  happening: [
    "Wellness trips are 8.1% of all trips but 18% of tourism spend, and Asia-Pacific leads with 600.5M trips. Thailand has 5,000+ Muay Thai camps, and its five-year DTV visa covers soft-power activities including Muay Thai.",
    "Purpose-driven travel holds up as mass tourism softens, and capital is flowing into the physical layer. In Bangkok, BDMS's WellEra is a 29bn baht, 200,000 m² wellness district opening fully in 2030. Thailand's Cabinet approved a $192M Andaman health and wellness hub in Phuket. Bali opened the 41-hectare Sanur Health SEZ around a 255-bed international hospital, and new longevity retreats keep opening. Vietnam had 90+ courses in 2025, with 50+ more in planning or under construction, the largest pipeline outside the US.",
    "The software layer is barely funded. Southeast Asian sports tech raised 2 rounds ($2.0M) in 2024, none in 2025, and 2 ($4.3M) to October 2026: Let's Game Now ($3.3M) and Vibefam ($1.0M), both in Singapore. Booking & Discovery is the region's largest category, with 26 tracked companies.",
  ],
  charts: [
    {
      kind: "bars",
      title: "HYROX Bangkok participants",
      note: "4,500 spots sold out in 18 hours at the 2025 debut. HYROX revenue: ~$130M (2025) → $220M+ expected (2026).",
      unit: "count",
      items: [
        { label: "2025 debut", value: 4500 },
        { label: "Mar 2026", value: 17500, display: "~17,500" },
        { label: "Aug 2026", value: 20000, display: "20,000+", highlight: true },
      ],
    },
    {
      kind: "group",
      title: "Race-weekend attendance",
      note: "Thailand MotoGP 2026 sold out every seat (5bn baht+ estimated); attendance not yet published.",
      unit: "count",
      series: ["2024", "2025", "2026"],
      rows: [
        { label: "Singapore F1", values: [269072, 300641, 301294] },
        { label: "Thailand MotoGP", values: [205343, 224634, null], displays: [null, null, "Sold out"] },
        { label: "Indonesia MotoGP", values: [121252, 140324, 157875] },
      ],
    },
    {
      kind: "bars",
      title: "Southeast Asian sports tech equity",
      note: "SportsTechX database. 2026 = January to October.",
      unit: "usd_m",
      items: [
        { label: "2024 (2 rounds)", value: 2.0 },
        { label: "2025 (0 rounds)", value: 0 },
        { label: "2026 (2 rounds)", value: 4.3, highlight: true },
      ],
    },
    {
      kind: "bars",
      title: "Vietnam: operational 18-hole golf courses",
      note: "Golf tourists spend 6x more than regular tourists; golf revenue projected to pass $1B in 2025.",
      unit: "count",
      items: [
        { label: "2023", value: 60, display: "~60" },
        { label: "Early 2024", value: 80 },
        { label: "2025", value: 90, display: "90+" },
        { label: "2030 target", value: 200, highlight: true },
      ],
    },
  ],
  evidenceTitle: "Beyond Southeast Asia",
  evidence: [
    { who: "Japan", what: "Record 42.7M visitors in 2025; international skiers now 80% of all skiers", date: "2025/26", why: "Ski tourism hits new heights, Hakuba Valley 48% foreign" },
    { who: "Dubai Fitness Challenge", what: "2.74M participants (2024) → 3M+ (2025)", date: "2024–2025", why: "Mass participation as a destination draw" },
    { who: "Dubai Run", what: "278,000 → 307,000+ → 310,000+ runners", date: "Nov 2026", why: "Three straight records" },
    { who: "Dubai Ride", what: "40,327 → record 41,836 cyclists", date: "Nov 2026", why: "Same pattern on two wheels" },
  ],
  watch: [
    { name: "HYROX", country: "Global", note: "Fitness racing format scaling fastest in Asia" },
    { name: "BDMS Wellness Clinic", country: "Thailand", note: "Anchor of Bangkok's WellEra district" },
    { name: "Minor Hotels (Layan Life)", country: "Thailand", note: "Medical-wellness facility in Phuket" },
    { name: "GOCO Hospitality", country: "Thailand", note: "Acquired Fivelements Bali" },
    { name: "Klook", country: "Hong Kong", note: "Experiences booking; withdrew its US IPO in Oct 2026" },
    { name: "Vibefam", country: "Singapore", note: "One of two funded regional sports tech startups in 2026" },
  ],
  meaning: [
    "Booking, registration, cross-border payments and programme software around these facilities and events is underbuilt. The demand is proven; the software serving it is still waiting for capital.",
    "Exits so far run through hospitality M&A, and public markets are cautious: Klook grew revenue from $335.2M to $417.1M yet withdrew its US IPO in October 2026.",
  ],
  risks:
    "Government-funded event economics, Bali arrivals plateauing (H1 2026 down 2.4%), Thailand arrivals down two years running, and self-reported impact figures.",
  narrative:
    "Sport is becoming the reason to book the flight. HYROX Bangkok went from 4,500 spots to over 20,000 athletes in eighteen months, Singapore's F1 crowd passed 300,000 twice, and Indonesia's MotoGP set a third straight record. Behind the crowds sits a physical build-out. Yet in our data Southeast Asian sports tech raised nothing in 2025 and only $4.3M across two rounds in 2026. The demand is proven; the software serving it is still waiting for capital.",
  sources: [
    { label: "Global Wellness Institute", url: "https://globalwellnessinstitute.org/?p=56347" },
    { label: "Australasian Leisure Management", url: "https://www.ausleisure.com.au/news/global-wellness-economy-reaches-us75-trillion-as-growth-forecast-to-continue" },
    { label: "The Nation (HYROX)", url: "https://www.nationthailand.com/news/40069918" },
    { label: "Forbes Australia", url: "https://www.forbes.com.au/?p=170775" },
    { label: "Mothership", url: "https://mothership.sg/2026/10/2026-f1-singapore-2nd-highest-attendance/" },
    { label: "Bangkok Post", url: "https://bangkokpost.com/sports/2971750/govt-pulling-support-for-motogp-in-thailand-says-newin" },
    { label: "Katadata", url: "https://katadata.co.id/lifestyle/wisata-dan-kuliner/6acdaaad30a0b/injourney-catat-157875-penonton-mandalika-kian-mendunia-lewat-sport-tourism" },
    { label: "Khaosod", url: "https://www.khaosodenglish.com/tech/2026/06/22/bdms-launches-a-29-billion-baht-wellera-wellness-ecosystem/amp/" },
    { label: "Travel Weekly Asia", url: "https://www.travelweekly-asia.com/Travel-News/Sports-Travel/Vietnam-tees-off-new-golf-strategy" },
    { label: "VOV", url: "https://english.vov.vn/en/sports/vietnam-emerges-as-asias-fast-growing-golf-tourism-destination-post1338567.vov" },
    { label: "Renaissance Capital", url: "https://www.renaissancecapital.com/IPO-Center/News/122274/pan-asian-travel-booking-platform-klook-technology-withdraws-estimated-400" },
    { label: "Dubai Media Office", url: "https://mediaoffice.ae/en/news/2026/novemebr/22-11/dubai-run-2026-brings-more-than-310000-runners" },
  ],
};

/** Card order on the page: doc trends 2, 3, 14. */
export const TREND_DEEP_DIVES_DEFAULT: TrendDeepDive[] = [FULL_STACK, WRIST_TO_WALL_STREET, TRAIN_WATCH_TRAVEL];
