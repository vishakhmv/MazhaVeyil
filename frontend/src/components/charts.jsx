import React, { useId } from 'react';
import { num, inr } from '../lib/format.js';

const SUN = '#f7b32b';
const RAIN = '#2386c4';
const NAVY = '#12213d';
const TRACK = '#dce6f4';
const CLIFF = '#e5484d';
const LEAF = '#23a26b';

// ---- Roof Score: two rings, the sun half (power cover) outside and the rain half (water cover) inside ----
function Arc({ r, stroke, value, color }) {
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <>
      <circle cx="100" cy="100" r={r} fill="none" stroke={TRACK} strokeWidth={stroke} />
      <circle
        cx="100" cy="100" r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} transform="rotate(-90 100 100)"
        style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(.2,.8,.2,1)' }}
      />
    </>
  );
}

export function ScoreRings({ power, water, score, bandLabel, size = 220, scoreLabel }) {
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label={`${scoreLabel}: ${score}. ${power}, ${water}`} className="max-w-full h-auto">
      <Arc r={88} stroke={15} value={power} color={SUN} />
      <Arc r={67} stroke={15} value={water} color={RAIN} />
      <text x="100" y="104" textAnchor="middle" fontSize="50" fontWeight="800" fill={NAVY}>{score}</text>
      <text x="100" y="124" textAnchor="middle" fontSize="12" fontWeight="700" fill="#5f84bb" letterSpacing="1.2">{(bandLabel || '').toUpperCase()}</text>
    </svg>
  );
}

// ---- Two bars per month: bill before and after solar ----
export function MonthBars({ a, b, labels, aLabel, bLabel, aColor = '#b9cce8', bColor = LEAF, money = true }) {
  const W = 640, H = 240, L = 44, R = 8, T = 14, B = 30;
  const max = Math.max(1, ...a, ...(b || [0]));
  const nice = niceMax(max);
  const gw = (W - L - R) / 12;
  const y = (v) => T + (H - T - B) * (1 - v / nice);
  const fmt = (v) => (money ? inr(v) : num(v));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`${aLabel} / ${bLabel}`}>
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <g key={f}>
          <line x1={L} x2={W - R} y1={y(nice * f)} y2={y(nice * f)} stroke="#e6edf7" />
          <text x={L - 6} y={y(nice * f) + 4} textAnchor="end" fontSize="11" fill="#6b7a99">{shortNum(nice * f, money)}</text>
        </g>
      ))}
      {a.map((v, i) => {
        const x0 = L + i * gw + gw * 0.14;
        const bw = (gw * 0.72) / (b ? 2 : 1);
        return (
          <g key={i}>
            <rect x={x0} y={y(v)} width={bw} height={Math.max(0, H - B - y(v))} rx="3" fill={aColor}><title>{labels[i]}: {aLabel} {fmt(v)}</title></rect>
            {b && <rect x={x0 + bw + 1} y={y(b[i])} width={bw} height={Math.max(0, H - B - y(b[i]))} rx="3" fill={bColor}><title>{labels[i]}: {bLabel} {fmt(b[i])}</title></rect>}
            <text x={L + i * gw + gw / 2} y={H - 10} textAnchor="middle" fontSize="11" fill="#6b7a99">{labels[i]}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function SingleBars({ values, labels, color = RAIN, unitLabel, highlight }) {
  const W = 640, H = 200, L = 44, R = 8, T = 12, B = 28;
  const nice = niceMax(Math.max(1, ...values));
  const gw = (W - L - R) / values.length;
  const y = (v) => T + (H - T - B) * (1 - v / nice);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={unitLabel}>
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={L} x2={W - R} y1={y(nice * f)} y2={y(nice * f)} stroke="#e6edf7" />
          <text x={L - 6} y={y(nice * f) + 4} textAnchor="end" fontSize="11" fill="#6b7a99">{shortNum(nice * f, false)}</text>
        </g>
      ))}
      {values.map((v, i) => (
        <g key={i}>
          <rect x={L + i * gw + gw * 0.15} y={y(v)} width={gw * 0.7} height={Math.max(0, H - B - y(v))} rx="3" fill={highlight?.includes(i) ? SUN : color}>
            <title>{labels[i]}: {num(v)} {unitLabel}</title>
          </rect>
          <text x={L + i * gw + gw / 2} y={H - 9} textAnchor="middle" fontSize="11" fill="#6b7a99">{labels[i]}</text>
        </g>
      ))}
    </svg>
  );
}

