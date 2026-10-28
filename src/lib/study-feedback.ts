export function canAfford(cost: number, balance: number) {
  return balance - cost >= -3;
}

export function isFundsError(error: unknown) {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error :
    error && typeof error === "object" && "message" in error ? String(error.message) : "";
  return /NOT_ENOUGH_GEMS|gem_wallets_balance_check/i.test(message);
}

export function shouldCelebrate(today: number, goal: number, celebrated: boolean) {
  return today >= goal && goal > 0 && !celebrated;
}

export function practiceAction(known: boolean, marked?: "ok" | "miss") {
  return known || marked === "ok" ? "Review" : "Check answer";
}

/** Coalesce simultaneous requests, cache successes, and allow failed requests to retry. */
export function createAudioCache() {
  const cached = new Map<string, { urls: string[]; expires: number }>();
  const pending = new Map<string, Promise<string[]>>();
  return (key: string, resolve: () => Promise<string[]>) => {
    const hit = cached.get(key);
    if (hit && hit.expires > Date.now()) return Promise.resolve(hit.urls);
    const existing = pending.get(key);
    if (existing) return existing;
    const task = resolve().then((urls) => {
      cached.set(key, { urls, expires: Date.now() + 5 * 60 * 60 * 1000 });
      return urls;
    }).finally(() => pending.delete(key));
    pending.set(key, task);
    return task;
  };
}