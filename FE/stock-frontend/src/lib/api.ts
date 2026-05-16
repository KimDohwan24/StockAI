const API_BASE_URL = typeof window !== 'undefined'
  ? ''  // 브라우저에서는 상대 경로 → Next.js rewrite 활용 (CORS 회피)
  : (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080');

// 디버깅용: 실제 요청 Base URL 확인
console.log('[API_BASE_URL]', typeof window !== 'undefined' ? '(browser / relative)' : API_BASE_URL);

// ═══════════════════════════════════════════════════════════
//  Types — Raw backend responses
// ═══════════════════════════════════════════════════════════

/** GET /api/stocks/{stockCode}/price */
export interface StockPriceResponse {
  rprs_mrkt_kor_name: string;   // 대표시장한글명 (KOSPI/KOSDAQ)
  hts_kor_isnm: string;         // HTS한글종목명
  stck_prpr: string;            // 주식현재가
  prdy_vrss: string;            // 전일대비
  prdy_vrss_sign: string;       // 전일대비부호 (1:상한 2:상승 3:보합 4:하락 5:하한)
  prdy_ctrt: string;            // 전일대비율
  stck_oprc: string;            // 주식시가
  stck_hgpr: string;            // 주식최고가
  stck_lwpr: string;            // 주식최저가
  stck_mxpr: string;            // 상한가
  stck_llmn: string;            // 하한가
  stck_sdpr: string;            // 주식기준가 (전일종가)
  acml_vol: string;             // 누적거래량
  acml_tr_pbmn: string;         // 누적거래대금
  w52_hgpr: string;             // 52주 최고가
  w52_lwpr: string;             // 52주 최저가
  per: string;                  // PER
  pbr: string;                  // PBR
  eps: string;                  // EPS
  bps: string;                  // BPS
  hts_avls: string;             // HTS시가총액 (억원)
}

/** POST /api/stocks/daily → 개별 아이템 */
export interface DailyPriceItem {
  stck_bsop_date: string;       // 영업일 YYYYMMDD
  stck_clpr: string;            // 주식종가
  stck_oprc: string;            // 주식시가
  stck_hgpr: string;            // 주식최고가
  stck_lwpr: string;            // 주식최저가
  acml_vol: string;             // 누적거래량
  acml_tr_pbmn: string;         // 누적거래대금
  prdy_vrss: string;            // 전일대비
  prdy_vrss_sign: string;       // 전일대비부호
  prdy_ctrt: string;            // 전일대비율
  flng_cls_code: string;        // 락구분코드
  prtt_rate: string;            // 분할비율
  mod_yn: string;               // 변경여부
  prdy_vol: string;             // 전일거래량
}

/** GET /api/stocks/{stockCode}/minute → 개별 아이템 */
export interface MinutePriceItem {
  stck_bsop_date: string;       // 영업일 YYYYMMDD
  stck_cntg_hour: string;       // 주식체결시간 HHMMSS
  stck_prpr: string;            // 주식현재가
  stck_oprc: string;            // 주식시가
  stck_hgpr: string;            // 주식최고가
  stck_lwpr: string;            // 주식최저가
  cntg_vol: string;             // 체결거래량
  acml_vol: string;             // 누적거래량
  acml_tr_pbmn: string;         // 누적거래대금
}

// ═══════════════════════════════════════════════════════════
//  Frontend-friendly mapped types
// ═══════════════════════════════════════════════════════════

export interface MappedStockPrice {
  // 파싱된 숫자값
  price: number;
  change: number;
  changeRate: number;
  open: number;
  high: number;
  low: number;
  upperLimit: number;
  lowerLimit: number;
  basePrice: number;
  volume: number;
  volumeValue: number;
  w52High: number;
  w52Low: number;
  per: number;
  pbr: number;
  eps: number;
  bps: number;
  marketCap: number; // 억원

  // 문자 원본
  marketName: string;
  stockName: string;
  sign: string; // 1~5

  // UI 유틸
  isUp: boolean;
  isDown: boolean;
  isLimitUp: boolean;
  isLimitDown: boolean;
}

export interface MappedDailyCandle {
  date: string;        // YYYYMMDD
  time: string;        // chart용 ISO yyyy-mm-dd
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  value: number;
  change: number;
  changeRate: number;
  sign: string;
}

export interface MappedMinuteCandle {
  time: string;        // chart용 ISO with time
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  value: number;
}

// ═══════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════

function num(s: string | undefined | null): number {
  if (!s) return 0;
  const v = parseFloat(s.replace(/,/g, ''));
  return Number.isNaN(v) ? 0 : v;
}

/** 전일대비부호 → 상승/하락/보합 판정 */
function parseSign(sign: string) {
  const s = sign?.trim() ?? '';
  const isUp = s === '1' || s === '2';
  const isDown = s === '4' || s === '5';
  const isLimitUp = s === '1';
  const isLimitDown = s === '5';
  return { isUp, isDown, isLimitUp, isLimitDown };
}

export function mapStockPrice(raw: StockPriceResponse): MappedStockPrice {
  const signInfo = parseSign(raw.prdy_vrss_sign);
  const rawChange = num(raw.prdy_vrss);
  const rawChangeRate = num(raw.prdy_ctrt);
  const change = signInfo.isDown ? -Math.abs(rawChange) : Math.abs(rawChange);
  const changeRate = signInfo.isDown ? -Math.abs(rawChangeRate) : Math.abs(rawChangeRate);
  return {
    marketName: raw.rprs_mrkt_kor_name ?? '',
    stockName: raw.hts_kor_isnm ?? '',
    price: num(raw.stck_prpr),
    change,
    changeRate,
    open: num(raw.stck_oprc),
    high: num(raw.stck_hgpr),
    low: num(raw.stck_lwpr),
    upperLimit: num(raw.stck_mxpr),
    lowerLimit: num(raw.stck_llmn),
    basePrice: num(raw.stck_sdpr),
    volume: num(raw.acml_vol),
    volumeValue: num(raw.acml_tr_pbmn),
    w52High: num(raw.w52_hgpr),
    w52Low: num(raw.w52_lwpr),
    per: num(raw.per),
    pbr: num(raw.pbr),
    eps: num(raw.eps),
    bps: num(raw.bps),
    marketCap: num(raw.hts_avls),
    sign: raw.prdy_vrss_sign ?? '',
    ...signInfo,
  };
}

export function mapDailyCandles(raw: DailyPriceItem[]): MappedDailyCandle[] {
  return raw
    .map((d) => {
      const date = d.stck_bsop_date ?? '';
      const time =
        date.length === 8
          ? `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`
          : date;
      return {
        date,
        time,
        open: num(d.stck_oprc),
        high: num(d.stck_hgpr),
        low: num(d.stck_lwpr),
        close: num(d.stck_clpr),
        volume: num(d.acml_vol),
        value: num(d.acml_tr_pbmn),
        change: num(d.prdy_vrss),
        changeRate: num(d.prdy_ctrt),
        sign: d.prdy_vrss_sign ?? '',
      };
    })
    .reverse();
}

export function mapMinuteCandles(raw: MinutePriceItem[]): MappedMinuteCandle[] {
  return raw
    .map((d) => {
      const date = d.stck_bsop_date ?? '';
      const hour = d.stck_cntg_hour ?? '';
      const time =
        date.length === 8 && hour.length === 6
          ? `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T${hour.slice(0, 2)}:${hour.slice(2, 4)}:${hour.slice(4, 6)}`
          : `${date}T${hour}`;
      return {
        time,
        open: num(d.stck_oprc),
        high: num(d.stck_hgpr),
        low: num(d.stck_lwpr),
        close: num(d.stck_prpr),
        volume: num(d.cntg_vol),
        value: num(d.acml_tr_pbmn),
      };
    })
    .reverse();
}

async function fetcher<T>(url: string, init?: RequestInit, retries = 1): Promise<T> {
  console.log('[API Request]', init?.method || 'GET', url);
  let lastErr: Error;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      console.log(`[API Retry] ${attempt}/${retries} for ${url}`);
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }

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

      const retryable = [403, 429, 502, 503];
      if (retryable.includes(res.status) && attempt < retries) {
        console.warn(`[API Retry Trigger] ${res.status} on ${url}, will retry...`);
        lastErr = new Error(`API Error ${res.status}: ${text || res.statusText}`);
        continue;
      }

      console.error('[API Error Body]', text.slice(0, 500));

      let hint = '';
      if (res.status === 403) hint = ' → 인증/권한 문제입니다. API 키, CORS 설정, 또는 방화벽을 확인하세요.';
      if (res.status === 404) hint = ' → 요청한 API 엔드포인트가 BE에 없습니다. 경로와 HTTP 메소드를 확인하세요.';
      if (res.status === 500) hint = ' → BE 서버 내부 에러입니다. BE 로그를 확인하세요.';
      if (res.status === 502 || res.status === 503) hint = ' → BE 서버가 응답하지 않거나, Next.js rewrite 대상이 잘못되었습니다.';

      throw new Error(`API Error ${res.status}: ${text || res.statusText}${hint}`);
    }

    return res.json();
  }

  throw lastErr!;
}

