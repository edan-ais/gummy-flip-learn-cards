import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/study/BrandLogo";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Search = { redirect?: string };
const safe = (r?: string) => (r && r.startsWith("/") && !r.startsWith("//") ? r : "/courses");

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): Search => ({ redirect: typeof s.redirect === "string" ? s.redirect : undefined }),
  head: () => ({
    meta: [
      { title: "Sign in · StudyLamb" },
      { name: "description", content: "Sign in to your classes, exams and study progress." },
      { property: "og:title", content: "Sign in · StudyLamb" },
      { property: "og:description", content: "Sign in to your classes, exams and study progress." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Auth,
});

function Auth() {
  const { redirect } = Route.useSearch();
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => data.session && nav({ to: safe(redirect), replace: true }));
    const { data } = supabase.auth.onAuthStateChange((e) => {
      if (e === "SIGNED_IN") nav({ to: safe(redirect), replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (mode === "up") await studySignUp({ data: { email, password: pw } }).catch(() => null);
    const r = await supabase.auth.signInWithPassword({ email, password: pw });
    setBusy(false);
    if (r.error) return toast.error(mode === "up" ? "Not yet. Check your email, or try signing in." : r.error.message);
  };

  const forgot = async () => {
    if (!email) return toast("Type your email first, then tap Forgot password.");
    const r = await studyPasswordReset({ data: { email } }).catch(() => null);
    toast(r?.message ?? "If that email can use StudyLamb, a message is on its way.");
  };

  return (
    <main className="page auth-page flex min-h-dvh flex-col justify-center">
      <div className="mb-8 text-center animate-rise">
        <div className="flex justify-center"><BrandLogo /></div>
        <h1 className="page-title mt-4">StudyLamb</h1>
        <p className="mt-2 text-muted-foreground">Recall it. Draw it. Hear it.</p>
      </div>
      {(
        <div className="gummy-card space-y-3 animate-pop">
          <form onSubmit={submit} className="space-y-3">
            <input className="gummy-input" type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            <input className="gummy-input" type="password" required minLength={6} placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete={mode === "in" ? "current-password" : "new-password"} />
            <Button type="submit" className="gummy-btn w-full" data-variant="primary" disabled={busy}>
              {mode === "in" ? "Sign in" : "Create account"}
            </Button>
          </form>
          <Button variant="link" type="button" className="w-full text-center text-sm font-bold text-primary" onClick={() => setMode(mode === "in" ? "up" : "in")}>
            {mode === "in" ? "New here? Create an account" : "Have an account? Sign in"}
          </Button>
        </div>
      )}
      <p className="mt-8 text-center text-xs font-bold text-muted-foreground">Powered by waiwiser</p>
    </main>
  );
}
