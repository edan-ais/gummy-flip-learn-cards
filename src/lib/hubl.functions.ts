import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { GEM_PACKS } from "./gems";
import { CHECKOUT_ENABLED, PRIMARY_ORIGIN, SITE_ORIGINS, chargeSucceeded, hublAction } from "./hubl";

const GENERIC = { ok: true, message: "If that email can use StudyLamb, a message is on its way." };

async function sha(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function requestInfo() {
  const req = getRequest();
  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const origin = req.headers.get("origin") ?? "";
  return { ip, origin: SITE_ORIGINS.includes(origin) ? origin : PRIMARY_ORIGIN };
}

/** Fail closed: true only when both email and IP are under their hourly limits. */
async function allowed(admin: any, email: string, ip: string) {
  const since = new Date(Date.now() - 3600_000).toISOString();
  const keys = [`e:${await sha(email)}`, `ip:${await sha(ip)}`];
  const limits = [3, 10];
  for (let i = 0; i < 2; i++) {
    const { count, error } = await admin.from("auth_mail_throttle").select("id", { count: "exact", head: true }).eq("key", keys[i]).gte("created_at", since);
    if (error || (count ?? 0) >= limits[i]) return false;
  }
  const { error } = await admin.from("auth_mail_throttle").insert(keys.map((key) => ({ key })));
  return !error;
}

const linkFor = (origin: string, hash: string, type: string) =>
  `${origin}/auth/confirm?token_hash=${encodeURIComponent(hash)}&type=${type}`;

const Email = z.object({ email: z.string().trim().toLowerCase().email().max(254) });

export const studySignUp = createServerFn({ method: "POST" })
  .inputValidator((d) => Email.extend({ password: z.string().min(6).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const { ip, origin } = requestInfo();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    try {
      if (!(await allowed(supabaseAdmin, data.email, ip))) return GENERIC;
      // Auto-approved account; no built-in auth email is sent by the admin API.
      const created = await supabaseAdmin.auth.admin.createUser({ email: data.email, password: data.password, email_confirm: true });
      if (created.error) return GENERIC;
      const link = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email: data.email });
      const hash = link.data?.properties?.hashed_token;
      if (link.error || !hash) return GENERIC;
      await hublAction("render_and_send_email", { template_name: "studylamb_auth_signup", to: data.email, variables: { action_url: linkFor(origin, hash, "magiclink") } });
    } catch {
      console.error("studylamb signup mail failed");
    }
    return GENERIC;
  });

export const studyPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((d) => Email.parse(d))
  .handler(async ({ data }) => {
    const { ip, origin } = requestInfo();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    try {
      if (!(await allowed(supabaseAdmin, data.email, ip))) return GENERIC;
      const link = await supabaseAdmin.auth.admin.generateLink({ type: "recovery", email: data.email });
      const hash = link.data?.properties?.hashed_token;
      if (link.error || !hash) return GENERIC;
      await hublAction("render_and_send_email", { template_name: "studylamb_auth_recovery", to: data.email, variables: { action_url: linkFor(origin, hash, "recovery") } });
    } catch {
      console.error("studylamb reset mail failed");
    }
    return GENERIC;
  });

export const buyBrainBucks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ packId: z.string(), paymentToken: z.string().min(8).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    if (!CHECKOUT_ENABLED) throw new Error("Purchases aren't available yet. No payment was taken.");
    const pack = GEM_PACKS.find((p) => p.id === data.packId);
    if (!pack) throw new Error("That pack isn't available.");
    const orderId = crypto.randomUUID();
    const res = await hublAction<{ ok?: boolean; status?: string; transaction_id?: string }>("charge_card", {
      amount_cents: Math.round(pack.priceUsd * 100),
      payment_token: data.paymentToken,
      source_app: "storefront",
      source_ref_id: `studylamb-${orderId}`,
      source_ref_type: "studylamb_brainbucks",
      customer_email: context.claims.email,
    });
    if (!chargeSucceeded(res)) throw new Error("Not yet. The card didn't go through, and no BrainBucks were used.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("credit_gems", {
      _user: context.userId, _amount: pack.gems, _reason: `Bought ${pack.gems} BrainBucks`, _ref: `hublpay:${res.transaction_id}`,
    });
    if (error) throw new Error("Payment went through but BrainBucks are delayed. We'll add them shortly.");
    return { ok: true, gems: pack.gems };
  });
