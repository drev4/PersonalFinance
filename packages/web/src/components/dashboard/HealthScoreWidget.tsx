import { Heart } from 'lucide-react';
import type React from 'react';
import type { HealthScoreArea } from '../../api/dashboard.api';
import { useHealthScore } from '../../hooks/useDashboard';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

// ─── Circular gauge SVG ───────────────────────────────────────────────────────

interface GaugeProps {
  score: number;
  color: string;
}

function ScoreGauge({ score, color }: GaugeProps): React.ReactElement {
  const r = 44;
  const cx = 56;
  const cy = 56;
  const circumference = 2 * Math.PI * r;
  const fraction = Math.min(score, 100) / 100;
  const dashOffset = circumference * (1 - fraction);

  return (
    <svg width={112} height={112} viewBox="0 0 112 112">
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={10}
        className="text-gray-100"
      />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={10}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text x={cx} y={cy + 6} textAnchor="middle" fontSize={22} fontWeight="bold" fill={color}>
        {score}
      </text>
    </svg>
  );
}

// ─── Area bar ─────────────────────────────────────────────────────────────────

interface AreaBarProps {
  area: HealthScoreArea;
}

function AreaBar({ area }: AreaBarProps): React.ReactElement {
  const pct = Math.round((area.score / area.max) * 100);
  const barColor =
    pct >= 80
      ? '#22c55e'
      : pct >= 60
        ? '#84cc16'
        : pct >= 40
          ? '#f59e0b'
          : pct >= 20
            ? '#f97316'
            : '#ef4444';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700">{area.label}</span>
        <span className="text-xs text-gray-500">
          {area.score}/{area.max}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
      <p className="text-xs text-gray-400">{area.detail}</p>
    </div>
  );
}

// ─── Widget ───────────────────────────────────────────────────────────────────

export default function HealthScoreWidget(): React.ReactElement {
  const { data, isLoading } = useHealthScore();

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Heart size={16} className="text-rose-500" />
          Salud financiera
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-6">
        {isLoading || !data ? (
          <>
            <div className="flex justify-center">
              <Skeleton className="h-[112px] w-[112px] rounded-full" />
            </div>
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-1.5 w-full" />
                  <Skeleton className="h-3 w-48" />
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Score gauge + label */}
            <div className="flex flex-col items-center gap-2">
              <ScoreGauge score={data.score} color={data.color} />
              <span className="text-sm font-bold" style={{ color: data.color }}>
                {data.label}
              </span>
            </div>

            {/* Area breakdown */}
            <div className="space-y-4">
              {data.areas.map((area) => (
                <AreaBar key={area.key} area={area} />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
