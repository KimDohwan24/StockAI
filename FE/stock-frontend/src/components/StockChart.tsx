'use client';

import { useEffect, useRef, useState } from 'react';
import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  AreaSeries,
  CandlestickSeries,
  Time,
  CandlestickData,
  SingleValueData,
} from 'lightweight-charts';

type SeriesType = ISeriesApi<'Candlestick'> | ISeriesApi<'Area'>;

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

function isKoreanMarketOpen(): boolean {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const kst = new Date(utc + (3600000 * 9));
  
  const day = kst.getDay();
  if (day === 0 || day === 6) return false;
  
  const hours = kst.getHours();
  const minutes = kst.getMinutes();
  const currentTime = hours * 100 + minutes;
  
  return currentTime >= 900 && currentTime <= 1530;
}

export interface AreaPoint {
  time: Time;
  value: number;
}

export interface CandlePoint {
  time: Time;
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
  realtimePrice?: number;
}

function isCandleData(data: AreaPoint[] | CandlePoint[]): data is CandlePoint[] {
  return data.length > 0 && 'open' in data[0];
}

export default function StockChart({
  data,
  type = 'area',
  color = '#0064e0',
  height,
  realtimePrice,
}: StockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<SeriesType | null>(null);
  const lastCandleRef = useRef<CandlePoint | AreaPoint | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    let cancelled = false;

    const initChart = () => {
      if (!chartContainerRef.current || cancelled) return;

      const w = chartContainerRef.current.clientWidth;
      const h = height ?? chartContainerRef.current.clientHeight;

      if (w === 0 || h === 0) {
        requestAnimationFrame(initChart);
        return;
      }

      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: '#8595a4',
        },
        grid: {
          vertLines: { visible: false },
          horzLines: { color: '#f1f4f7' },
        },
        width: w,
        height: h,
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
        seriesRef.current = series as unknown as SeriesType;
        if (data.length > 0) {
          lastCandleRef.current = data[data.length - 1];
        }
      } else {
        const series = addAreaSeriesCompat(chart, {
          lineColor: color,
          topColor: color + '33',
          bottomColor: color + '00',
          lineWidth: 2,
        });
        series.setData(data as AreaPoint[]);
        seriesRef.current = series as unknown as SeriesType;
        if (data.length > 0) {
          lastCandleRef.current = data[data.length - 1];
        }
      }

      chart.timeScale().fitContent();
      chartRef.current = chart;
      setIsReady(true);
    };

    initChart();

    const resizeObserver = new ResizeObserver(() => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: height ?? chartContainerRef.current.clientHeight,
        });
      }
    });

    if (chartContainerRef.current) {
      resizeObserver.observe(chartContainerRef.current);
    }

    return () => {
      cancelled = true;
      resizeObserver.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
      seriesRef.current = null;
      lastCandleRef.current = null;
      setIsReady(false);
    };
  }, [data, color, type, height]);

  useEffect(() => {
    if (realtimePrice == null || !seriesRef.current || !lastCandleRef.current) return;
    if (!isKoreanMarketOpen()) return;

    const last = lastCandleRef.current;
    const time = (last as CandlePoint).time ?? (last as AreaPoint).time;

    if (type === 'candlestick' && isCandleData([last as CandlePoint])) {
      const candleLast = last as CandlePoint;
      const updated: CandlestickData<Time> = {
        time: candleLast.time as Time,
        open: candleLast.open,
        high: Math.max(candleLast.high, realtimePrice),
        low: Math.min(candleLast.low, realtimePrice),
        close: realtimePrice,
      };
      (seriesRef.current as unknown as ISeriesApi<'Candlestick'>).update(updated);
      lastCandleRef.current = {
        ...candleLast,
        high: updated.high,
        low: updated.low,
        close: updated.close,
      };
    } else {
      const updated: SingleValueData<Time> = {
        time: time as Time,
        value: realtimePrice,
      };
      (seriesRef.current as unknown as ISeriesApi<'Area'>).update(updated);
      lastCandleRef.current = { time: time as Time, value: realtimePrice };
    }
  }, [realtimePrice, type]);

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