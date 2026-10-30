import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/study/BrandLogo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Search = { token_hash?: string; type?: string };

export const Route = createFileRoute("/auth_/confirm")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    token_hash: typeof s.token_hash === "string" ? s.token_hash : undefined,
    type: typeof s.type === "string" ? s.type : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Finish signing in · StudyLamb" },
      { name: "description", content: "Open your StudyLamb sign-in or password reset link." },
      { property: "og:title", content: "Finish signing in · StudyLamb" },
      { property: "og:description", content: "Open your StudyLamb sign-in or password reset link." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Confirm,
});

function Confirm() {
  const { token_hash, type } = Route.useSearch();
  const nav = useNavigate();
  const [state, setState] = useState<"checking" | "reset" | "bad">("checking");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token_hash || (type !== "recovery" && type !== "magiclink")) return setState("bad");
    supabase.auth.verifyOtp({ token_hash, type }).then(({ error }) => {
      if (error) return setState("bad");
      if (type === "recovery") setState("reset");
      else nav({ to: "/courses", replace: true });
    });
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return toast.error("Not yet. Try a different password.");
    toast.success("New password saved.");
    nav({ to: "/courses", replace: true });
  };

  return (
    <main className="page auth-page flex min-h-dvh flex-col justify-center">
      <div className="mb-8 text-center"><div className="flex justify-center"><BrandLogo /></div><h1 className="page-title mt-4">StudyLamb</h1></div>
      <div className="gummy-card space-y-3">
        {state === "checking" && <p>Checking your link…</p>}
        {state === "bad" && <p>This link has expired. Go back to sign in and ask for a new one.</p>}
        {state === "reset" && (
          <form onSubmit={save} className="space-y-3">
            <p className="font-bold">Pick a new password</p>
            <input className="gummy-input" type="password" required minLength={6} placeholder="New password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
            <Button type="submit" className="gummy-btn w-full" data-variant="primary" disabled={busy}>Save password</Button>
          </form>
        )}
      </div>
    </main>
  );
}