// ═══════════════════════════════════════════════════════════
//  APIs
// ═══════════════════════════════════════════════════════════

export interface DailyRequest {
  stockCode: string;
  period: 'D' | 'W' | 'M' | 'Y';
  startDate: string; // "20250101"
  endDate: string;   // "20250516"
}

/** GET /api/stocks/{stockCode}/price — 현재가 단건 조회 */
export async function getStockPrice(stockCode: string): Promise<MappedStockPrice> {
  const raw = await fetcher<StockPriceResponse>(`${API_BASE_URL}/api/stocks/${stockCode}/price`);
  return mapStockPrice(raw);
}

/** POST /api/stocks/daily — 일/주/월/연 캔들 조회 */
export async function getDailyCandles(body: DailyRequest): Promise<MappedDailyCandle[]> {
  const raw = await fetcher<DailyPriceItem[]>(`${API_BASE_URL}/api/stocks/daily`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return mapDailyCandles(raw);
}

/** GET /api/stocks/{stockCode}/minute — 당일 분봉 조회 */
export async function getMinuteCandles(stockCode: string): Promise<MappedMinuteCandle[]> {
  const raw = await fetcher<MinutePriceItem[]>(`${API_BASE_URL}/api/stocks/${stockCode}/minute`);
  return mapMinuteCandles(raw);
}
