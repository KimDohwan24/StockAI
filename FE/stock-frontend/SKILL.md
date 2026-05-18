# SKILL.md - stock-frontend

> **Verifies**: Next.js 16.2.6, React 19.2.4, Tailwind CSS 4.x, Lightweight Charts 5.2.0
> **Last Checked**: 2026-05-16
> **Module**: `FE/stock-frontend/`

---

## 1. Next.js 16 App Router Patterns

### 1.1 Server Component (Default)

**Use For**: 페이지 레이아웃, 데이터 페칭, SEO, 정적 콘텐츠

```tsx
// ✅ src/app/dashboard/page.tsx
// NO 'use client' directive — default is Server Component
import { StockChart } from '@/components/StockChart';

export default async function DashboardPage() {
  const stocks = await fetch('http://localhost:8080/api/stocks/recommended').then(r => r.json());
  
  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold">인기 추천 종목</h1>
      {stocks.map((stock: any) => (
        <div key={stock.ticker}>
          {/* Client Component can be nested inside Server Component */}
          <StockChart data={stock.chartData} color={stock.up ? '#e41e3f' : '#0064e0'} />
        </div>
      ))}
    </div>
  );
}
```

### 1.2 Client Component (Interactive / Browser APIs)

**Use For**: 차트, 이벤트 핸들러, useState/useEffect, 브라우저 API

```tsx
// ✅ src/components/StockChart.tsx
'use client';

import { useEffect, useRef } from 'react';
import { createChart, ColorType, AreaSeries } from 'lightweight-charts';

interface StockChartProps {
  data: { time: string; value: number }[];
  color?: string;
}

export default function StockChart({ data, color = '#0064e0' }: StockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;
    
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#8595a4',
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: '#f1f4f7' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 200,
      timeScale: { visible: false },
      rightPriceScale: { visible: false },
      handleScroll: false,
      handleScale: false,
    });

    const series = chart.addSeries(AreaSeries, {
      lineColor: color,
      topColor: color + '33',
      bottomColor: color + '00',
      lineWidth: 2,
    });

    series.setData(data);
    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, color]);

  return <div ref={chartContainerRef} className="w-full h-[200px]" />;
}
```

**⚠️ Key Rule**: `'use client'`를 선언한 파일에서만 React 훅(`useState`, `useEffect`)을 사용할 수 있음. Server Component에서 훅 사용 시 빌드 에러 발생.

### 1.3 Layout (Root & Nested)

```tsx
// ✅ src/app/layout.tsx — Root Layout (Server Component)
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StockAI — AI 뉴스 기반 주식 추천",
  description: "AI가 분석한 뉴스와 시장 데이터를 기반으로 맞춤형 주식 종목을 추천합니다.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```

---

## 2. Tailwind CSS v4 Setup

### 2.1 globals.css (Tailwind v4 Directives)

```css
/* ✅ src/app/globals.css */
@import "tailwindcss";

/* DESIGN.md 기반 커스텀 토큰 정의 */
@theme {
  /* Colors */
  --color-canvas: #ffffff;
  --color-surface-soft: #f1f4f7;
  --color-ink-deep: #0a1317;
  --color-ink: #1c1e21;
  --color-charcoal: #444950;
  --color-slate: #4b4c4f;
  --color-steel: #5d6c7b;
  --color-stone: #8595a4;
  --color-hairline: #ced0d4;
  --color-hairline-soft: #dee3e9;
  --color-disabled-text: #bcc0c4;
  --color-primary: #0064e0;
  --color-primary-deep: #0457cb;
  --color-primary-soft: #0091ff;
  --color-fb-blue: #1876f2;
  --color-meta-blue: #385898;
  --color-oculus-purple: #a121ce;
  --color-success: #31a24c;
  --color-attention: #f2a918;
  --color-warning: #f7b928;
  --color-critical: #e41e3f;
  --color-critical-strong: #f0284a;
  
  /* Stock Market Specific (KR) */
  --color-market-up: #e41e3f;
  --color-market-down: #0064e0;
  --color-market-neutral: #8595a4;

  /* Font Family (fallback for Optimistic VF) */
  --font-sans: var(--font-geist-sans), 'Montserrat', 'Helvetica', 'Arial', sans-serif;

  /* Border Radius */
  --radius-xs: 2px;
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 16px;
  --radius-xxl: 24px;
  --radius-xxxl: 32px;
  --radius-full: 100px;
  --radius-circle: 9999px;
}

/* Custom utility classes */
@layer utilities {
  .meta-button-buy {
    @apply bg-primary text-white font-bold text-sm rounded-full px-8 py-3.5;
  }
  .meta-button-secondary {
    @apply bg-transparent text-ink-deep font-bold text-sm rounded-full px-7 py-3 border-2 border-ink-deep;
  }
  .meta-card {
    @apply bg-canvas rounded-xl p-6 border border-hairline-soft;
  }
}
```

