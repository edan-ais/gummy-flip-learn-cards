/**
 * Gem pricing. Every AI action costs gems; students buy gem packs.
 * Rule: the cheapest a gem ever sells for (after payment fees) must be at least
 * MIN_MARGIN x the most AI cost a single gem can cover.
 */

/**
 * No hard caps: bigger work costs more. Each unit below is one "step" of work;
 * a task is charged one price per step it uses.
 */
export const UNITS = {
  parseChars: 30_000, // characters organized per parse step
  fileBytes: 5 * 1024 * 1024, // bytes read per file step (a 12 MB PDF = 3 steps)
  episodeClips: 5, // voiced clips included in an episode price
  recordingBase64Chars: 7_000_000, // ≈2.5 minutes of speech per transcription step
} as const;

/** Steps needed to read one file of this size (at least 1). */
export const fileSteps = (bytes: number) => Math.max(1, Math.ceil(bytes / UNITS.fileBytes));
/** BrainBucks to read files of these sizes. */
export const filesCost = (sizes: number[]) => sizes.reduce((n, b) => n + GEM_COST.ocrPerFile * fileSteps(b), 0);
/** Parse steps for this much text (at least 1). */
export const parseSteps = (chars: number) => Math.max(1, Math.ceil(chars / UNITS.parseChars));
/** BrainBucks for a spoken note of this encoded length. */
export const transcriptionCost = (b64Chars: number) =>
  GEM_COST.transcription * Math.max(1, Math.ceil(b64Chars / UNITS.recordingBase64Chars));
/** Extra BrainBucks when an episode script needs more clips than its price includes. */
export const extraEpisodeCost = (clips: number) => Math.max(0, clips - UNITS.episodeClips) * GEM_COST.speechClip;

/** Worst-case AI cost per step of work (see UNITS), in USD (deliberately high). */
export const AI_COST_USD = {
  parsePer30k: 0.05, // organize up to 30k characters, capped output
  ocrPerFile: 0.03, // read one PDF/photo up to LIMITS.fileBytes, capped output
  episode: 0.06, // capped script + up to 5 voiced clips
  speechClip: 0.01, // one clip up to LIMITS.clipChars (cached after)
  transcription: 0.01, // up to 5 minutes of speech
} as const;

/**
 * Costs that aren't one AI call, as a share of net revenue: hosting/storage,
 * AI spent on failed work we refund, and support. Prices must cover AI after this.
 */
export const OVERHEAD_SHARE = { hosting: 0.1, refundedFailures: 0.1, other: 0.05 } as const;
export const overheadShare = () => Object.values(OVERHEAD_SHARE).reduce((a, b) => a + b, 0);

export const GEM_COST = {
  parseBase: 2,
  parsePer30k: 4,
  ocrPerFile: 2,
  episode: 4,
  speechClip: 1,
  transcription: 1,
} as const;

/** BrainBucks to build a study set: base + per 30k characters + per file step read. */
export function processCost(chars: number, fileSizes: number[] = []) {
  return GEM_COST.parseBase + GEM_COST.parsePer30k * parseSteps(chars) + filesCost(fileSizes);
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

/** What is left per BrainBuck for AI after payment fees and overhead. */
export const aiBudgetPerGem = (p: { gems: number; priceUsd: number }) => netPerGem(p) * (1 - overheadShare());

export const WELCOME_GEMS = 25;
/** Free welcome BrainBucks are a marketing cost, budgeted per new student (USD). */
export const FREE_BUDGET_USD_PER_STUDENT = 0.5;
export const welcomeWorstCaseUsd = () => WELCOME_GEMS * maxCostPerGem();
export const NOT_ENOUGH = "NOT_ENOUGH_GEMS";
