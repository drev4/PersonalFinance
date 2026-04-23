/**
 * SparklineChart — SVG sparkline for 30-day net worth history.
 *
 * Built with react-native-svg (already installed). No extra library required.
 * Renders a smooth cubic Bezier path on a dark background.
 */

import React, { useMemo } from 'react';
import { View } from 'react-native';
// eslint-disable-next-line import/no-named-as-default
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import type { NetWorthDataPoint } from '@/api/hooks/useDashboardSummary';

// ─── Props ────────────────────────────────────────────────────────────────────

interface SparklineChartProps {
  data: NetWorthDataPoint[];
  height?: number;
  /** Positive colour (uptrend). Defaults to emerald-500 */
  upColor?: string;
  /** Negative colour (downtrend). Defaults to red-500 */
  downColor?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build a smooth SVG path from normalised [0,1] x/y data points.
 * Uses Catmull-Rom → cubic Bezier conversion for a visually smooth curve.
 */
function buildPath(
  points: Array<{ x: number; y: number }>,
  width: number,
  height: number,
  padding: number,
): string {
  if (points.length < 2) return '';

  const w = width - padding * 2;
  const h = height - padding * 2;

  const scaled = points.map((p) => ({
    x: padding + p.x * w,
    y: padding + (1 - p.y) * h, // SVG y is top-down
  }));

  let d = `M ${scaled[0]!.x} ${scaled[0]!.y}`;

  for (let i = 1; i < scaled.length; i++) {
    const prev = scaled[i - 1]!;
    const curr = scaled[i]!;
    const cpx = (prev.x + curr.x) / 2;
    d += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  return d;
}

/** Build a closed area path (line + bottom fill) */
function buildAreaPath(
  linePath: string,
  points: Array<{ x: number; y: number }>,
  width: number,
  height: number,
  padding: number,
): string {
  if (!linePath || points.length < 2) return '';

  const w = width - padding * 2;
  const firstX = padding + (points[0]?.x ?? 0) * w;
  const lastX = padding + (points[points.length - 1]?.x ?? 1) * w;
  const bottom = height - padding;

  return `${linePath} L ${lastX} ${bottom} L ${firstX} ${bottom} Z`;
}

function normalise(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  if (range === 0) return values.map(() => 0.5);
  return values.map((v) => (v - min) / range);
}

// ─── Component ────────────────────────────────────────────────────────────────

const CHART_PADDING = 6;

export function SparklineChart({
  data,
  height = 80,
  upColor = '#10b981',
  downColor = '#ef4444',
}: SparklineChartProps): React.JSX.Element {
  const color = useMemo(() => {
    if (data.length < 2) return upColor;
    const first = data[0]?.value ?? 0;
    const last = data[data.length - 1]?.value ?? 0;
    return last >= first ? upColor : downColor;
  }, [data, upColor, downColor]);

  const points = useMemo((): Array<{ x: number; y: number }> => {
    if (data.length === 0) return [];
    const values = data.map((d) => d.value);
    const normY = normalise(values);
    return data.map((_, i) => ({
      x: data.length === 1 ? 0.5 : i / (data.length - 1),
      y: normY[i] ?? 0.5,
    }));
  }, [data]);

  return (
    <View
      className="mx-4 mt-3"
      accessible
      accessibilityLabel="Gráfico de evolución del patrimonio de los últimos 30 días"
      accessibilityRole="image"
      style={{ height }}
    >
      {/* Width is resolved at render time via onLayout; use 100% wrapper */}
      <Svg
        width="100%"
        height={height}
        viewBox={`0 0 300 ${height}`}
        preserveAspectRatio="none"
      >
        <Defs>
          <LinearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <Stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </LinearGradient>
        </Defs>

        {points.length >= 2 ? (
          <>
            {/* Filled area */}
            <Path
              d={buildAreaPath(
                buildPath(points, 300, height, CHART_PADDING),
                points,
                300,
                height,
                CHART_PADDING,
              )}
              fill="url(#sparkGrad)"
            />
            {/* Stroke line */}
            <Path
              d={buildPath(points, 300, height, CHART_PADDING)}
              fill="none"
              stroke={color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        ) : null}
      </Svg>
    </View>
  );
}
