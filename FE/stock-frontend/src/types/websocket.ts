export interface RealtimeStockPriceDto {
  stockCode: string;
  stckPrpr: string;
  prdyVrss: string;
  prdyVrssSign: string;
  prdyCtrt: string;
  stckOprc: string;
  stckHgpr: string;
  stckLwpr: string;
  acmlVol: string;
  acmlTrPbmn: string;
  stckYmd: string;
  stckCntgHour: string;
}

export interface RealtimeOrderbookDto {
  stockCode: string;
  stckPrpr: string;
  prdyVrss: string;
  prdyVrssSign: string;
  askPrice1: string;
  askPrice2: string;
  askPrice3: string;
  askPrice4: string;
  askPrice5: string;
  askPrice6: string;
  askPrice7: string;
  askPrice8: string;
  askPrice9: string;
  askPrice10: string;
  bidPrice1: string;
  bidPrice2: string;
  bidPrice3: string;
  bidPrice4: string;
  bidPrice5: string;
  bidPrice6: string;
  bidPrice7: string;
  bidPrice8: string;
  bidPrice9: string;
  bidPrice10: string;
  askRem1: string;
  askRem2: string;
  askRem3: string;
  askRem4: string;
  askRem5: string;
  askRem6: string;
  askRem7: string;
  askRem8: string;
  askRem9: string;
  askRem10: string;
  bidRem1: string;
  bidRem2: string;
  bidRem3: string;
  bidRem4: string;
  bidRem5: string;
  bidRem6: string;
  bidRem7: string;
  bidRem8: string;
  bidRem9: string;
  bidRem10: string;
}

export type WebSocketConnectionState = 'connecting' | 'connected' | 'disconnected';