function niceMax(v) {
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p;
  return v;
}
function shortNum(v, money) {
  const s = v >= 1e5 ? (v / 1e5).toFixed(v % 1e5 ? 1 : 0) + 'L' : v >= 1e3 ? (v / 1e3).toFixed(v % 1e3 ? 1 : 0) + 'k' : String(Math.round(v));
  return (money ? '₹' : '') + s;
}

// ---- KSEB bill cliffs: the monthly energy charge against units, with every cliff marked ----
export function CliffChart({ curve, cliffs, monthly, monthlyAfter, labels }) {
  const id = useId().replace(/:/g, '');
  const W = 680, H = 320, L = 58, R = 16, T = 18, B = 38;
  const maxU = curve[curve.length - 1].units;
  const maxE = niceMax(curve[curve.length - 1].energy * 1.02);
  const x = (u) => L + ((W - L - R) * u) / maxU;
  const y = (e) => T + (H - T - B) * (1 - e / maxE);
  // draw the curve with a break at each cliff so the jump reads as a vertical step
  const d = curve.map((p, i) => `${i ? 'L' : 'M'}${x(p.units).toFixed(1)},${y(p.energy).toFixed(1)}`).join(' ');
  const area = d + ` L${x(maxU)},${y(0)} L${x(0)},${y(0)} Z`;
  const energyAt = (u) => curve[Math.max(0, Math.min(curve.length - 1, Math.round(u)))].energy;
  const mark = (u, color, label, dy) => {
    if (u === null || u === undefined) return null;
    const e = energyAt(u);
    return (
      <g>
        <line x1={x(u)} x2={x(u)} y1={y(e)} y2={y(0)} stroke={color} strokeDasharray="3 3" />
        <circle cx={x(u)} cy={y(e)} r="6" fill="#fff" stroke={color} strokeWidth="3" />
        <text x={x(u)} y={y(e) + dy} textAnchor={x(u) > W - 120 ? 'end' : 'start'} dx={x(u) > W - 120 ? -10 : 10} fontSize="12" fontWeight="700" fill={color}>{label}</text>
      </g>
    );
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={labels.aria}>
      <defs>
        <linearGradient id={'g' + id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={RAIN} stopOpacity="0.28" />
          <stop offset="1" stopColor={RAIN} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <g key={f}>
          <line x1={L} x2={W - R} y1={y(maxE * f)} y2={y(maxE * f)} stroke="#e6edf7" />
          <text x={L - 8} y={y(maxE * f) + 4} textAnchor="end" fontSize="11" fill="#6b7a99">{shortNum(maxE * f, true)}</text>
        </g>
      ))}
      {[0, 100, 200, 300, 400, 500, 600].filter((u) => u <= maxU).map((u) => (
        <text key={u} x={x(u)} y={H - 16} textAnchor="middle" fontSize="11" fill="#6b7a99">{u}</text>
      ))}
      <text x={(L + W - R) / 2} y={H - 2} textAnchor="middle" fontSize="11" fill="#6b7a99">{labels.axis}</text>
      <path d={area} fill={`url(#g${id})`} />
      {cliffs.map((c) => (
        <g key={c.at}>
          <line x1={x(c.at)} x2={x(c.at)} y1={T} y2={y(0)} stroke={CLIFF} strokeOpacity="0.55" strokeDasharray="4 4" />
          <text x={x(c.at)} y={T + 10} textAnchor="middle" fontSize="11" fontWeight="700" fill={CLIFF}>{c.at}</text>
          <text x={x(c.at) + 4} y={y(energyAt(c.at)) + 18} fontSize="11" fontWeight="800" fill={CLIFF}>+{inr(c.jump)}</text>
        </g>
      ))}
      <path d={d} fill="none" stroke={RAIN} strokeWidth="3" strokeLinejoin="round" />
      {mark(monthlyAfter, LEAF, labels.after, -14)}
      {mark(monthly, NAVY, labels.now, -14)}
    </svg>
  );
}

