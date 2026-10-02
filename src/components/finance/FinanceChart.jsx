import React from 'react';

// Lightweight dependency-free chart: one bar per ledger entry (green = money
// IN, red = money OUT), with the running balance drawn as a line above them.
// Built in plain SVG since this project has no charting library installed.
//
// Rows are grouped by case before plotting — mirroring the Excel sheet where
// each matter/LG Ref is its own block with its own balance column that
// starts at zero — so the balance line is broken between cases instead of
// drawing one continuous (and misleading) line across unrelated matters.
export default function FinanceChart({ rows, caseIdFor }) {
  if (!rows || rows.length === 0) {
    return <div style={{ color: 'var(--text-muted)', fontSize: 12.5, padding: '30px 0', textAlign: 'center' }}>No payments recorded yet — add one below to see the chart.</div>;
  }

  // Group in case order (each case's own rows stay together and in date order),
  // with un-cased ("general") rows in their own trailing group.
  const groups = [];
  const byCase = new Map();
  for (const r of rows) {
    const key = r.caseId || '__general__';
    if (!byCase.has(key)) { byCase.set(key, []); groups.push(key); }
    byCase.get(key).push(r);
  }
  const ordered = groups.flatMap(key => byCase.get(key).slice().sort((a, b) => (a.date || '').localeCompare(b.date || '')));

  const W = 640, H = 200, padL = 44, padR = 12, padT = 14, padB = 28;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const maxAmount = Math.max(1, ...ordered.map(r => Number(r.amount)));
  const maxBalance = Math.max(1, ...ordered.map(r => Math.abs(r.balance)));
  const scale = Math.max(maxAmount, maxBalance);

  const n = ordered.length;
  const slot = plotW / n;
  const barW = Math.min(28, slot * 0.55);

  const yFor = (v) => padT + plotH - (v / scale) * plotH;
  const xFor = (i) => padL + slot * i + slot / 2;

  // Break the balance line into one polyline per case group, so it never
  // draws a diagonal between two different matters' balances.
  let cursor = 0;
  const segments = groups.map(key => {
    const entries = byCase.get(key);
    const startIndex = cursor;
    const pts = entries.map((r, j) => `${xFor(startIndex + j)},${yFor(r.balance)}`).join(' ');
    cursor += entries.length;
    return { key, entries, points: pts, startIndex };
  });

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 480, display: 'block' }}>
        {/* baseline */}
        <line x1={padL} y1={padT + plotH} x2={W - padR} y2={padT + plotH} stroke="var(--line)" strokeWidth="1" />
        {/* y-axis labels */}
        <text x={padL - 6} y={padT + 4} textAnchor="end" fontSize="9.5" fill="var(--text-muted)">{Math.round(scale).toLocaleString()}</text>
        <text x={padL - 6} y={padT + plotH} textAnchor="end" fontSize="9.5" fill="var(--text-muted)">0</text>

        {/* dividers between case blocks */}
        {segments.slice(1).map(seg => (
          <line key={`div_${seg.key}`} x1={padL + slot * seg.startIndex} y1={padT} x2={padL + slot * seg.startIndex} y2={padT + plotH} stroke="var(--line)" strokeDasharray="3,3" strokeWidth="1" />
        ))}

        {ordered.map((r, i) => {
          const x = xFor(i) - barW / 2;
          const y = yFor(Number(r.amount));
          const h = padT + plotH - y;
          const color = r.type === 'OUT' ? 'var(--red)' : 'var(--green)';
          const caseLabel = r.caseId ? (caseIdFor ? caseIdFor(r.caseId) : r.caseId) : 'General';
          return (
            <rect key={r.id} x={x} y={y} width={barW} height={Math.max(h, 1)} rx="2.5" fill={color} opacity="0.85">
              <title>{`${caseLabel} · ${r.date} · ${r.type === 'OUT' ? '-' : '+'}Rs ${Number(r.amount).toLocaleString()} · Balance Rs ${r.balance.toLocaleString()}`}</title>
            </rect>
          );
        })}

        {segments.map(seg => (
          <polyline key={`line_${seg.key}`} points={seg.points} fill="none" stroke="var(--accent)" strokeWidth="1.75" />
        ))}
        {ordered.map((r, i) => (
          <circle key={`d_${r.id}`} cx={xFor(i)} cy={yFor(r.balance)} r="2.5" fill="var(--accent)">
            <title>{`Balance after this entry: Rs ${r.balance.toLocaleString()}`}</title>
          </circle>
        ))}
      </svg>
      <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-muted)', marginTop: 8, flexWrap: 'wrap' }}>
        <Legend swatch="var(--green)" label="Money In" />
        <Legend swatch="var(--red)" label="Money Out" />
        <Legend swatch="var(--accent)" label="Running balance (resets per case)" line />
      </div>
    </div>
  );
}

function Legend({ swatch, label, line }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 10, height: line ? 2 : 10, borderRadius: line ? 0 : 3, background: swatch }} />
      {label}
    </div>
  );
}
