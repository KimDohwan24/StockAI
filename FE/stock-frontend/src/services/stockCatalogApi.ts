import type { MappedStockPrice, StockPriceResponse } from '@/lib/api';
import { mapStockPrice } from '@/lib/api';
import { API_BASE_URL, fetcher, parseSign } from '@/lib/fetcher';
import type { StockCatalogWithPriceResponse } from '@/types/stock';

export interface TrendingResponse {
  stockCode: string;
  name: string;
  marketType: string;
  currentPrice: string;
  changeValue: string;
  changeSign: string;
  changeRate: string;
  volume: string;
  marketCap: string | null;
}

export function extractInitialPricesFromCatalog(
  data: StockCatalogWithPriceResponse
): Record<string, MappedStockPrice> {
  const prices: Record<string, MappedStockPrice> = {};
  for (const item of data.content) {
    if (item.currentPrice == null) continue;
    const sign = item.changeSign ?? '3';
    const parsed = parseSign(sign);
    const rawChange = parseFloat(item.change ?? '0') || 0;
    const rawChangeRate = parseFloat(item.changeRate ?? '0') || 0;
    const change = parsed.isDown ? -Math.abs(rawChange) : Math.abs(rawChange);
    const changeRate = parsed.isDown ? -Math.abs(rawChangeRate) : Math.abs(rawChangeRate);

    prices[item.stockCode] = {
      price: parseFloat(item.currentPrice) || 0,
      change,
      changeRate,
      open: 0,
      high: 0,
      low: 0,
      upperLimit: 0,
      lowerLimit: 0,
      basePrice: 0,
      volume: parseFloat(item.volume ?? '0') || 0,
      volumeValue: 0,
      w52High: 0,
      w52Low: 0,
      per: 0,
      pbr: 0,
      eps: 0,
      bps: 0,
      marketCap: parseFloat(item.marketCap ?? '0') || 0,
      marketName: '',
      stockName: item.name,
      sign,
      ...parsed,
    };
  }
  return prices;
}

export async function getStocks(params: {
  page?: number;
  size?: number;
  marketType?: string;
  sector?: string;
  sign?: string;
  sort?: string;
}): Promise<StockCatalogWithPriceResponse> {
  const sp = new URLSearchParams();
  if (params.page !== undefined) sp.set('page', String(params.page));
  if (params.size !== undefined) sp.set('size', String(params.size));
  if (params.marketType) sp.set('marketType', params.marketType);
  if (params.sector) sp.set('sector', params.sector);
  if (params.sign) sp.set('sign', params.sign);
  
  if (params.sort) {
    const [field, dir] = params.sort.includes(',') ? params.sort.split(',') : [params.sort, 'asc'];
    let mappedSort = params.sort;
    if (field === 'upperLimit') {
      mappedSort = `changeRate,${dir}`;
    } else if (field === 'lowerLimit') {
      const mappedDir = dir === 'asc' ? 'desc' : 'asc';
      mappedSort = `changeRate,${mappedDir}`;
    }
    sp.set('sort', mappedSort);
  }
  const qs = sp.toString();
  return fetcher<StockCatalogWithPriceResponse>(`${API_BASE_URL}/api/stocks${qs ? `?${qs}` : ''}`);
}

export async function searchStocks(params: {
  query: string;
  page?: number;
  size?: number;
}): Promise<StockCatalogWithPriceResponse> {
  const sp = new URLSearchParams();
  sp.set('query', params.query);
  if (params.page !== undefined) sp.set('page', String(params.page));
  if (params.size !== undefined) sp.set('size', String(params.size));
  return fetcher<StockCatalogWithPriceResponse>(`${API_BASE_URL}/api/stocks/search?${sp.toString()}`);
}

export async function getTrendingStocks(): Promise<TrendingResponse[]> {
  return fetcher<TrendingResponse[]>(`${API_BASE_URL}/api/trending/domestic`);
}

export async function getBatchStockPrices(stockCodes: string[]): Promise<Record<string, MappedStockPrice>> {
  const results = await Promise.allSettled(
    stockCodes.map(async (code) => {
      const raw = await fetcher<StockPriceResponse>(`${API_BASE_URL}/api/stocks/${code}/price`);
      const mapped = mapStockPrice(raw);
      return [code, mapped] as const;
    }),
  );
  const prices: Record<string, MappedStockPrice> = {};
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value[1]) {
      prices[r.value[0]] = r.value[1];
    }
  }
  return prices;
}

export async function getSectors(marketType?: string): Promise<string[]> {
  const sp = new URLSearchParams();
  if (marketType) sp.set('marketType', marketType);
  const qs = sp.toString();
  return fetcher<string[]>(`${API_BASE_URL}/api/stocks/sectors${qs ? `?${qs}` : ''}`);
}

