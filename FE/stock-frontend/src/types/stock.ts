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
  priceUpdatedAt: string | null;
}

export interface StockCatalogWithPriceResponse {
  content: StockCatalogWithPrice[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
}

export interface StockCatalogResponse {
  content: StockCatalogItem[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
}