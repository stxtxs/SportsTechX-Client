/* ─────────────────────────────────────────────────────────────────────────
   FTABR26 · company display names and descriptions

   The report's company figures come from the admin ("Figures as published")
   or the committed snapshot, both carrying database spellings and long
   descriptions. These maps give the report one house spelling and a short
   description (sentence case, max 6 words) per company, applied when the
   facts are resolved, so tables and generated copy always agree.
   Add a row here when a new company enters a top-10 list.
   ──────────────────────────────────────────────────────────────────────── */

/** Database spelling → report spelling */
export const FTABR26_COMPANY_NAMES: Record<string, string> = {
  "Barca Vision": "Barça Vision",
  "Skill Corner": "SkillCorner",
  "StatsPerform": "Stats Perform",
  "Tickpick": "TickPick",
  "Onefootball": "OneFootball",
};

/** Report spelling → short description */
export const FTABR26_COMPANY_DESCRIPTIONS: Record<string, string> = {
  // Football Only
  "Sorare": "Fantasy football with digital collectibles",
  "OneFootball": "Football media and streaming platform",
  "TOCA Football": "Training centres and smart equipment",
  "Barça Vision": "FC Barcelona's digital fan platform",
  "SkillCorner": "Broadcast tracking data",
  "TraceUp": "Automated match video and highlights",
  "Playermaker": "Foot-worn performance tracking",
  "Classic Football Shirts": "Marketplace for football shirts",
  "Draftea": "Daily fantasy sports platform",
  "Goals": "Online football video game",
  // Football Also
  "DAZN": "Sports streaming platform",
  "Cosm": "Immersive live sports venues",
  "Teamworks": "Operations platform for sports teams",
  "Genius Sports": "Sports data and betting technology",
  "Stats Perform": "Sports data and AI",
  "TickPick": "No-fee ticket marketplace",
  "SeatGeek": "Ticketing platform",
  "theScore": "Sports media and betting app",
  "Pixellot": "Automated sports production",
  "Minute Media": "Sports content and publishing",
};

export function ftabr26CompanyName(name: string): string {
  return FTABR26_COMPANY_NAMES[name] ?? name;
}

/** Rename and re-describe one company row; unknown companies pass through. */
export function ftabr26DisplayCompany<T extends { name: string; description?: string | null }>(row: T): T {
  const name = ftabr26CompanyName(row.name);
  return { ...row, name, description: FTABR26_COMPANY_DESCRIPTIONS[name] ?? row.description };
}