### 2.2 Tailwind Class Usage Convention

| Purpose | Example |
|---------|---------|
| Layout spacing | `px-6`, `py-12`, `max-w-7xl`, `mx-auto` |
| Background/Surface | `bg-canvas`, `bg-surface-soft` |
| Typography | `text-ink-deep`, `font-bold`, `text-sm` |
| Rounding | `rounded-full`, `rounded-[32px]` |
| Stock up/down | `text-market-up` (red), `text-market-down` (blue) |

---

## 3. Lightweight Charts Integration

### 3.1 Installation

```bash
npm install lightweight-charts
```

### 3.2 Pattern (Client Component Only)

Always wrap in a Client Component (`'use client'`):

```tsx
'use client';
import { useEffect, useRef } from 'react';
import { createChart, ColorType, AreaSeries, IChartApi } from 'lightweight-charts';

interface Props {
  data: { time: string; value: number }[];
  color?: string;
  height?: number;
}

export function MiniStockChart({ data, color = '#0064e0', height = 80 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    
    const chart = createChart(ref.current, {
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: 'transparent' },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      width: ref.current.clientWidth,
      height,
      timeScale: { visible: false },
      rightPriceScale: { visible: false },
      handleScroll: false,
      handleScale: false,
    });

    const series = chart.addSeries(AreaSeries, {
      lineColor: color,
      topColor: color + '33',
      bottomColor: color + '00',
      lineWidth: 2,
    });

    series.setData(data);
    chart.timeScale().fitContent();

    return () => chart.remove();
  }, [data, color, height]);

  return <div ref={ref} className="w-full" style={{ height }} />;
}
```

**⚠️ Key Rule**: `lightweight-charts`는 브라우저 DOM에 의존하므로 반드시 `'use client'` 파일에서만 사용. Server Component에서 import 시 빌드 에러.

### 3.3 Responsive Sizing

```tsx
// Handle window resize
const handleResize = () => {
  if (containerRef.current) {
    chart.applyOptions({ width: containerRef.current.clientWidth });
  }
};
window.addEventListener('resize', handleResize);
// Cleanup in useEffect return
```

---

## 4. Data Fetching Patterns

### 4.1 Server Component (async/await)

```tsx
// ✅ Best for SEO + initial data
export default async function StockDetailPage({ params }: { params: { id: string } }) {
  const stock = await fetch(`http://localhost:8080/api/stocks/${params.id}`, {
    cache: 'no-store', // or 'force-cache' for static data
  }).then(r => r.json());

  return (
    <div>
      <h1>{stock.name}</h1>
      <StockChart data={stock.chartData} />
    </div>
  );
}
```

### 4.2 Client Component (SWR)

```tsx
// ✅ For real-time/polling data in Client Component
'use client';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function LivePrice({ ticker }: { ticker: string }) {
  const { data, error, isLoading } = useSWR(
    `http://localhost:8080/api/stocks/${ticker}/price`,
    fetcher,
    { refreshInterval: 5000 } // 5초 폴링
  );

  if (isLoading) return <span className="text-stone">Loading...</span>;
  if (error) return <span className="text-critical">Error</span>;
  
  return (
    <span className={data.change >= 0 ? 'text-market-up' : 'text-market-down'}>
      {data.price.toLocaleString()}
    </span>
  );
}
```

---

## 5. Icon System (Lucide React)

```tsx
import { Search, Bell, User, TrendingUp, TrendingDown, Star, ArrowUpRight } from 'lucide-react';

