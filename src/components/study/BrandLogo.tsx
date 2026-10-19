import lamby from "@/assets/professor-lamby.png.asset.json";

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return <img src={lamby.url} alt="Professor Lamby, the StudyLamb mascot" width={768} height={768} className={compact ? "lamby-logo lamby-logo-compact" : "lamby-logo"} />;
}

export function StudySplash() {
  return (
    <div className="study-splash" role="status" aria-label="Loading StudyLamb">
      <BrandLogo />
      <h1 className="page-title">StudyLamb</h1>
    </div>
  );
}