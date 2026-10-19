import { useEffect, useRef } from "react";

export type Stroke = [number, number][];

export function DrawLayer({
  strokes,
  active,
  onCommit,
}: {
  strokes: Stroke[];
  active: boolean;
  onCommit: (s: Stroke[]) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const cur = useRef<Stroke>([]);
  const all = useRef(strokes);
  all.current = strokes;

  const paint = () => {
    const c = ref.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.round(c.clientWidth * dpr),
      h = Math.round(c.clientHeight * dpr);
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }
    const pen = c.getContext("2d")!;
    pen.clearRect(0, 0, w, h);
    pen.strokeStyle = getComputedStyle(c).color;
    pen.lineWidth = 3 * dpr;
    pen.lineCap = "round";
    pen.lineJoin = "round";
    for (const s of [...all.current, cur.current]) {
      if (!s.length) continue;
      pen.beginPath();
      pen.moveTo(s[0][0] * w, s[0][1] * h);
      for (const p of s.slice(1)) pen.lineTo(p[0] * w, p[1] * h);
      if (s.length === 1) pen.lineTo(s[0][0] * w + 1, s[0][1] * h + 1);
      pen.stroke();
    }
  };

  useEffect(() => {
    paint();
    const c = ref.current!;
    const ro = new ResizeObserver(paint);
    ro.observe(c);
    return () => ro.disconnect();
  });

  const pt = (e: React.PointerEvent): [number, number] => {
    const r = ref.current!.getBoundingClientRect();
    return [
      Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
      Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
    ];
  };
  const end = () => {
    if (!cur.current.length) return;
    const next = [...all.current, cur.current];
    cur.current = [];
    onCommit(next);
  };

  return (
    <canvas
      ref={ref}
      className="draw-layer"
      data-active={active}
      aria-label="Draw directly on this card"
      onPointerDown={(e) => {
        if (!active) return;
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        cur.current = [pt(e)];
        paint();
      }}
      onPointerMove={(e) => {
        if (!active || !cur.current.length) return;
        cur.current.push(pt(e));
        paint();
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onClick={(e) => active && e.stopPropagation()}
    />
  );
}
