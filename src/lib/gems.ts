/**
 * Gem pricing. Every AI action costs gems; students buy gem packs.
 * Rule: the cheapest a gem ever sells for (after payment fees) must be at least
 * MIN_MARGIN x the most AI cost a single gem can cover.
 */

/** Our estimated worst-case AI cost per unit of work, in USD. */
export const AI_COST_USD = {
  parsePer30k: 0.05, // read + organize up to 30k characters of notes
  ocrPerFile: 0.02, // read one PDF or photo
  episode: 0.06, // write + voice one Abstract episode
  speechClip: 0.01, // voice one read-aloud / Q&A clip (cached after)
  transcription: 0.01, // turn a spoken note into text
} as const;

export const GEM_COST = {
  parseBase: 2,
  parsePer30k: 3,
  ocrPerFile: 1,
  episode: 3,
  speechClip: 1,
  transcription: 1,
} as const;

/** Gems charged to build or rebuild an exam's study set. */
export function processCost(chars: number, filesToRead: number) {
  return GEM_COST.parseBase + GEM_COST.parsePer30k * Math.max(1, Math.ceil(chars / 30_000)) + GEM_COST.ocrPerFile * filesToRead;
}

export const GEM_PACKS = [
  { id: "gems_50", gems: 50, priceUsd: 2.99 },
  { id: "gems_150", gems: 150, priceUsd: 7.99 },
  { id: "gems_400", gems: 400, priceUsd: 17.99 },
] as const;

export const PAYMENT_FEE = { pct: 0.05, fixedUsd: 0.5 };
export const MIN_MARGIN = 2;

/** Net revenue per gem for a pack, after payment fees. */
export const netPerGem = (p: { gems: number; priceUsd: number }) =>
  (p.priceUsd * (1 - PAYMENT_FEE.pct) - PAYMENT_FEE.fixedUsd) / p.gems;

/** Highest AI cost a single gem can be spent on. */
export function maxCostPerGem() {
  return Math.max(
    AI_COST_USD.parsePer30k / GEM_COST.parsePer30k,
    AI_COST_USD.ocrPerFile / GEM_COST.ocrPerFile,
    AI_COST_USD.episode / GEM_COST.episode,
    AI_COST_USD.speechClip / GEM_COST.speechClip,
    AI_COST_USD.transcription / GEM_COST.transcription,
  );
}

export const WELCOME_GEMS = 25;
export const NOT_ENOUGH = "NOT_ENOUGH_GEMS";
