# AGENT.md - stock-frontend

> AI 뉴스 기반 주식 추천 서비스의 **프론트엔드 웹 애플리케이션** (Next.js 16 App Router)

---

## 1. 프로젝트 개요

- **역할:** 주식 대시보드, AI 추천 종목 표시, 뉴스 기반 감성 분석 결과 시각화
- **통신:** Spring Boot Core API (`http://localhost:8080/api/v1`) 와 HTTP 통신
- **특징:** SEO 최적화(SSR), 실시간 주가 차트, 투자성향 기반 추천 UI

---

## 2. 기술 스택

| 기술 | 버전 | 역할 |
|------|------|------|
| Next.js | 16.2.6 | App Router, SSR/SSG, API Route |
| React | 19.2.4 | UI 라이브러리 |
| TypeScript | ^5 | 타입 안정성 |
| Tailwind CSS | ^4 | 유틸리티 퍼스트 스타일링 |
| Lightweight Charts | ^5.2.0 | 주식 차트 (TradingView 제공) |
| Lucide React | ^1.16.0 | 아이콘 |

---

## 3. 프로젝트 구조

```
stock-frontend/
├── src/
│   ├── app/                # Next.js App Router (Page, Layout, Route)
│   │   ├── layout.tsx      # 루트 레이아웃 (Geist 폰트, Tailwind)
│   │   ├── page.tsx        # 메인 대시보드 (SSR)
│   │   ├── globals.css     # Tailwind 지시문 + 디자인 토큰
│   │   └── ...
│   └── components/         # React 컴포넌트
│       ├── StockChart.tsx  # Lightweight Charts 래퍼 (Client Component)
│       └── ...
├── public/                 # 정적 자원
├── next.config.ts          # Next.js 설정
└── SKILL.md                # 기술 패턴 및 사용법 상세 가이드
```

---

## 4. 핵심 설계 전략

### Server / Client 컴포넌트 분리
- **Server Component (`page.tsx`):** 메인 대시보드 레이아웃, 주식 데이터 표시 (SEO)
- **Client Component (`StockChart.tsx`):** `'use client'` 선언 후 차트 렌더링
- **규칙:** Server Component에서 직접 `fetch()` 호출, Client Component에서는 Hook/이벤트 처리

### 디자인 시스템 연동
- **상세 토큰:** `../DESIGN.md` 참조 (색상, 타이포그래피, 컴포넌트)
- **Tailwind 통합:** `globals.css`에서 DESIGN.md 토큰을 CSS 변수 또는 `@theme`로 확장

---

## 5. 시작 방법

```bash
cd FE/stock-frontend
npm install        # 최초 1회
npm run dev        # 개발 서버 (localhost:3000)
npm run build      # 프로덕션 빌드
npm run lint       # ESLint 검사
```

---

## 6. 연동 정보

| 서비스 | 주소 | 설명 |
|--------|------|------|
| Next.js dev | `http://localhost:3000` | 프론트엔드 개발 서버 |
| Core API | `http://localhost:8080/api/v1` | Spring Boot 메인 API |
| AI Server | `http://localhost:8000` | FastAPI (직접 호출 지양) |

---

## 7. 참고 문서

- **기술 패턴:** [SKILL.md](SKILL.md) — Next.js 16 App Router, Tailwind v4, Lightweight Charts 구체적 사용법
- **디자인 시스템:** [../DESIGN.md](../DESIGN.md) — Meta Design System 토큰 정의
- **프로젝트 전체:** [../../AGENT.md](../../AGENT.md) — Git 브랜치 전략, 커밋 규칙

---

> 본 문서는 `stock-frontend` 전용입니다.
> ⚠️ Next.js 16 버전은 학습 데이터와 다를 수 있으므로, 반드시 `node_modules/next/dist/docs/` 공식 문서를 우선 참조하세요.
