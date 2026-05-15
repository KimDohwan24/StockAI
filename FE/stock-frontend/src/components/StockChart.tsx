'use client';

import { useEffect, useRef, useState } from 'react';
import {
  createChart,
  ColorType,
  IChartApi,
  AreaSeries,
  CandlestickSeries,
  Time,
} from 'lightweight-charts';

// lightweight-charts v5 compatible series creation
function addAreaSeriesCompat(chart: IChartApi, options: object) {
  try {
    return chart.addSeries(AreaSeries, options);
  } catch {
    return (chart as unknown as Record<string, (...args: unknown[]) => { setData: (d: unknown) => void }>).addAreaSeries(options);
  }
}

function addCandlestickSeriesCompat(chart: IChartApi, options?: object) {
  try {
    return chart.addSeries(CandlestickSeries, options);
  } catch {
    return (chart as unknown as Record<string, (...args: unknown[]) => { setData: (d: unknown) => void }>).addCandlestickSeries(options);
  }
}

export interface AreaPoint {
  time: string;
  value: number;
}

export interface CandlePoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface StockChartProps {
  data: AreaPoint[] | CandlePoint[];
  type?: 'area' | 'candlestick';
  color?: string;
  height?: number;
}

function isCandleData(data: AreaPoint[] | CandlePoint[]): data is CandlePoint[] {
  return data.length > 0 && 'open' in data[0];
}

export default function StockChart({
  data,
  type = 'area',
  color = '#0064e0',
  height,
}: StockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const getWidth = () => chartContainerRef.current?.clientWidth ?? 0;
    const getHeight = () => height ?? chartContainerRef.current?.clientHeight ?? 200;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#8595a4',
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: '#f1f4f7' },
      },
      width: getWidth(),
      height: getHeight(),
      timeScale: {
        visible: true,
        timeVisible: type === 'candlestick',
        secondsVisible: false,
      },
      rightPriceScale: {
        visible: true,
        borderVisible: false,
      },
      crosshair: {
        mode: 1,
      },
      handleScroll: type === 'candlestick',
      handleScale: type === 'candlestick',
    });

    if (type === 'candlestick' && isCandleData(data)) {
      const series = addCandlestickSeriesCompat(chart, {
        upColor: '#e41e3f',
        downColor: '#0064e0',
        borderUpColor: '#e41e3f',
        borderDownColor: '#0064e0',
        wickUpColor: '#e41e3f',
        wickDownColor: '#0064e0',
      });
      const mapped = data.map((d) => ({
        time: d.time as Time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }));
      series.setData(mapped);
    } else {
      const series = addAreaSeriesCompat(chart, {
        lineColor: color,
        topColor: color + '33',
        bottomColor: color + '00',
        lineWidth: 2,
      });
      series.setData(data as AreaPoint[]);
    }

    chart.timeScale().fitContent();
    chartRef.current = chart;
    setIsReady(true);

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: height ?? chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      setIsReady(false);
    };
  }, [data, color, type, height]);

  return (
    <div
      className={`relative w-full ${height == null ? 'h-full' : ''}`}
      style={height != null ? { height } : undefined}
    >
      <div ref={chartContainerRef} className="w-full h-full" />
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-steel">
          차트 로딩 중...
        </div>
      )}
    </div>
  );
}
