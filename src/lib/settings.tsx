import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Settings = {
  spaced: boolean;
  readAloud: boolean;
  flashcardAudio: boolean;
  dyslexia: boolean;
  adhd: boolean;
  timers: boolean;
  font: "rounded" | "lexend";
  fontScale: number;
  letterSpacing: number;
  lineHeight: number;
  speechRate: number;
  dailyGoal: number;
  chunkSize: number;
};

export const DEFAULTS: Settings = {
  spaced: true,
  readAloud: true,
  flashcardAudio: false,
  dyslexia: false,
  adhd: false,
  timers: false,
  font: "lexend",
  fontScale: 1,
  letterSpacing: 0,
  lineHeight: 1.6,
  speechRate: 1,
  dailyGoal: 20,
  chunkSize: 5,
};

type Ctx = { s: Settings; set: (p: Partial<Settings>) => void; ready: boolean };
const SettingsCtx = createContext<Ctx>({ s: DEFAULTS, set: () => {}, ready: false });
export const useSettings = () => useContext(SettingsCtx);

export function applySettings(s: Settings) {
  const r = document.documentElement;
  r.style.setProperty("--font-scale", String(s.fontScale));
  r.style.setProperty("--ls", `${s.letterSpacing}em`);
  r.style.setProperty("--lh", String(s.lineHeight));
  r.dataset.font = s.dyslexia && s.font === "rounded" ? "lexend" : s.font;
  r.dataset.dyslexia = String(s.dyslexia);
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [ready, setReady] = useState(false);
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    const load = async (id: string | null) => {
      setUid(id);
      if (!id) return setReady(true);
      const { data } = await supabase.from("profiles").select("settings").eq("id", id).maybeSingle();
      setS({ ...DEFAULTS, ...((data?.settings as Partial<Settings>) ?? {}), readAloud: true, font: "lexend" });
      setReady(true);
    };
    supabase.auth.getSession().then(({ data }) => load(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((e, session) => {
      if (e === "SIGNED_IN" || e === "SIGNED_OUT") load(session?.user.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => applySettings(s), [s]);

  const set = (p: Partial<Settings>) => {
    setS((prev) => {
      const next = { ...prev, ...p };
      if (uid) supabase.from("profiles").upsert({ id: uid, settings: next }).then();
      return next;
    });
  };
  return <SettingsCtx.Provider value={{ s, set, ready }}>{children}</SettingsCtx.Provider>;
}
