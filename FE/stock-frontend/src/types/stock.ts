export interface StockCatalogItem {
  stockCode: string;
  name: string;
  sector: string | null;
  marketType: 'KOSPI' | 'KOSDAQ';
}

export interface StockCatalogWithPrice extends StockCatalogItem {
  currentPrice: string | null;
  change: string | null;
  changeSign: string | null;
  changeRate: string | null;
  volume: string | null;
  marketCap: string | null;
}

export interface StockCatalogWithPriceResponse {
  content: StockCatalogWithPrice[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface StockCatalogResponse {
  content: StockCatalogItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}