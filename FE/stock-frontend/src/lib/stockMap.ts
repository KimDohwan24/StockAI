export const STOCK_NAME_MAP: Record<string, string> = {
  '005930': '삼성전자',
  '000660': 'SK하이닉스',
  '035420': '네이버',
  '035720': '카카오',
  '005380': '현대차',
  '373220': 'LG에너지솔루션',
  '068270': '셀트리온',
  '000270': '기아',

  // US stocks fallbacks (just in case)
  'AAPL': '애플',
  'TSLA': '테슬라',
  'MSFT': '마이크로소프트',
  'NVDA': '엔비디아',
  'AMZN': '아마존',
  'GOOGL': '구글',
  'META': '메타',
  'NFLX': '넷플릭스',
};

export function resolveStockName(code: string, originalName?: string): string {
  if (originalName && originalName !== code && !/^\d+$/.test(originalName)) {
    return originalName;
  }
  return STOCK_NAME_MAP[code] || originalName || code;
}
