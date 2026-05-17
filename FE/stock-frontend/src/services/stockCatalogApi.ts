import { fetcher, API_BASE_URL, parseSign } from '@/lib/fetcher';
import { mapStockPrice } from '@/lib/api';
import type { MappedStockPrice, StockPriceResponse } from '@/lib/api';
import type { StockCatalogResponse, StockCatalogWithPriceResponse, StockCatalogItem } from '@/types/stock';

export function extractInitialPricesFromCatalog(
  data: StockCatalogWithPriceResponse
): Record<string, MappedStockPrice> {
  const prices: Record<string, MappedStockPrice> = {};
  for (const item of data.content) {
    if (item.currentPrice == null) continue;
    const sign = item.changeSign ?? '3';
    const parsed = parseSign(sign);
    prices[item.stockCode] = {
      price: parseFloat(item.currentPrice) || 0,
      change: parseFloat(item.change ?? '0') || 0,
      changeRate: parseFloat(item.changeRate ?? '0') || 0,
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
}): Promise<StockCatalogResponse> {
  const sp = new URLSearchParams();
  if (params.page !== undefined) sp.set('page', String(params.page));
  if (params.size !== undefined) sp.set('size', String(params.size));
  if (params.marketType) sp.set('marketType', params.marketType);
  if (params.sector) sp.set('sector', params.sector);
  if (params.sign) sp.set('sign', params.sign);
  if (params.sort) sp.set('sort', params.sort);
  const qs = sp.toString();
  return fetcher<StockCatalogResponse>(`${API_BASE_URL}/api/stocks${qs ? `?${qs}` : ''}`);
}

export async function searchStocks(params: {
  query: string;
  page?: number;
  size?: number;
}): Promise<StockCatalogResponse> {
  const sp = new URLSearchParams();
  sp.set('query', params.query);
  if (params.page !== undefined) sp.set('page', String(params.page));
  if (params.size !== undefined) sp.set('size', String(params.size));
  return fetcher<StockCatalogResponse>(`${API_BASE_URL}/api/stocks/search?${sp.toString()}`);
}

export async function getTrendingStocks(): Promise<StockCatalogItem[]> {
  return fetcher<StockCatalogItem[]>(`${API_BASE_URL}/api/stocks/trending`);
}

export async function getSectors(marketType?: string): Promise<string[]> {
  const sp = new URLSearchParams();
  if (marketType) sp.set('marketType', marketType);
  const qs = sp.toString();
  return fetcher<string[]>(`${API_BASE_URL}/api/stocks/sectors${qs ? `?${qs}` : ''}`);
}

const BATCH_CHUNK_SIZE = 50;

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export async function getBatchPrices(stockCodes: string[]): Promise<Record<string, MappedStockPrice>> {
  const chunks = chunkArray(stockCodes, BATCH_CHUNK_SIZE);
  const results = await Promise.all(
    chunks.map((chunk) =>
      fetcher<Record<string, StockPriceResponse>>(`${API_BASE_URL}/api/stocks/prices`, {
        method: 'POST',
        body: JSON.stringify({ stockCodes: chunk }),
      })
    )
  );
  const result: Record<string, MappedStockPrice> = {};
  for (const raw of results) {
    for (const [code, priceRaw] of Object.entries(raw)) {
      const mapped = mapStockPrice(priceRaw);
      if (mapped) result[code] = mapped;
    }
  }
  return result;
}