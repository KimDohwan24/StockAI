import {
  API_BASE_URL,
  ApiError,
  fetcher,
  getAuthHeader,
  num,
  parseSign,
} from '@/lib/fetcher';

export { API_BASE_URL, ApiError, fetcher, getAuthHeader, num, parseSign };

// ═══════════════════════════════════════════════════════════
//  Types — Raw backend responses
// ═══════════════════════════════════════════════════════════

/** GET /api/stocks/{stockCode}/price */
export interface StockPriceResponse {
  error?: string;
  rprs_mrkt_kor_name: string;
  hts_kor_isnm: string;
  stck_prpr: string;
  prdy_vrss: string;
  prdy_vrss_sign: string;
  prdy_ctrt: string;
  stck_oprc: string;
  stck_hgpr: string;
  stck_lwpr: string;
  stck_mxpr: string;
  stck_llmn: string;
  stck_sdpr: string;
  acml_vol: string;
  acml_tr_pbmn: string;
  w52_hgpr: string;
  w52_lwpr: string;
  per: string;
  pbr: string;
  eps: string;
  bps: string;
  hts_avls: string;
}

/** POST /api/stocks/daily → 개별 아이템 */
export interface DailyPriceItem {
  stck_bsop_date: string;
  stck_clpr: string;
  stck_oprc: string;
  stck_hgpr: string;
  stck_lwpr: string;
  acml_vol: string;
  acml_tr_pbmn: string;
  prdy_vrss: string;
  prdy_vrss_sign: string;
  prdy_ctrt: string;
  flng_cls_code: string;
  prtt_rate: string;
  mod_yn: string;
  prdy_vol: string;
}

/** GET /api/stocks/{stockCode}/minute → 개별 아이템 */
export interface MinutePriceItem {
  stck_bsop_date: string;
  stck_cntg_hour: string;
  stck_prpr: string;
  stck_oprc: string;
  stck_hgpr: string;
  stck_lwpr: string;
  cntg_vol: string;
  acml_vol: string;
  acml_tr_pbmn: string;
}

// ═══════════════════════════════════════════════════════════
//  Frontend-friendly mapped types
// ═══════════════════════════════════════════════════════════

export interface MappedStockPrice {
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
  marketCap: number;
  marketName: string;
  stockName: string;
  sign: string;
  isUp: boolean;
  isDown: boolean;
  isLimitUp: boolean;
  isLimitDown: boolean;
}

export interface MappedDailyCandle {
  date: string;
  time: string;
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
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  value: number;
}

// ═══════════════════════════════════════════════════════════
//  Auth / Portfolio / Order Types
// ═══════════════════════════════════════════════════════════

export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
}

export interface PortfolioResponse {
  id: number;
  userId: number;
  initialBalance: number;
  cashBalance: number;
  totalAssetValue: number;
  createdAt: string;
}

export interface HoldingResponse {
  id: number;
  stockCode: string;
  stockName: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  profitLoss: number;
  profitRate: number;
}

export interface TradeResponse {
  id: number;
  stockCode: string;
  stockName: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  totalAmount: number;
  createdAt: string;
}

export interface OrderResult {
  stockCode: string;
  stockName: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  totalAmount: number;
}

// ═══════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════

export function mapStockPrice(raw: StockPriceResponse): MappedStockPrice | null {
  if (raw.error) return null;
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
  if (!raw || !Array.isArray(raw)) return [];

  const mapped = raw
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
    .filter((candle) => candle.close > 0);

  // Sort by time ascending (mandatory for lightweight-charts)
  mapped.sort((a, b) => a.time.localeCompare(b.time));

  // Deduplicate timestamps to prevent rendering glitches
  const uniqueMapped: MappedMinuteCandle[] = [];
  const seenTimes = new Set<string>();
  for (const candle of mapped) {
    if (!seenTimes.has(candle.time)) {
      seenTimes.add(candle.time);
      uniqueMapped.push(candle);
    }
  }

  return uniqueMapped;
}

// ═══════════════════════════════════════════════════════════
//  APIs
// ═══════════════════════════════════════════════════════════

export interface DailyRequest {
  stockCode: string;
  period: 'D' | 'W' | 'M' | 'Y';
  startDate: string;
  endDate: string;
}

