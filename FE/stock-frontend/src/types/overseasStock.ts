export type ExchangeCode = 'NAS' | 'NYS' | 'AMS';
export type CountryCode = 'US';

export interface OverseasStockCatalogItem {
  ticker: string;
  name: string;
  exchangeCode: ExchangeCode;
  country: CountryCode;
  sector: string | null;
  currency: string;
}

export interface OverseasStockCatalogWithPrice extends OverseasStockCatalogItem {
  currentPrice: string | null;
  change: string | null;
  changeSign: string | null;
  changeRate: string | null;
  volume: string | null;
  priceUpdatedAt: string | null;
}

export interface OverseasStockCatalogWithPriceResponse {
  content: OverseasStockCatalogWithPrice[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
}

export interface OverseasStockCatalogResponse {
  content: OverseasStockCatalogItem[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
}

export interface OverseasStockPrice {
  ticker: string;
  exchangeCode: string;
  price: number;
  changeRate: number;
  changeSign: string;
  volume: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  basePrice: number;
}

export interface OverseasOrderRequest {
  ticker: string;
  exchangeCode: ExchangeCode;
  quantity: number;
  price: number;
}

export interface OverseasOrderResult {
  krxForwardingOrdOrgno: string;
  odno: string;
  ordTmd: string;
}

export interface OverseasBalanceItem {
  ticker: string;
  name: string;
  exchangeCode: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  profitLoss: number;
  profitLossRate: number;
}

export interface OverseasBalanceSummary {
  totalEvaluatedAmount: number;
  foreignCurrencyProfitLoss: number;
  totalForeignCurrencyProfitLoss: number;
  totalPurchaseAmount: number;
  realizedProfitLoss: number;
}

export interface OverseasBalanceResponse {
  output1: OverseasBalanceItem[];
  output2: OverseasBalanceSummary;
}