// ---- One sunny day: the sun curve, the 6-10 pm peak, and each appliance at its usual time and its best time ----
export function DayChart({ sun, plan, peak, solarWindow, labels, appliances }) {
  const W = 720, L = 128, R = 12, T = 22, curveH = 170;
  const rowH = 30;
  const H = T + curveH + 34 + plan.length * rowH + 28;
  const maxKw = Math.max(0.5, ...sun) * 1.15;
  const x = (h) => L + ((W - L - R) * h) / 24;
  const y = (kw) => T + curveH * (1 - kw / maxKw);
  const pts = sun.map((kw, h) => [x(h + 0.5), y(kw)]);
  const path = ['M' + x(0) + ',' + y(0), ...pts.map(([px, py]) => `L${px.toFixed(1)},${py.toFixed(1)}`), `L${x(24)},${y(0)}`].join(' ');
  const hm = (s) => Number(s.slice(0, 2)) + Number(s.slice(3, 5)) / 60;
  const [p0, p1] = peak.map(hm);
  const [w0, w1] = solarWindow.map(hm);
  const base = T + curveH;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={labels.aria}>
      <rect x={x(w0)} y={T} width={x(w1) - x(w0)} height={curveH} fill={SUN} fillOpacity="0.08" />
      <rect x={x(p0)} y={T} width={x(p1) - x(p0)} height={curveH + 34 + plan.length * rowH} fill={CLIFF} fillOpacity="0.07" />
      <text x={(x(p0) + x(p1)) / 2} y={T + 12} textAnchor="middle" fontSize="11" fontWeight="700" fill={CLIFF}>{labels.peak}</text>
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={L} x2={W - R} y1={y(maxKw * f)} y2={y(maxKw * f)} stroke="#e6edf7" />
          <text x={L - 6} y={y(maxKw * f) + 4} textAnchor="end" fontSize="11" fill="#6b7a99">{(maxKw * f).toFixed(1)}</text>
        </g>
      ))}
      <text x="4" y={T - 8} fontSize="11" fill="#6b7a99">kW</text>
      <path d={path} fill={SUN} fillOpacity="0.35" stroke={SUN} strokeWidth="2.5" strokeLinejoin="round" />
      {[0, 3, 6, 9, 12, 15, 18, 21, 24].map((h) => (
        <text key={h} x={x(h)} y={base + 16} textAnchor="middle" fontSize="11" fill="#6b7a99">{String(h % 24).padStart(2, '0')}</text>
      ))}
      {plan.map((p, i) => {
        const yy = base + 34 + i * rowH;
        const dur = Math.max(0.5, p.minutes / 60);
        const u0 = hm(p.usual_start);
        const b0 = hm(p.start);
        return (
          <g key={p.appliance}>
            <text x={L - 10} y={yy + 14} textAnchor="end" fontSize="12" fontWeight="700" fill={NAVY}>{appliances[p.appliance] || p.appliance}</text>
            <rect x={x(u0)} y={yy} width={Math.max(8, x(u0 + dur) - x(u0))} height="20" rx="6" fill="#fff" stroke={CLIFF} strokeDasharray="4 3" />
            <rect x={x(b0)} y={yy} width={Math.max(8, x(b0 + dur) - x(b0))} height="20" rx="6" fill={LEAF} />
            <text x={x(b0) + Math.max(8, x(b0 + dur) - x(b0)) + 6} y={yy + 14} fontSize="12" fontWeight="800" fill="#1b8556">{p.start}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ---- A rain tank that fills to the share of days it covers ----
export function TankGauge({ pct, litres, label }) {
  const id = useId().replace(/:/g, '');
  const level = Math.max(4, Math.min(100, pct));
  const top = 14 + (112 * (100 - level)) / 100;
  // one wide wave, 60 units per period: sliding it by exactly 60 loops without a seam
  const wave = (yy) => 'M-60,' + yy + ' ' + 'q15,-8 30,0 t30,0 '.repeat(5) + 'V140 H-60 Z';
  return (
    <svg viewBox="0 0 120 150" className="w-28 h-auto" role="img" aria-label={`${label}: ${litres} L, ${Math.round(pct)}%`}>
      <defs>
        <clipPath id={'c' + id}><rect x="14" y="14" width="92" height="112" rx="14" /></clipPath>
        <linearGradient id={'w' + id} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#3fa1db" /><stop offset="1" stopColor="#1a6ba2" /></linearGradient>
      </defs>
      <rect x="14" y="14" width="92" height="112" rx="14" fill="#eaf6fd" stroke="#a6d8f4" strokeWidth="3" />
      <g clipPath={`url(#c${id})`}>
        <path className="mv-wave" d={wave(top)} fill={`url(#w${id})`} />
      </g>
      <text x="60" y="78" textAnchor="middle" fontSize="22" fontWeight="800" fill={level > 55 ? '#fff' : '#175485'}>{Math.round(pct)}%</text>
      <rect x="40" y="6" width="40" height="10" rx="5" fill="#a6d8f4" />
    </svg>
  );
}