/** GET /api/stocks/{stockCode}/price — 현재가 단건 조회 */
export async function getStockPrice(stockCode: string): Promise<MappedStockPrice | null> {
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

// ═══════════════════════════════════════════════════════════
//  Auth APIs
// ═══════════════════════════════════════════════════════════

export async function signup(email: string, password: string, name: string): Promise<string> {
  const res = await fetcher<string>(`${API_BASE_URL}/api/auth/signup`, {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
  return res;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  return fetcher<LoginResponse>(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

// ═══════════════════════════════════════════════════════════
//  Portfolio APIs
// ═══════════════════════════════════════════════════════════

export async function createPortfolio(initialBalance: number): Promise<PortfolioResponse> {
  return fetcher<PortfolioResponse>(`${API_BASE_URL}/api/portfolio`, {
    method: 'POST',
    body: JSON.stringify({ initialBalance }),
  });
}

export async function getPortfolio(): Promise<PortfolioResponse> {
  return fetcher<PortfolioResponse>(`${API_BASE_URL}/api/portfolio`);
}

export async function getHoldings(): Promise<HoldingResponse[]> {
  return fetcher<HoldingResponse[]>(`${API_BASE_URL}/api/portfolio/holdings`);
}

export async function getTrades(): Promise<TradeResponse[]> {
  return fetcher<TradeResponse[]>(`${API_BASE_URL}/api/portfolio/trades`);
}

// ═══════════════════════════════════════════════════════════
//  Order APIs
// ═══════════════════════════════════════════════════════════

export async function buyOrder(stockCode: string, quantity: number, price: number): Promise<OrderResult> {
  const raw = await fetcher<{ stockName?: string }>(`${API_BASE_URL}/api/orders/buy`, {
    method: 'POST',
    body: JSON.stringify({ stockCode, quantity, price }),
  });
  return {
    stockCode,
    stockName: raw.stockName || '',
    side: 'BUY',
    quantity,
    price,
    totalAmount: price * quantity,
  };
}

export async function sellOrder(stockCode: string, quantity: number, price: number): Promise<OrderResult> {
  const raw = await fetcher<{ stockName?: string }>(`${API_BASE_URL}/api/orders/sell`, {
    method: 'POST',
    body: JSON.stringify({ stockCode, quantity, price }),
  });
  return {
    stockCode,
    stockName: raw.stockName || '',
    side: 'SELL',
    quantity,
    price,
    totalAmount: price * quantity,
  };
}

// ═══════════════════════════════════════════════════════════
//  AI Recommendation & Analysis APIs
// ═══════════════════════════════════════════════════════════

export interface StockNewsItem {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number;
  confidence: number;
  stockCode?: string;
  stockName?: string;
}

export interface StockAiAnalysisResponse {
  score: number;
  signal: 'BUY' | 'HOLD' | 'SELL';
  reason: string;
  news: StockNewsItem[];
}

export interface DashboardRecommendationItem {
  stockCode: string;
  stockName: string;
  price: number;
  changeRate: number;
  aiScore: number;
  reason: string;
  marketType: 'DOMESTIC' | 'OVERSEAS';
}

export interface DashboardRecommendations {
  recommended: DashboardRecommendationItem[];
  avoided: DashboardRecommendationItem[];
}

/** GET /api/v1/stocks/{stockCode}/ai-analysis */
export async function getStockAiAnalysis(stockCode: string): Promise<StockAiAnalysisResponse> {
  return fetcher<StockAiAnalysisResponse>(`${API_BASE_URL}/api/v1/stocks/${stockCode}/ai-analysis`);
}

/** GET /api/v1/stocks/recommendations?market={market} */
export async function getDashboardRecommendations(market: 'DOMESTIC' | 'OVERSEAS'): Promise<DashboardRecommendations> {
  return fetcher<DashboardRecommendations>(`${API_BASE_URL}/api/v1/stocks/recommendations?market=${market}`);
}

/** GET /api/v1/stocks/news - AI가 분석한 수집 뉴스 모음 조회 */
export async function getAiNewsList(): Promise<StockNewsItem[]> {
  return fetcher<StockNewsItem[]>(`${API_BASE_URL}/api/v1/stocks/news`);
}

// ═══════════════════════════════════════════════════════════
//  User Profile APIs
// ═══════════════════════════════════════════════════════════

export interface UserProfileResponse {
  id: number;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  initialBalance: number;
  cashBalance: number;
  aiTradingEnabled: boolean;
  riskProfile: 'HIGH' | 'MEDIUM' | 'LOW';
  aiTradingAllocationRatio: number;
  mockOrderEnabled: boolean;
}

export interface OrderHistoryResponse {
  id: number;
  userId: number;
  ticker: string;
  stockName: string;
  orderType: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  amount: number;
  orderedBy: 'USER' | 'AI';
  reason?: string;
  createdAt: string;
}

export async function getUserProfile(): Promise<UserProfileResponse> {
  return fetcher<UserProfileResponse>(`${API_BASE_URL}/api/user/me`);
}

export async function updateUserProfile(name: string, initialBalance: number, cashBalance: number): Promise<UserProfileResponse> {
  return fetcher<UserProfileResponse>(`${API_BASE_URL}/api/user/me`, {
    method: 'PUT',
    body: JSON.stringify({ name, initialBalance, cashBalance }),
  });
}

// AI 자동 매매 환경설정 API
export async function updateAiConfig(enabled: boolean, riskProfile: string): Promise<UserProfileResponse> {
  return fetcher<UserProfileResponse>(
    `${API_BASE_URL}/api/user/me/ai-config?enabled=${enabled}&riskProfile=${riskProfile}`,
    { method: 'PUT' }
  );
}

// 주문 체결 내역 조회 API
export async function getOrderHistory(): Promise<OrderHistoryResponse[]> {
  return fetcher<OrderHistoryResponse[]>(`${API_BASE_URL}/api/orders/history`);
}

// ═══════════════════════════════════════════════════════════
//  Admin APIs
// ═══════════════════════════════════════════════════════════

export interface AdminAiStatusResponse {
  profile: UserProfileResponse;
  portfolio: PortfolioResponse;
  holdings: HoldingResponse[];
  orderHistory: OrderHistoryResponse[];
}

export async function getAdminAiStatus(): Promise<AdminAiStatusResponse[]> {
  return fetcher<AdminAiStatusResponse[]>(`${API_BASE_URL}/api/admin/ai-monitoring`);
}

export async function resetAiAccounts(): Promise<void> {
  await fetcher<void>(`${API_BASE_URL}/api/admin/ai-monitoring/reset`, {
    method: 'POST',
  });
}

export async function updateMockOrderConfig(enabled: boolean): Promise<SystemConfigResponse> {
  return fetcher<SystemConfigResponse>(`${API_BASE_URL}/api/admin/config/mock-order?enabled=${enabled}`, {
    method: 'POST',
  });
}

export async function toggleUserMockOrder(email: string, enabled: boolean): Promise<void> {
  await fetcher<void>(`${API_BASE_URL}/api/admin/users/${email}/mock-order?enabled=${enabled}`, {
    method: 'POST',
  });
}

export async function toggleUserAiTrading(email: string, enabled: boolean): Promise<void> {
  await fetcher<void>(`${API_BASE_URL}/api/admin/users/${email}/ai-trading?enabled=${enabled}`, {
    method: 'POST',
  });
}




// ═══════════════════════════════════════════════════════════
//  System Config APIs
// ═══════════════════════════════════════════════════════════

export interface SystemConfigResponse {
  mockOrderEnabled: boolean;
}

export async function getSystemConfig(): Promise<SystemConfigResponse> {
  return fetcher<SystemConfigResponse>(`${API_BASE_URL}/api/v1/stocks/config`);
}

export async function syncDomesticStocks(): Promise<number> {
  return fetcher<number>(`${API_BASE_URL}/api/stocks/sync`, {
    method: 'POST',
  });
}

export async function syncOverseasStocks(): Promise<number> {
  return fetcher<number>(`${API_BASE_URL}/api/overseas-stocks/sync`, {
    method: 'POST',
  });
}

export async function syncNaverNews(): Promise<number> {
  return fetcher<number>(`${API_BASE_URL}/api/admin/news/sync`, {
    method: 'POST',
  });
}

export async function updateUserInitialBalance(email: string, balance: number): Promise<void> {
  await fetcher<void>(`${API_BASE_URL}/api/admin/users/${email}/initial-balance?balance=${balance}`, {
    method: 'POST',
  });
}

// ═══════════════════════════════════════════════════════════
//  Favorites APIs
// ═══════════════════════════════════════════════════════════

export interface FavoriteStockResponse {
  stockCode: string;
  stockName: string;
  currentPrice: string;
  changeValue: string;
  changeRate: string;
  changeSign: string;
}

export async function getFavorites(): Promise<FavoriteStockResponse[]> {
  return fetcher<FavoriteStockResponse[]>(`${API_BASE_URL}/api/favorites`);
}

export async function getFavoriteStatus(stockCode: string): Promise<{ favorited: boolean }> {
  return fetcher<{ favorited: boolean }>(`${API_BASE_URL}/api/favorites/${stockCode}/status`);
}

export async function toggleFavorite(stockCode: string): Promise<{ favorited: boolean }> {
  return fetcher<{ favorited: boolean }>(`${API_BASE_URL}/api/favorites/${stockCode}/toggle`, {
    method: 'POST',
  });
}

// ═══════════════════════════════════════════════════════════
//  Notification APIs
// ═══════════════════════════════════════════════════════════

export interface NotificationResponse {
  id: number;
  userId: number;
  message: string;
  read: boolean;
  createdAt: string;
}

export async function getNotifications(): Promise<NotificationResponse[]> {
  return fetcher<NotificationResponse[]>(`${API_BASE_URL}/api/notifications`);
}

export async function getUnreadNotificationCount(): Promise<{ count: number }> {
  return fetcher<{ count: number }>(`${API_BASE_URL}/api/notifications/unread-count`);
}

export async function readAllNotifications(): Promise<void> {
  await fetcher<void>(`${API_BASE_URL}/api/notifications/read-all`, {
    method: 'POST',
  });
}