// Usage
<button className="p-2 text-steel active:text-ink transition-colors">
  <Bell className="w-5 h-5" />
</button>

<div className={`flex items-center gap-1 text-sm font-bold ${up ? 'text-market-up' : 'text-market-down'}`}>
  {up ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
  {change}
</div>
```

---

## 6. Do's and Don'ts

### ✅ Do
- Server Component에서 **async/await**로 데이터를 직접 fetch
- Client Component는 **최소한으로** 분리 (차트, 폼, 인터랙션만)
- `globals.css`에 DESIGN.md 토큰을 **@theme**로 등록하여 Tailwind 클래스 사용
- Lightweight Charts는 **반드시** `'use client'` 파일에서만 사용
- **한국 주식 색상 규칙** 준수: 상승=빨강(#e41e3f), 하락=파랑(#0064e0)

### ❌ Don't
- Server Component에서 `'use client'` 없이 React 훅 사용
- `window`, `document` 등 브라우저 API를 Server Component에서 직접 접근
- Lightweight Charts를 Server Component에서 import 시도
- Tailwind v3 문법 (`tailwind.config.js`) 사용 — v4는 `@theme` 사용
- 인라인 스타일로 DESIGN.md 토큰 하드코딩 — CSS 변수로 추출

---

## 7. Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `useState is not defined` | Server Component에서 훅 사용 | 파일 상단에 `'use client'` 추가 |
| `window is not defined` | Server Component에서 브라우저 API 접근 | Client Component로 분리 또는 `typeof window !== 'undefined'` 체크 |
| Chart not rendering | Lightweight Charts in Server Component | 컴포넌트를 별도 파일로 분리하고 `'use client'` 선언 |
| Tailwind classes not working | v3 vs v4 문법 혼용 | `globals.css`에서 `@import "tailwindcss"` 사용 |
| Font not loading | `next/font` 설정 누락 | `layout.tsx`에서 `next/font/google`로 Geist import |

---

## 8. File Structure Convention

```
src/
├── app/
│   ├── (main)/
│   │   ├── page.tsx              # 메인 대시보드
│   │   ├── stock/[code]/
│   │   │   └── page.tsx          # 국내 종목 상세
│   │   ├── stocks/page.tsx       # 국내 전체 종목 카탈로그
│   │   └── overseas-stocks/
│   │       ├── page.tsx          # 해외 종목 카탈로그
│   │       └── [ticker]/page.tsx  # 해외 종목 상세
│   ├── login/page.tsx            # 로그인
│   ├── signup/page.tsx           # 회원가입
│   ├── onboarding/page.tsx       # 온보딩 (투자성향)
│   ├── layout.tsx                # 루트 레이아웃
│   └── globals.css               # Tailwind + 토큰
├── components/
│   ├── stocks/                   # 국내 주식 컴포넌트
│   ├── overseas/                 # 해외 주식 컴포넌트
│   ├── StockChart.tsx            # Lightweight Charts (Client)
│   ├── Sparkline.tsx
│   ├── Navbar.tsx
│   └── AuthGuard.tsx
├── hooks/
│   ├── useInView.ts
│   ├── useStockPriceStream.ts
│   └── useVisibility.ts
├── lib/
│   ├── api.ts
│   ├── fetcher.ts
│   ├── auth.tsx
│   ├── websocket.ts
│   └── sectorMap.ts
├── services/
│   ├── stockCatalogApi.ts
│   └── overseasStockApi.ts
├── types/
│   ├── stock.ts
│   ├── overseasStock.ts
│   └── websocket.ts
├── provider/
│   └── WebSocketProvider.tsx
└── constants/
    └── countryFlags.ts
```

---

> 본 문서는 `stock-frontend` 내 **기술 패턴**을 다룹니다.
> 프로젝트 전체 맥락은 [../AGENT.md](../AGENT.md) 및 [../../AGENT.md](../../AGENT.md)를 참조하세요.
