import logging
import FinanceDataReader as fdr
import pandas as pd

logger = logging.getLogger(__name__)

class StockMasterService:
    def get_domestic_stocks(self) -> list[dict]:
        """
        FinanceDataReader를 사용해 KRX(KOSPI, KOSDAQ) 전체 상장 종목 목록을 가져옵니다.
        """
        try:
            logger.info("Fetching domestic stock master from KRX via FinanceDataReader...")
            df = fdr.StockListing('KRX')
            
            stocks = []
            for _, row in df.iterrows():
                market = str(row.get('Market', 'KOSPI'))
                if market not in ['KOSPI', 'KOSDAQ']:
                    continue  # KONEX 등은 제외
                    
                code = str(row.get('Code', ''))
                name = str(row.get('Name', ''))
                sector = str(row.get('Sector', '기타')) if pd.notna(row.get('Sector')) else '기타'
                
                # KIS DTO (KisStockMasterItem) 필드명에 맞춤
                stocks.append({
                    "sht_cd": code,
                    "kor_abbrv": name,
                    "kor_sect_tp_cd": sector,
                    "marketType": market
                })
            
            logger.info(f"Successfully fetched {len(stocks)} domestic stocks from KRX")
            return stocks
        except Exception as e:
            logger.error(f"Failed to fetch domestic stocks from KRX: {str(e)}")
            return []

    def get_overseas_stocks(self) -> list[dict]:
        """
        FinanceDataReader를 사용해 NASDAQ 및 NYSE 전체 상장 종목 목록을 가져옵니다.
        """
        try:
            logger.info("Fetching US stock master (NASDAQ + NYSE) via FinanceDataReader...")
            stocks = []
            
            # 1. NASDAQ 상장 종목 전체
            try:
                df_nas = fdr.StockListing('NASDAQ')
                for _, row in df_nas.iterrows():
                    ticker = str(row.get('Symbol', ''))
                    name = str(row.get('Name', ''))
                    # FinanceDataReader returns 'Industry' not 'Sector'
                    industry = row.get('Industry', None)
                    sector = str(industry) if industry is not None and pd.notna(industry) and str(industry).strip() else 'Other'
                    if not ticker or ticker.strip() == "" or ticker == 'nan':
                        continue
                    stocks.append({
                        "symb": ticker,
                        "item_name": name,
                        "kor_sect_nm": sector,
                        "tr_natn_cd": "US",
                        "crcy_cd": "USD",
                        "exchangeCode": "NAS"
                    })
            except Exception as e_nas:
                logger.error(f"Failed to fetch NASDAQ stocks: {str(e_nas)}")
                
            # 2. NYSE 상장 종목 전체
            try:
                df_nys = fdr.StockListing('NYSE')
                for _, row in df_nys.iterrows():
                    ticker = str(row.get('Symbol', ''))
                    name = str(row.get('Name', ''))
                    # FinanceDataReader returns 'Industry' not 'Sector'
                    industry = row.get('Industry', None)
                    sector = str(industry) if industry is not None and pd.notna(industry) and str(industry).strip() else 'Other'
                    if not ticker or ticker.strip() == "" or ticker == 'nan':
                        continue
                    stocks.append({
                        "symb": ticker,
                        "item_name": name,
                        "kor_sect_nm": sector,
                        "tr_natn_cd": "US",
                        "crcy_cd": "USD",
                        "exchangeCode": "NYS"
                    })
            except Exception as e_nys:
                logger.error(f"Failed to fetch NYSE stocks: {str(e_nys)}")
                
            logger.info(f"Successfully fetched {len(stocks)} US stocks from NASDAQ and NYSE")
            return stocks
        except Exception as e:
            logger.error(f"Failed to fetch US stocks from S&P500: {str(e)}")
            return []
