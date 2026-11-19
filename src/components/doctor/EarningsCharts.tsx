import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Stop } from 'react-native-svg';

export type TrendPoint = { label: string; fullLabel: string; value: number };

const ORANGE = '#F97316';
const compact = (v: number) => (v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v)));

type Pt = { x: number; y: number };

/**
 * Smooth line through the points: a monotone cubic curve (Fritsch-Carlson), the same shape as the web's recharts `type="monotone"`.
 * Unlike a plain spline it never overshoots, so a quiet day can't dip below the zero line.
 */
const smoothPath = (pts: Pt[]) => {
  const n = pts.length;
  if (!n) return '';
  const f = (v: number) => v.toFixed(1);
  if (n === 1) return `M${f(pts[0].x)},${f(pts[0].y)}`;
  const dx: number[] = [], m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1].x - pts[i].x;
    m[i] = (pts[i + 1].y - pts[i].y) / (dx[i] || 1);
  }
  const t: number[] = new Array(n);
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i] / m[i], b = t[i + 1] / m[i], h = a * a + b * b;
    if (h > 9) { const k = 3 / Math.sqrt(h); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
  }
  let d = `M${f(pts[0].x)},${f(pts[0].y)}`;
  for (let i = 0; i < n - 1; i++) {
    const w = dx[i] / 3;
    d += ` C${f(pts[i].x + w)},${f(pts[i].y + t[i] * w)} ${f(pts[i + 1].x - w)},${f(pts[i + 1].y - t[i + 1] * w)} ${f(pts[i + 1].x)},${f(pts[i + 1].y)}`;
  }
  return d;
};

/** Round the chart's top value up to a "nice" number so the axis reads 0 / 25% / 50% / 75% / 100% cleanly. */
const niceMax = (max: number) => {
  if (max <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(max));
  const f = max / pow;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * pow;
};

/**
 * The web's orange area chart. Tap or drag across it to read a day; the readout above the chart plays the role of the web tooltip.
 * `money` formats the readout as rupees, otherwise it reads "N appointment(s)".
 */
export function TrendChart({ data, money, height = 150 }: { data: TrendPoint[]; money: boolean; height?: number }) {
  const [w, setW] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const padL = 34, padR = 8, padT = 8, padB = 22;
  const innerW = Math.max(0, w - padL - padR), innerH = height - padT - padB;
  const top = niceMax(Math.max(0, ...data.map((d) => d.value)));

  const pts = useMemo(
    () => data.map((d, i) => ({ x: padL + (data.length > 1 ? (i / (data.length - 1)) * innerW : innerW / 2), y: padT + innerH - (d.value / top) * innerH })),
    [data, innerW, innerH, top],
  );
  const line = useMemo(() => smoothPath(pts), [pts]);
  const area = pts.length ? `${line} L${pts[pts.length - 1].x.toFixed(1)},${padT + innerH} L${pts[0].x.toFixed(1)},${padT + innerH} Z` : '';

  const pick = (x: number) => {
    if (!pts.length) return;
    let best = 0;
    pts.forEach((p, i) => { if (Math.abs(p.x - x) < Math.abs(pts[best].x - x)) best = i; });
    setSel(best);
  };
  const shown = sel != null ? data[Math.min(sel, data.length - 1)] : null;
  const ticks = [0, 0.5, 1];
  // x labels: first, last and a few in between, never crowded
  const step = Math.max(1, Math.ceil(data.length / 5));
  const showLabel = (i: number) => i === 0 || i === data.length - 1 || (i % step === 0 && data.length - 1 - i >= step * 0.6);

  return (
    <View>
      <View className="h-7 justify-center">
        {shown ? (
          <View className="self-start flex-row items-center gap-1.5 rounded-lg bg-orange-50 px-2.5 py-1">
            <Text className="text-[13px] font-bold text-slate-800">{money ? `₹${shown.value.toLocaleString('en-IN')}` : `${shown.value} appointment${shown.value === 1 ? '' : 's'}`}</Text>
            <Text className="text-[11px] text-slate-500">· {shown.fullLabel}</Text>
          </View>
        ) : <Text className="text-[11px] text-slate-400">Tap the chart to see a day</Text>}
      </View>
      <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} style={{ height }}>
        {w > 0 && (
          <Pressable onPressIn={(e) => pick(e.nativeEvent.locationX)} onTouchMove={(e) => pick(e.nativeEvent.locationX)} accessibilityLabel="Earnings trend chart" style={{ height }}>
            <Svg width={w} height={height} pointerEvents="none">
              <Defs>
                <LinearGradient id="earnFill" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={ORANGE} stopOpacity="0.4" />
                  <Stop offset="1" stopColor={ORANGE} stopOpacity="0.02" />
                </LinearGradient>
              </Defs>
              {ticks.map((t) => {
                const y = padT + innerH - t * innerH;
                return (
                  <G key={t}>
                    <Line x1={padL} x2={w - padR} y1={y} y2={y} stroke="#F3F3F3" strokeWidth={1} />
                  </G>
                );
              })}
              {!!area && <Path d={area} fill="url(#earnFill)" />}
              {!!line && <Path d={line} stroke={ORANGE} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />}
              {pts.map((p, i) => (data.length <= 14 || sel === i) && <Circle key={i} cx={p.x} cy={p.y} r={sel === i ? 5 : 2.6} fill={ORANGE} stroke="#fff" strokeWidth={sel === i ? 2 : 1} />)}
              {sel != null && pts[sel] && <Line x1={pts[sel].x} x2={pts[sel].x} y1={padT} y2={padT + innerH} stroke={ORANGE} strokeDasharray="4 4" strokeWidth={1} />}
            </Svg>
            {/* axis labels as Text so they follow the app font and font scaling */}
            {ticks.map((t) => (
              <Text key={`y${t}`} pointerEvents="none" className="absolute text-[10px] text-slate-500" style={{ left: 0, width: padL - 6, textAlign: 'right', top: padT + innerH - t * innerH - 7 }}>{compact(top * t)}</Text>
            ))}
            {data.map((d, i) => showLabel(i) && (
              <Text key={`x${i}`} numberOfLines={1} pointerEvents="none" className="absolute text-[10px] text-slate-500" style={{ top: height - padB + 6, left: Math.min(Math.max(pts[i]?.x - 22, 0), w - 44), width: 44, textAlign: 'center' }}>{d.label}</Text>
            ))}
          </Pressable>
        )}
      </View>
    </View>
  );
}

/** Ring chart with the total in the middle (the web's pie with an inner radius). */
export function Donut({ slices, colors, size = 124, thickness = 18, children }: {
  slices: { value: number }[]; colors: string[]; size?: number; thickness?: number; children?: React.ReactNode;
}) {
  const r = (size - thickness) / 2, c = 2 * Math.PI * r, cx = size / 2;
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  let acc = 0;
  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${cx}, ${cx}`}>
          <Circle cx={cx} cy={cx} r={r} stroke="#FFF1E3" strokeWidth={thickness} fill="none" />
          {slices.map((s, i) => {
            const len = (s.value / total) * c;
            const gap = slices.length > 1 ? 3 : 0;
            const el = (
              <Circle key={i} cx={cx} cy={cx} r={r} stroke={colors[i % colors.length]} strokeWidth={thickness} fill="none"
                strokeDasharray={`${Math.max(0, len - gap)} ${c}`} strokeDashoffset={-acc} />
            );
            acc += len;
            return el;
          })}
        </G>
      </Svg>
      <View className="absolute items-center justify-center" style={{ width: size - thickness * 2 - 8 }}>{children}</View>
    </View>
  );
}