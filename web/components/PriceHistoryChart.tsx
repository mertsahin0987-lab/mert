import type { PriceHistory } from '@/lib/data';

/**
 * Server-rendered price history chart. Plain SVG, no client JS, no chart
 * library — keeps the bundle small and the chart cacheable as static markup.
 *
 * Renders the cheapest in-stock price per day across the lifetime of our
 * tracking for this product. Out-of-stock rows are excluded upstream (they
 * aren't buyable, so a £30 OOS price would mislead the trend line).
 *
 * Shows the user three pieces of context:
 *   - Where the current price sits relative to the historical range
 *   - The lowest price we've ever seen + the day it happened
 *   - A clear "good time / bad time to buy" signal at a glance
 */

export function PriceHistoryChart({ history }: { history: PriceHistory }) {
  const { points, current, lowest, lowestDate, highest, averagePrice } = history;

  if (points.length === 0 || current == null || lowest == null) {
    return null;  // No history yet — don't show the section
  }

  // If we only have one data point, show the stats but skip the chart.
  const hasChart = points.length >= 2;

  // Chart geometry — fixed viewBox keeps it crisp at any width.
  const W = 720;
  const H = 180;
  const padL = 48;
  const padR = 16;
  const padT = 16;
  const padB = 28;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  // Y scale — clamp range so the line never hugs the top/bottom edge.
  const yMax = highest ?? current;
  const yMin = lowest;
  const yRange = Math.max(yMax - yMin, 1);
  const yPad = Math.max(yRange * 0.15, 1);
  const yTop = yMax + yPad;
  const yBottom = Math.max(yMin - yPad, 0);
  const ySpan = yTop - yBottom;
  const yToPx = (price: number) =>
    padT + chartH - ((price - yBottom) / ySpan) * chartH;

  // X scale — evenly spaced by index (sparse daily data, not enough to be
  // worth converting to real day positions).
  const xToPx = (i: number) => {
    if (points.length === 1) return padL + chartW / 2;
    return padL + (i / (points.length - 1)) * chartW;
  };

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xToPx(i).toFixed(1)} ${yToPx(p.price).toFixed(1)}`)
    .join(' ');

  // Fill area below the line — soft visual cue
  const areaPath =
    linePath +
    ` L ${xToPx(points.length - 1).toFixed(1)} ${padT + chartH}` +
    ` L ${xToPx(0).toFixed(1)} ${padT + chartH} Z`;

  // Y axis labels — three ticks: max, mid, min
  const yTicks = [yTop, (yTop + yBottom) / 2, yBottom];

  // "How does the current price compare" verdict
  const range = (highest ?? current) - lowest;
  const aboveLowest = current - lowest;
  let verdict: { tone: 'good' | 'okay' | 'bad'; label: string; sub: string };
  if (range < 5 || aboveLowest < 5) {
    verdict = {
      tone: 'good',
      label: 'At the lowest price',
      sub: `we've ever tracked${lowestDate ? ` (since ${formatDate(lowestDate)})` : ''}`,
    };
  } else if (aboveLowest / range < 0.25) {
    verdict = {
      tone: 'good',
      label: 'Near the lowest',
      sub: `£${aboveLowest.toFixed(2)} above the lowest we've seen`,
    };
  } else if (aboveLowest / range < 0.6) {
    verdict = {
      tone: 'okay',
      label: 'Mid-range price',
      sub: `£${aboveLowest.toFixed(2)} above the lowest we've seen`,
    };
  } else {
    verdict = {
      tone: 'bad',
      label: 'Above average',
      sub: `£${aboveLowest.toFixed(2)} above the lowest we've seen`,
    };
  }

  const verdictClass =
    verdict.tone === 'good' ? 'text-emerald-600 border-emerald-200 bg-emerald-50' :
    verdict.tone === 'okay' ? 'text-amber-700 border-amber-200 bg-amber-50' :
    'text-rose-700 border-rose-200 bg-rose-50';

  return (
    <section className="mt-12 border-t border-line pt-10">
      <div className="mb-6 flex items-baseline justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs font-bold text-ink uppercase tracking-widest mb-1">
            Price history
          </div>
          <p className="text-sm text-dim">
            Cheapest in-stock price we&apos;ve tracked each day.
          </p>
        </div>
        <div className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${verdictClass}`}>
          {verdict.label} — <span className="font-normal">{verdict.sub}</span>
        </div>
      </div>

      {hasChart && (
        <div className="bg-paper border border-line rounded-md p-4 mb-6 overflow-x-auto">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="none" role="img" aria-label="Price history chart">
            {/* Y grid + labels */}
            {yTicks.map((t, i) => (
              <g key={i}>
                <line
                  x1={padL} x2={W - padR}
                  y1={yToPx(t)} y2={yToPx(t)}
                  stroke="currentColor" className="text-line" strokeWidth="1"
                />
                <text
                  x={padL - 8} y={yToPx(t) + 4}
                  textAnchor="end" className="fill-current text-dim"
                  fontSize="11"
                >
                  £{t.toFixed(0)}
                </text>
              </g>
            ))}

            {/* Lowest-price horizontal marker */}
            <line
              x1={padL} x2={W - padR}
              y1={yToPx(lowest)} y2={yToPx(lowest)}
              stroke="currentColor" className="text-emerald-400"
              strokeWidth="1" strokeDasharray="4 4"
            />

            {/* Area fill */}
            <path d={areaPath} className="fill-accent" opacity="0.08" />

            {/* Line */}
            <path
              d={linePath}
              fill="none" stroke="currentColor"
              className="text-accent" strokeWidth="2"
              strokeLinejoin="round" strokeLinecap="round"
            />

            {/* Points */}
            {points.map((p, i) => {
              const cx = xToPx(i);
              const cy = yToPx(p.price);
              const isLowest = p.date === lowestDate;
              const isCurrent = i === points.length - 1;
              return (
                <g key={p.date}>
                  <circle
                    cx={cx} cy={cy} r={isCurrent || isLowest ? 4 : 3}
                    className={isCurrent ? 'fill-accent' : isLowest ? 'fill-emerald-500' : 'fill-paper'}
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{ color: isCurrent ? 'var(--color-accent, currentColor)' : 'currentColor' }}
                  />
                </g>
              );
            })}

            {/* X axis: first + last date labels only */}
            <text
              x={padL} y={H - 8}
              className="fill-current text-dim" fontSize="11"
            >
              {formatDate(points[0].date)}
            </text>
            <text
              x={W - padR} y={H - 8}
              textAnchor="end" className="fill-current text-dim" fontSize="11"
            >
              {formatDate(points[points.length - 1].date)}
            </text>
          </svg>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <Stat label="Current cheapest" value={`£${current.toFixed(2)}`} accent />
        <Stat
          label="Lowest seen"
          value={`£${lowest.toFixed(2)}`}
          sub={lowestDate ? formatDate(lowestDate) : null}
        />
        {highest != null && (
          <Stat label="Highest seen" value={`£${highest.toFixed(2)}`} />
        )}
        {averagePrice != null && (
          <Stat label="Average" value={`£${averagePrice.toFixed(2)}`} />
        )}
      </div>
    </section>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string | null; accent?: boolean }) {
  return (
    <div className="bg-paper border border-line rounded-md p-3">
      <div className="text-[10px] font-bold uppercase tracking-widest text-dim mb-1">{label}</div>
      <div className={`text-xl font-bold ${accent ? 'text-accent' : 'text-ink'}`}>{value}</div>
      {sub && <div className="text-xs text-dim mt-0.5">{sub}</div>}
    </div>
  );
}

function formatDate(iso: string): string {
  // iso = "YYYY-MM-DD" → "12 May"
  const [, m, d] = iso.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]}`;
}
