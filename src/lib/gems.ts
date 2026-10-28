/**
 * Gem pricing. Every AI action costs gems; students buy gem packs.
 * Rule: the cheapest a gem ever sells for (after payment fees) must be at least
 * MIN_MARGIN x the most AI cost a single gem can cover.
 */

/**
 * Hard limits the server enforces on every paid action. Worst-case costs below
 * are only valid while these limits hold, so the server reads them from here.
 */
export const LIMITS = {
  fileBytes: 25 * 1024 * 1024, // largest PDF/photo we will read
  filesPerBuild: 12, // files read in one study-set build
  buildChars: 150_000, // characters sent to the organizer
  syllabusChars: 60_000,
  transcriptOutputTokens: 12_000, // per file read
  organizeOutputTokens: 16_000, // study-set output
  episodeOutputTokens: 1_500, // episode script
  episodeChars: 4_500, // voiced episode length (≈5 clips)
  speakChars: 7_200, // one read-aloud request (≤6 clips, each charged)
  clipChars: 1_200, // one voiced clip
  recordingBase64Chars: 14_000_000, // ≈5 min spoken note
} as const;

/** Worst-case AI cost per unit of work under LIMITS, in USD (deliberately high). */
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

/** What is left per BrainBuck for AI after payment fees and overhead. */
export const aiBudgetPerGem = (p: { gems: number; priceUsd: number }) => netPerGem(p) * (1 - overheadShare());

export const WELCOME_GEMS = 25;
/** Free welcome BrainBucks are a marketing cost, budgeted per new student (USD). */
export const FREE_BUDGET_USD_PER_STUDENT = 0.5;
export const welcomeWorstCaseUsd = () => WELCOME_GEMS * maxCostPerGem();
export const NOT_ENOUGH = "NOT_ENOUGH_GEMS";
