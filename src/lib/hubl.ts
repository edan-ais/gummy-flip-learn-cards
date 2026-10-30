// HUBLNet Bridge (Helping Unite Businesses org). Server-side callers only; no secrets here.
export const HUBL_ORG = "04ca9689-9d94-4c69-87c4-5ade501c730c";
export const HUBL_BASE = "https://adutlixdztoaprgcicrn.supabase.co/functions/v1/hubl-api/v1";
/** Checkout stays off until the owner turns it on. No real charges while false. */
export const CHECKOUT_ENABLED = false;
export const SITE_ORIGINS = [
  "https://studylamb.waiwiser.com",
  "https://gummy-flip-learn-cards.lovable.app",
  "https://preview--gummy-flip-learn-cards.lovable.app",
  "https://id-preview--07fe60ef-fa29-45b3-b76d-f72aa6dc8b41.lovable.app",
  "http://localhost:8080",
];
export const PRIMARY_ORIGIN = SITE_ORIGINS[0];

export async function hublAction<T = Record<string, unknown>>(name: string, body: Record<string, unknown>): Promise<T> {
  const r = await fetch(`${HUBL_BASE}/_action/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-org-id": HUBL_ORG, "x-hubl-host": "studylamb.waiwiser.com" },
    body: JSON.stringify({ organizationId: HUBL_ORG, ...body }),
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  const json = (await r.json().catch(() => ({}))) as T & { ok?: boolean };
  if (!r.ok) throw new Error(`hubl_${name}_failed`);
  return json;
}

/** A charge counts only when HUBLNet says ok and the status is a success. */
export function chargeSucceeded(res: { ok?: unknown; status?: unknown; transaction_id?: unknown }) {
  return res.ok === true && typeof res.transaction_id === "string" && res.transaction_id.length > 0 &&
    ["approved", "success", "succeeded", "paid", "captured"].includes(String(res.status).toLowerCase());
}
