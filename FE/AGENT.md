# 📋 AGENT.md (Frontend Development Guide)

## 1. 기술 스택 및 선정 이유
| 기술 | 역할 | 선정 이유 |
| :--- | :--- | :--- |
| **Next.js (App Router)** | 프레임워크 | 주식 뉴스 및 종목 정보의 **SEO(검색 엔진 최적화)**와 빠른 초기 로딩(SSR)을 위해 채택 |
| **TypeScript** | 언어 | 주식 데이터, 사용자 성향 데이터 등 복잡한 데이터 구조의 **타입 안정성** 확보 |
| **TanStack Query (v5)** | 상태 관리 | 실시간 시세 및 뉴스 데이터의 **캐싱, 자동 리프레시, 로딩 상태 관리**에 최적화 |
| **Tailwind CSS** | 스타일링 | 유틸리티 퍼스트 방식으로 **빠른 UI 프로토타이핑** 및 유지보수 용이성 |
| **Shadcn/ui** | UI 컴포넌트 | 재사용 가능한 고품질 컴포넌트를 통해 일관된 디자인 시스템 구축 |
| **Lightweight Charts** | 차트 라이브러리 | TradingView 제공. 웹/모바일 환경에서 가장 가볍고 성능이 뛰어난 주식 차트 구현 |

---

## 2. 프론트엔드 아키텍처 (Project Structure)

```text
stock-frontend/
├── src/
│   ├── app/                # Next.js App Router (Page, Layout)
│   │   ├── (auth)/         # 로그인/회원가입 루틴
│   │   ├── dashboard/      # 메인 주식 대시보드
│   │   ├── recommend/      # 성향 기반 종목 추천 페이지
│   │   └── stock/[id]/     # 개별 종목 상세 페이지
│   ├── components/
│   │   ├── common/         # Button, Input, Modal 등 공통 컴포넌트
│   │   ├── charts/         # 주식 차트 관련 컴포넌트
│   │   └── recommend/      # 성향 테스트 및 결과 카드 컴포넌트
│   ├── hooks/              # 커스텀 훅 (useStockData, useUserPreference 등)
│   ├── services/           # API 호출 로직 (Axios/Fetch 인스턴스 및 엔드포인트)
│   ├── types/              # TypeScript 인터페이스 정의 (.ts)
│   └── lib/                # 유틸리티 함수 및 외부 라이브러리 설정
└── public/                 # 이미지, 아이콘 등 정적 자원
```

## 3. 핵심 기능 구현 가이드
1. 성향 분석 엔진: 설문지 형태의 UI를 제공하고 결과값(1~5단계 등)을 Spring BE로 전송.
2. 뉴스 감성 시각화: FastAPI에서 분석된 감성 점수(-1.0 ~ 1.0)를 '매수(Blue)' / '매도(Red)' 게이지 바 및 요약 텍스트로 렌더링.
3. 실시간 동기화: refetchInterval: 10000 (10초) 설정을 통해 사용자 액션 없이도 데이터 갱신.

## 4. 시작 방법
1. npm install
2. npm run dev
