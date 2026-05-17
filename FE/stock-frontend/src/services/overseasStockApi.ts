import { fetcher, API_BASE_URL, parseSign } from '@/lib/fetcher';
import type {
  OverseasStockCatalogItem,
  OverseasStockCatalogResponse,
  OverseasStockCatalogWithPriceResponse,
  OverseasStockPrice,
  OverseasOrderRequest,
  OverseasOrderResult,
  OverseasBalanceResponse,
} from '@/types/overseasStock';

export function extractOverseasInitialPricesFromCatalog(
  data: OverseasStockCatalogWithPriceResponse
): Record<string, OverseasStockPrice> {
  const prices: Record<string, OverseasStockPrice> = {};
  for (const item of data.content) {
    if (item.currentPrice == null) continue;
    const key = `${item.ticker}-${item.exchangeCode}`;
    prices[key] = {
      ticker: item.ticker,
      exchangeCode: item.exchangeCode,
      price: parseFloat(item.currentPrice) || 0,
      changeRate: parseFloat(item.changeRate ?? '0') || 0,
      changeSign: item.changeSign ?? '3',
      volume: parseFloat(item.volume ?? '0') || 0,
      openPrice: 0,
      highPrice: 0,
      lowPrice: 0,
      basePrice: parseFloat(item.currentPrice) || 0,
    };
  }
  return prices;
}

export async function getOverseasStocks(params: {
  page?: number;
  size?: number;
  exchangeCode?: string;
  country?: string;
  sector?: string;
  sort?: string;
}): Promise<OverseasStockCatalogResponse> {
  const sp = new URLSearchParams();
  if (params.page !== undefined) sp.set('page', String(params.page));
  if (params.size !== undefined) sp.set('size', String(params.size));
  if (params.exchangeCode) sp.set('exchangeCode', params.exchangeCode);
  if (params.country) sp.set('country', params.country);
  if (params.sector) sp.set('sector', params.sector);
  if (params.sort) sp.set('sort', params.sort);
  const qs = sp.toString();
  return fetcher<OverseasStockCatalogResponse>(`${API_BASE_URL}/api/overseas-stocks${qs ? `?${qs}` : ''}`);
}

export async function searchOverseasStocks(params: {
  query: string;
  page?: number;
  size?: number;
}): Promise<OverseasStockCatalogResponse> {
  const sp = new URLSearchParams();
  sp.set('query', params.query);
  if (params.page !== undefined) sp.set('page', String(params.page));
  if (params.size !== undefined) sp.set('size', String(params.size));
  return fetcher<OverseasStockCatalogResponse>(`${API_BASE_URL}/api/overseas-stocks/search?${sp.toString()}`);
}

export async function getOverseasStockPrice(ticker: string, exchangeCode: string): Promise<OverseasStockPrice> {
  const raw = await fetcher<Record<string, string>>(`${API_BASE_URL}/api/overseas-stocks/${ticker}/price?exchange=${exchangeCode}`);
  return {
    ticker: raw.symb ?? ticker,
    exchangeCode: raw.ovrs_icod ?? exchangeCode,
    price: parseFloat(raw.ovrs_nmix_prpr ?? '0'),
    changeRate: parseFloat(raw.prdy_ctrt ?? '0'),
    changeSign: raw.prdy_vrss_sign ?? '3',
    volume: parseFloat(raw.acml_vol ?? '0'),
    openPrice: parseFloat(raw.ovrs_oprc ?? '0'),
    highPrice: parseFloat(raw.ovrs_hgpr ?? '0'),
    lowPrice: parseFloat(raw.ovrs_lwpr ?? '0'),
    basePrice: parseFloat(raw.ovrs_nmix_prpr ?? '0'),
  };
}

export async function buyOverseasStock(request: OverseasOrderRequest): Promise<OverseasOrderResult> {
  const raw = await fetcher<Record<string, string>>(`${API_BASE_URL}/api/overseas-orders/buy`, {
    method: 'POST',
    body: JSON.stringify(request),
  });
  return {
    krxForwardingOrdOrgno: raw.KRX_FWDG_ORD_ORGNO ?? '',
    odno: raw.ODNO ?? '',
    ordTmd: raw.ORD_TMD ?? '',
  };
}

export async function sellOverseasStock(request: OverseasOrderRequest): Promise<OverseasOrderResult> {
  const raw = await fetcher<Record<string, string>>(`${API_BASE_URL}/api/overseas-orders/sell`, {
    method: 'POST',
    body: JSON.stringify(request),
  });
  return {
    krxForwardingOrdOrgno: raw.KRX_FWDG_ORD_ORGNO ?? '',
    odno: raw.ODNO ?? '',
    ordTmd: raw.ORD_TMD ?? '',
  };
}

