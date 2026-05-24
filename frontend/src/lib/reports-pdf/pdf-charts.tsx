import { G, Line, Path, Rect, Svg, Text as SvgText } from '@react-pdf/renderer';
import { PDF_COLORS } from '@/lib/reports-pdf/pdf-styles';

type ChartPoint = {
  label: string;
  value: number;
};

type MultiSeriesPoint = {
  label: string;
  values: number[];
};

const CHART_PADDING = { top: 12, right: 12, bottom: 24, left: 44 };

function formatAxisValue(value: number) {
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(0)}k`;
  }
  return String(Math.round(value));
}

function buildLinePath(
  values: number[],
  chartWidth: number,
  chartHeight: number,
  maxValue: number,
  minValue: number,
) {
  if (values.length === 0) {
    return '';
  }

  const range = maxValue - minValue || 1;

  return values
    .map((value, index) => {
      const x =
        values.length === 1
          ? chartWidth / 2
          : (index / (values.length - 1)) * chartWidth;
      const y = chartHeight - ((value - minValue) / range) * chartHeight;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

export function PdfLineChart({
  title,
  points,
  color = PDF_COLORS.emerald,
  width = 515,
  height = 140,
}: {
  title: string;
  points: ChartPoint[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (points.length === 0) {
    return null;
  }

  const chartWidth = width - CHART_PADDING.left - CHART_PADDING.right;
  const chartHeight = height - CHART_PADDING.top - CHART_PADDING.bottom;
  const values = points.map((point) => point.value);
  const maxValue = Math.max(...values, 0);
  const minValue = Math.min(...values, 0);
  const paddedMax = maxValue === minValue ? maxValue + 1 : maxValue;
  const paddedMin = maxValue === minValue ? Math.min(minValue, 0) : minValue;
  const linePath = buildLinePath(
    values,
    chartWidth,
    chartHeight,
    paddedMax,
    paddedMin,
  );
  const baselineY =
    CHART_PADDING.top +
    chartHeight -
    ((0 - paddedMin) / (paddedMax - paddedMin || 1)) * chartHeight;

  return (
    <Svg width={width} height={height} style={{ marginBottom: 10 }}>
      <SvgText
        x={CHART_PADDING.left}
        y={10}
        style={{ fontSize: 8, fontFamily: 'Inter', fontWeight: 600 }}
        fill={PDF_COLORS.slate}
      >
        {title}
      </SvgText>
      <Line
        x1={CHART_PADDING.left}
        y1={baselineY}
        x2={CHART_PADDING.left + chartWidth}
        y2={baselineY}
        stroke={PDF_COLORS.border}
        strokeWidth={1}
      />
      <Line
        x1={CHART_PADDING.left}
        y1={CHART_PADDING.top}
        x2={CHART_PADDING.left}
        y2={CHART_PADDING.top + chartHeight}
        stroke={PDF_COLORS.border}
        strokeWidth={1}
      />
      <SvgText
        x={4}
        y={CHART_PADDING.top + 4}
        style={{ fontSize: 7, fontFamily: 'Inter' }}
        fill={PDF_COLORS.muted}
      >
        {formatAxisValue(paddedMax)}
      </SvgText>
      <SvgText
        x={4}
        y={CHART_PADDING.top + chartHeight}
        style={{ fontSize: 7, fontFamily: 'Inter' }}
        fill={PDF_COLORS.muted}
      >
        {formatAxisValue(paddedMin)}
      </SvgText>
      <Path
        d={linePath}
        stroke={color}
        strokeWidth={2}
        fill="none"
        transform={`translate(${CHART_PADDING.left}, ${CHART_PADDING.top})`}
      />
      {points.map((point, index) => {
        const x =
          CHART_PADDING.left +
          (points.length === 1
            ? chartWidth / 2
            : (index / (points.length - 1)) * chartWidth);
        const showLabel =
          points.length <= 6 ||
          index === 0 ||
          index === points.length - 1 ||
          index % Math.ceil(points.length / 6) === 0;

        if (!showLabel) {
          return null;
        }

        return (
          <SvgText
            key={`${point.label}-${index}`}
            x={x - 12}
            y={height - 6}
            style={{ fontSize: 6.5, fontFamily: 'Inter' }}
            fill={PDF_COLORS.muted}
          >
            {point.label}
          </SvgText>
        );
      })}
    </Svg>
  );
}

export function PdfMultiLineChart({
  title,
  points,
  seriesLabels,
  colors,
  width = 515,
  height = 150,
}: {
  title: string;
  points: MultiSeriesPoint[];
  seriesLabels: string[];
  colors: string[];
  width?: number;
  height?: number;
}) {
  if (points.length === 0 || seriesLabels.length === 0) {
    return null;
  }

  const chartWidth = width - CHART_PADDING.left - CHART_PADDING.right;
  const chartHeight = height - CHART_PADDING.top - CHART_PADDING.bottom - 12;
  const allValues = points.flatMap((point) => point.values);
  const maxValue = Math.max(...allValues, 1);
  const minValue = 0;

  return (
    <Svg width={width} height={height} style={{ marginBottom: 10 }}>
      <SvgText
        x={CHART_PADDING.left}
        y={10}
        style={{ fontSize: 8, fontFamily: 'Inter', fontWeight: 600 }}
        fill={PDF_COLORS.slate}
      >
        {title}
      </SvgText>
      {seriesLabels.map((label, seriesIndex) => {
        const values = points.map((point) => point.values[seriesIndex] ?? 0);
        const linePath = buildLinePath(
          values,
          chartWidth,
          chartHeight,
          maxValue,
          minValue,
        );

        return (
          <Path
            key={label}
            d={linePath}
            stroke={colors[seriesIndex] ?? PDF_COLORS.indigo}
            strokeWidth={1.5}
            fill="none"
            transform={`translate(${CHART_PADDING.left}, ${CHART_PADDING.top + 8})`}
          />
        );
      })}
      {seriesLabels.map((label, index) => (
        <SvgText
          key={label}
          x={CHART_PADDING.left + index * 110}
          y={height - 8}
          style={{ fontSize: 6.5, fontFamily: 'Inter' }}
          fill={colors[index] ?? PDF_COLORS.indigo}
        >
          ■ {label.length > 14 ? `${label.slice(0, 14)}…` : label}
        </SvgText>
      ))}
    </Svg>
  );
}

export function PdfBarChart({
  title,
  points,
  color = PDF_COLORS.indigo,
  width = 515,
  height = 130,
}: {
  title: string;
  points: ChartPoint[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (points.length === 0) {
    return null;
  }

  const chartWidth = width - CHART_PADDING.left - CHART_PADDING.right;
  const chartHeight = height - CHART_PADDING.top - CHART_PADDING.bottom;
  const maxValue = Math.max(...points.map((point) => point.value), 1);
  const barWidth = Math.max(8, chartWidth / points.length - 6);

  return (
    <Svg width={width} height={height} style={{ marginBottom: 10 }}>
      <SvgText
        x={CHART_PADDING.left}
        y={10}
        style={{ fontSize: 8, fontFamily: 'Inter', fontWeight: 600 }}
        fill={PDF_COLORS.slate}
      >
        {title}
      </SvgText>
      <Line
        x1={CHART_PADDING.left}
        y1={CHART_PADDING.top + chartHeight}
        x2={CHART_PADDING.left + chartWidth}
        y2={CHART_PADDING.top + chartHeight}
        stroke={PDF_COLORS.border}
        strokeWidth={1}
      />
      {points.map((point, index) => {
        const barHeight = (point.value / maxValue) * chartHeight;
        const x =
          CHART_PADDING.left +
          index * (chartWidth / points.length) +
          (chartWidth / points.length - barWidth) / 2;
        const y = CHART_PADDING.top + chartHeight - barHeight;

        return (
          <Rect
            key={`${point.label}-${index}`}
            x={x}
            y={y}
            width={barWidth}
            height={barHeight}
            fill={color}
            rx={2}
          />
        );
      })}
    </Svg>
  );
}

export function PdfHorizontalBarChart({
  title,
  points,
  width = 515,
  height,
}: {
  title: string;
  points: Array<{ label: string; value: number; color: string }>;
  width?: number;
  height?: number;
}) {
  if (points.length === 0) {
    return null;
  }

  const rowHeight = 16;
  const chartHeight = height ?? 28 + points.length * rowHeight;
  const chartWidth = width - 160;
  const maxValue = Math.max(...points.map((point) => point.value), 1);

  return (
    <Svg width={width} height={chartHeight} style={{ marginBottom: 8 }}>
      <SvgText
        x={0}
        y={10}
        style={{ fontSize: 8, fontFamily: 'Inter', fontWeight: 600 }}
        fill={PDF_COLORS.slate}
      >
        {title}
      </SvgText>
      {points.map((point, index) => {
        const y = 20 + index * rowHeight;
        const barWidth = (point.value / maxValue) * chartWidth;

        return (
          <G key={point.label}>
            <SvgText
              x={0}
              y={y + 10}
              style={{ fontSize: 7, fontFamily: 'Inter' }}
              fill={PDF_COLORS.slate}
            >
              {point.label.length > 18
                ? `${point.label.slice(0, 18)}…`
                : point.label}
            </SvgText>
            <Rect
              x={120}
              y={y}
              width={barWidth}
              height={10}
              fill={point.color}
              rx={2}
            />
          </G>
        );
      })}
    </Svg>
  );
}
