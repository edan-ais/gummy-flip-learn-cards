import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Layers, Headphones, Brain } from "lucide-react";
import { BrandLogo } from "@/components/study/BrandLogo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StudyLamb · Flashcards, podcasts and practice exams" },
      { name: "description", content: "Upload your class notes and get flashcards, memory drills, podcasts and practice exams that adapt to you." },
      { property: "og:title", content: "StudyLamb" },
      { property: "og:description", content: "Turn class notes into flashcards, podcasts and practice exams that adapt to you." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const nav = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) return nav({ to: "/courses", replace: true });
      // First open: new visitors meet Professor Lamby before the landing page.
      let onboarded: string | null = null;
      try {
        onboarded = localStorage.getItem("studylamb-onboarded");
      } catch {
        // private browsing - treat as first open
      }
      if (!onboarded) nav({ to: "/onboarding", replace: true });
    });
  }, []);
  return (
    <main className="page flex min-h-dvh flex-col justify-center">
      <div className="animate-pop"><BrandLogo /></div>
      <h1 className="page-title mt-6 animate-rise">StudyLamb</h1>
      <p className="mt-2 text-muted-foreground">Meet Professor Lamby.</p>
      <p className="mt-3 text-muted-foreground animate-rise">
        Upload your notes. Get flashcards, memory drills, podcasts and practice exams that bring back what you're
        still learning.
      </p>
      <div className="mt-8 grid grid-cols-3 gap-3">
        {[
          [Layers, "Cards"],
          [Brain, "Memorize"],
          [Headphones, "Listen"],
        ].map(([I, l], i) => {
          const Icon = I as typeof Layers;
          return (
            <div key={l as string} className="gummy-card flex flex-col items-center gap-2 p-4 animate-rise" style={{ animationDelay: `${i * 60}ms` }}>
              <Icon className="text-primary" />
              <span className="text-sm font-extrabold">{l as string}</span>
            </div>
          );
        })}
      </div>
      <Link to="/auth" className="gummy-btn mt-8 w-full" data-variant="primary">
        Get started
      </Link>
    </main>
  );
}
