const API_BASE_URL = typeof window !== 'undefined'
  ? ''  // 브라우저에서는 상대 경로 → Next.js rewrite 활용 (CORS 회피)
  : (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080');

// 디버깅용: 실제 요청 Base URL 확인
console.log('[API_BASE_URL]', typeof window !== 'undefined' ? '(browser / relative)' : API_BASE_URL);

// ── Types ───────────────────────────────────────────────

export interface DailyCandle {
  date: string;      // "20250516"
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MinuteCandle {
  time: string;      // "HHmmss" or ISO
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockPriceResponse {
  stockCode: string;
  price: number;
  change: number;
  changeRate: number;
}

export interface DailyRequest {
  stockCode: string;
  period: 'D' | 'W' | 'M' | 'Y';
  startDate: string; // "20250101"
  endDate: string;   // "20250516"
}

// ── Helpers ──────────────────────────────────────────────

async function fetcher<T>(url: string, init?: RequestInit): Promise<T> {
  console.log('[API Request]', init?.method || 'GET', url);
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
    });
  } catch (networkErr) {
    console.error('[API Network Error]', url, networkErr);
    throw new Error(
      `Network Error: BE 서버(${API_BASE_URL || '/api'})에 연결할 수 없습니다.\n` +
      '1) BE 서버가 실행 중인지 확인하세요.\n' +
      '2) NEXT_PUBLIC_API_BASE_URL 환경변수가 올바른지 확인하세요.'
    );
  }

  console.log('[API Response]', res.status, res.statusText, url);

  if (!res.ok) {
    let text = '';
    try {
      text = await res.text();
    } catch {
      text = '';
    }
    console.error('[API Error Body]', text.slice(0, 500));

    // 친절한 에러 메시지
    let hint = '';
    if (res.status === 404) hint = ' → 요청한 API 엔드포인트가 BE에 없습니다. 경로와 HTTP 메소드를 확인하세요.';
    if (res.status === 500) hint = ' → BE 서버 내부 에러입니다. BE 로그를 확인하세요.';
    if (res.status === 502 || res.status === 503) hint = ' → BE 서버가 응답하지 않거나, Next.js rewrite 대상이 잘못되었습니다.';

    throw new Error(`API Error ${res.status}: ${text || res.statusText}${hint}`);
  }

  return res.json();
}

// ── APIs ─────────────────────────────────────────────────

/**
 * GET /api/stocks/{stockCode}/price
 * 현재가 단건 조회
 */
export function getStockPrice(stockCode: string) {
  return fetcher<StockPriceResponse>(`${API_BASE_URL}/api/stocks/${stockCode}/price`);
}

/**
 * POST /api/stocks/daily
 * 일봉 / 주봉 / 월봉 / 연봉 캔들 조회
 */
export function getDailyCandles(body: DailyRequest) {
  return fetcher<DailyCandle[]>(`${API_BASE_URL}/api/stocks/daily`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * GET /api/stocks/{stockCode}/minute
 * 분봉 캔들 조회
 */
export function getMinuteCandles(stockCode: string) {
  return fetcher<MinuteCandle[]>(`${API_BASE_URL}/api/stocks/${stockCode}/minute`);
}
