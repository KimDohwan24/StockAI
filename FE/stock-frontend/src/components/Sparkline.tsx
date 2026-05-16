'use client';

interface SparklineProps {
  data: { value: number }[];
  color?: string;
  fillOpacity?: number;
  strokeWidth?: number;
  className?: string;
}

export default function Sparkline({
  data,
  color = '#0064e0',
  fillOpacity = 0.15,
  strokeWidth = 1.5,
  className = '',
}: SparklineProps) {
  if (data.length < 2) {
    return (
      <svg
        className={`w-full h-full ${className}`}
        viewBox="0 0 100 30"
        preserveAspectRatio="none"
      >
        <line
          x1="0"
          y1="15"
          x2="100"
          y2="15"
          stroke={color}
          strokeWidth={strokeWidth}
          opacity={0.3}
        />
      </svg>
    );
  }

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pad = range * 0.05;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * 100;
    const y = 30 - ((v - min + pad) / (range + pad * 2)) * 30;
    return [x, y] as const;
  });

  const lineD = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`)
    .join(' ');

  const areaD = `${lineD} L100 30 L0 30 Z`;

  return (
    <svg
      className={`w-full h-full ${className}`}
      viewBox="0 0 100 30"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={`sparkline-grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={fillOpacity} />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#sparkline-grad-${color.replace('#', '')})`} />
      <path
        d={lineD}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
