"use client";

// Single-series trend sparkline for the pre-visit report.
// Design per dataviz skill: 2px line, selective direct labels (first + last),
// 8px endpoint marker, muted reference band for the normal range, per-point
// native hover tooltips, no legend (the row title names the series).

interface Point {
  ts: string;
  v: number;
  flagged?: boolean;
  label?: string; // tooltip detail, e.g. "104/60"
}

export default function Sparkline({
  points,
  band,
  width = 236,
  height = 56,
  unit = "",
}: {
  points: Point[];
  band?: { lo: number; hi: number; label: string };
  width?: number;
  height?: number;
  unit?: string;
}) {
  if (points.length < 2) return <p className="text-xs text-muted">Not enough data</p>;

  const PAD_L = 30;
  const PAD_R = 44;
  const PAD_Y = 10;
  const xs = points.map((p) => new Date(p.ts).getTime());
  const vs = points.map((p) => p.v);
  // scale to the data plus the band's LOW edge (the clinically loaded side);
  // a far-away band top must not squash the series
  const lo = Math.min(...vs, band ? band.lo : Infinity);
  const hi = Math.max(...vs);
  const spanV = hi - lo || 1;
  const spanX = xs[xs.length - 1] - xs[0] || 1;
  const X = (t: number) => PAD_L + ((t - xs[0]) / spanX) * (width - PAD_L - PAD_R);
  const Y = (v: number) => PAD_Y + (1 - (v - lo) / spanV) * (height - 2 * PAD_Y);
  const yClamped = (v: number) => Math.max(PAD_Y, Math.min(height - PAD_Y, Y(v)));

  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${X(new Date(p.ts).getTime()).toFixed(1)},${Y(p.v).toFixed(1)}`).join(" ");
  const first = points[0];
  const last = points[points.length - 1];

  return (
    <svg width={width} height={height} role="img" aria-label={`Trend from ${first.v} to ${last.v} ${unit}`}>
      {band && (
        <rect
          x={PAD_L}
          y={yClamped(band.hi)}
          width={width - PAD_L - PAD_R}
          height={Math.max(0, yClamped(band.lo) - yClamped(band.hi))}
          fill="var(--teal-soft)"
          opacity={0.55}
        >
          <title>{band.label}</title>
        </rect>
      )}
      <path d={d} fill="none" stroke="var(--chart)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => {
        const cx = X(new Date(p.ts).getTime());
        const cy = Y(p.v);
        const isLast = i === points.length - 1;
        if (p.flagged)
          return (
            <circle key={i} cx={cx} cy={cy} r={4} fill="var(--urgent)" stroke="#fff" strokeWidth={2}>
              <title>{`${new Date(p.ts).toLocaleDateString()} — ${p.label ?? p.v + unit} (alert)`}</title>
            </circle>
          );
        if (isLast)
          return (
            <circle key={i} cx={cx} cy={cy} r={4} fill="var(--chart)" stroke="#fff" strokeWidth={2}>
              <title>{`${new Date(p.ts).toLocaleDateString()} — ${p.label ?? p.v + unit}`}</title>
            </circle>
          );
        return (
          <circle key={i} cx={cx} cy={cy} r={5} fill="transparent">
            <title>{`${new Date(p.ts).toLocaleDateString()} — ${p.label ?? p.v + unit}`}</title>
          </circle>
        );
      })}
      {/* selective direct labels: first + last only */}
      <text x={PAD_L - 4} y={Y(first.v) + 3.5} textAnchor="end" fontSize={10} fill="var(--muted)">
        {first.v}
      </text>
      <text x={X(new Date(last.ts).getTime()) + 7} y={Y(last.v) + 3.5} fontSize={11} fontWeight={700} fill="var(--ink)">
        {last.v}
      </text>
    </svg>
  );
}
