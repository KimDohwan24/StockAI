from fastapi import APIRouter, Depends
from app.core.dependencies import get_stock_master_service
from app.services.stock_master_service import StockMasterService

router = APIRouter(prefix="/api/v1/ai/stocks/master", tags=["master"])

@router.get("/domestic", summary="KRX 국내 주식 전체 리스트 조회")
def get_domestic_stocks(service: StockMasterService = Depends(get_stock_master_service)):
    return service.get_domestic_stocks()

@router.get("/overseas", summary="S&P500 해외 주식 전체 리스트 조회")
def get_overseas_stocks(service: StockMasterService = Depends(get_stock_master_service)):
    return service.get_overseas_stocks()