export async function getOverseasBalance(): Promise<OverseasBalanceResponse> {
  const raw = await fetcher<Record<string, unknown>>(`${API_BASE_URL}/api/overseas-account/balance`);
  const items = Array.isArray(raw.output1) ? raw.output1 : [];
  const summary = (raw.output2 ?? {}) as Record<string, string>;
  return {
    output1: items.map((h: Record<string, string>) => ({
      ticker: h.ovrs_pdno ?? '',
      name: h.ovrs_item_name ?? '',
      exchangeCode: h.ovrs_excg_cd ?? '',
      quantity: parseInt(h.ovrs_cblc_qty ?? '0', 10),
      avgPrice: parseFloat(h.pchs_avg_pric ?? '0'),
      currentPrice: parseFloat(h.ovrs_stck_prpr ?? '0'),
      profitLoss: parseFloat(h.frcr_evlu_pfls_amt ?? '0'),
      profitLossRate: parseFloat(h.evlu_pfls_rt ?? '0'),
    })),
    output2: {
      totalEvaluatedAmount: parseFloat(summary.tot_evlu_amt ?? '0'),
      foreignCurrencyProfitLoss: parseFloat(summary.frcr_evlu_pfls_amt ?? '0'),
      totalForeignCurrencyProfitLoss: parseFloat(summary.tot_frcr_evlu_pfls_amt ?? '0'),
      totalPurchaseAmount: parseFloat(summary.ovrs_tot_pchs_amt ?? '0'),
      realizedProfitLoss: parseFloat(summary.ovrs_rlzt_pfls ?? '0'),
    },
  };
}

export async function getOverseasSectors(exchangeCode?: string): Promise<string[]> {
  const sp = new URLSearchParams();
  if (exchangeCode) sp.set('exchangeCode', exchangeCode);
  const qs = sp.toString();
  return fetcher<string[]>(`${API_BASE_URL}/api/overseas-stocks/sectors${qs ? `?${qs}` : ''}`);
}

export async function getTrendingOverseasStocks(): Promise<OverseasStockCatalogItem[]> {
  return fetcher<OverseasStockCatalogItem[]>(`${API_BASE_URL}/api/overseas-stocks/trending`);
}

export interface OverseasDailyCandle {
  dt: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function getOverseasDailyCandles(params: {
  ticker: string;
  exchangeCode: string;
  periodDivCode: string;
  startDate?: string;
  endDate?: string;
}): Promise<OverseasDailyCandle[]> {
  const raw = await fetcher<OverseasDailyCandle[]>(`${API_BASE_URL}/api/overseas-stocks/${params.ticker}/daily`, {
    method: 'POST',
    body: JSON.stringify({
      ticker: params.ticker,
      exchangeCode: params.exchangeCode,
      periodDivCode: params.periodDivCode,
      startDate: params.startDate,
      endDate: params.endDate,
    }),
  });
  return raw;
}

const BATCH_CHUNK_SIZE = 50;

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export async function getOverseasBatchPrices(
  requests: { ticker: string; exchangeCode: string }[]
): Promise<Record<string, OverseasStockPrice>> {
  const chunks = chunkArray(requests, BATCH_CHUNK_SIZE);
  const results = await Promise.all(
    chunks.map((chunk) =>
      fetcher<Record<string, Record<string, string>>>(`${API_BASE_URL}/api/overseas-stocks/prices`, {
        method: 'POST',
        body: JSON.stringify(chunk),
      })
    )
  );
  const result: Record<string, OverseasStockPrice> = {};
  for (const raw of results) {
    for (const [key, r] of Object.entries(raw)) {
      if (r.error) continue;
      const ticker = r.symb ?? key.split('-')[0];
      const exchangeCode = r.ovrs_icod ?? key.split('-')[1] ?? '';
      result[key] = {
        ticker,
        exchangeCode,
        price: parseFloat(r.ovrs_nmix_prpr ?? '0'),
        changeRate: parseFloat(r.prdy_ctrt ?? '0'),
        changeSign: r.prdy_vrss_sign ?? '3',
        volume: parseFloat(r.acml_vol ?? '0'),
        openPrice: parseFloat(r.ovrs_oprc ?? '0'),
        highPrice: parseFloat(r.ovrs_hgpr ?? '0'),
        lowPrice: parseFloat(r.ovrs_lwpr ?? '0'),
        basePrice: parseFloat(r.ovrs_nmix_prpr ?? '0'),
      };
    }
  }
  return result;
}