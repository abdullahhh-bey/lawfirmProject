import React from 'react';

export default function FinanceChart({
  rows,
  caseIdFor,
}) {
  if (!rows || rows.length === 0) {
    return (
      <div
        style={{
          color: 'var(--text-muted)',
          fontSize: 12.5,
          padding: '30px 0',
          textAlign: 'center',
        }}
      >
        No payments recorded yet — add one below to see
        the chart.
      </div>
    );
  }

  /*
   * Normalize numeric values first.
   *
   * Never allow strings, undefined, NaN or Infinity
   * to reach SVG calculations.
   */
  const safeRows = rows.map((row) => ({
    ...row,

    amount: Number.isFinite(Number(row.amount))
      ? Number(row.amount)
      : 0,

    balance: Number.isFinite(Number(row.balance))
      ? Number(row.balance)
      : 0,
  }));

  /*
   * Group by case.
   */
  const groups = [];
  const byCase = new Map();

  for (const row of safeRows) {
    const key =
      row.caseId || '__general__';

    if (!byCase.has(key)) {
      byCase.set(key, []);
      groups.push(key);
    }

    byCase.get(key).push(row);
  }

  /*
   * Keep every case internally ordered by date.
   */
  const ordered = groups.flatMap((key) =>
    byCase
      .get(key)
      .slice()
      .sort((a, b) =>
        (a.date || '').localeCompare(
          b.date || ''
        )
      )
  );

  const W = 640;
  const H = 200;

  const padL = 44;
  const padR = 12;
  const padT = 14;
  const padB = 28;

  const plotW =
    W - padL - padR;

  const plotH =
    H - padT - padB;

  const maxAmount = Math.max(
    1,
    ...ordered.map((r) =>
      Math.abs(Number(r.amount) || 0)
    )
  );

  const maxBalance = Math.max(
    1,
    ...ordered.map((r) =>
      Math.abs(Number(r.balance) || 0)
    )
  );

  const scale = Math.max(
    maxAmount,
    maxBalance,
    1
  );

  const n = ordered.length;

  const slot =
    n > 0
      ? plotW / n
      : plotW;

  const barW = Math.min(
    28,
    slot * 0.55
  );

  const yFor = (value) => {
    const number = Number(value);

    const safeValue =
      Number.isFinite(number)
        ? number
        : 0;

    return (
      padT +
      plotH -
      (safeValue / scale) * plotH
    );
  };

  const xFor = (index) =>
    padL +
    slot * index +
    slot / 2;

  /*
   * Separate balance line per case.
   */
  let cursor = 0;

  const segments = groups.map((key) => {
    const entries =
      byCase.get(key) || [];

    const startIndex = cursor;

    const points = entries
      .map((row, j) => {
        const x =
          xFor(startIndex + j);

        const y =
          yFor(row.balance);

        /*
         * Explicit spaces are used between
         * the x and y values.
         */
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');

    cursor += entries.length;

    return {
      key,
      entries,
      points,
      startIndex,
    };
  });

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{
          minWidth: 480,
          display: 'block',
        }}
      >
        {/* baseline */}

        <line
          x1={padL}
          y1={padT + plotH}
          x2={W - padR}
          y2={padT + plotH}
          stroke="var(--line)"
          strokeWidth="1"
        />

        {/* y axis */}

        <text
          x={padL - 6}
          y={padT + 4}
          textAnchor="end"
          fontSize="9.5"
          fill="var(--text-muted)"
        >
          {Math.round(
            scale
          ).toLocaleString()}
        </text>

        <text
          x={padL - 6}
          y={padT + plotH}
          textAnchor="end"
          fontSize="9.5"
          fill="var(--text-muted)"
        >
          0
        </text>

        {/* case separators */}

        {segments
          .slice(1)
          .map((segment) => (
            <line
              key={`div_${segment.key}`}
              x1={
                padL +
                slot *
                segment.startIndex
              }
              y1={padT}
              x2={
                padL +
                slot *
                segment.startIndex
              }
              y2={padT + plotH}
              stroke="var(--line)"
              strokeDasharray="3,3"
              strokeWidth="1"
            />
          ))}

        {/* payment bars */}

        {ordered.map((row, index) => {
          const amount =
            Number(row.amount) || 0;

          const x =
            xFor(index) -
            barW / 2;

          const y =
            yFor(amount);

          const height =
            padT +
            plotH -
            y;

          const color =
            row.type === 'OUT'
              ? 'var(--red)'
              : 'var(--green)';

          const caseLabel =
            row.caseId
              ? caseIdFor
                ? caseIdFor(
                  row.caseId
                )
                : row.caseId
              : 'General';

          return (
            <rect
              key={
                row.id ??
                `bar-${index}`
              }
              x={x}
              y={y}
              width={barW}
              height={Math.max(
                height,
                1
              )}
              rx="2.5"
              fill={color}
              opacity="0.85"
            >
              <title>
                {`${caseLabel} · ${row.date || ''
                  } · ${row.type ===
                    'OUT'
                    ? '-'
                    : '+'
                  }Rs ${amount.toLocaleString()} · Balance Rs ${Number(
                    row.balance
                  ).toLocaleString()}`}
              </title>
            </rect>
          );
        })}

        {/* running balance */}

        {segments.map((segment) => (
          <polyline
            key={`line_${segment.key}`}
            points={
              segment.points
            }
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1.75"
          />
        ))}

        {/* balance points */}

        {ordered.map(
          (row, index) => (
            <circle
              key={
                row.id
                  ? `d_${row.id}`
                  : `dot_${index}`
              }
              cx={xFor(index)}
              cy={yFor(
                row.balance
              )}
              r="2.5"
              fill="var(--accent)"
            >
              <title>
                {`Balance after this entry: Rs ${Number(
                  row.balance || 0
                ).toLocaleString()}`}
              </title>
            </circle>
          )
        )}
      </svg>

      <div
        style={{
          display: 'flex',
          gap: 16,
          fontSize: 11,
          color:
            'var(--text-muted)',
          marginTop: 8,
          flexWrap: 'wrap',
        }}
      >
        <Legend
          swatch="var(--green)"
          label="Money In"
        />

        <Legend
          swatch="var(--red)"
          label="Money Out"
        />

        <Legend
          swatch="var(--accent)"
          label="Running balance (resets per case)"
          line
        />
      </div>
    </div>
  );
}

function Legend({
  swatch,
  label,
  line,
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <span
        style={{
          width: 10,
          height: line ? 2 : 10,
          borderRadius:
            line ? 0 : 3,
          background: swatch,
        }}
      />

      {label}
    </div>
  );
}

