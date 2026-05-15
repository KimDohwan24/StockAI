from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi import status
import logging

logger = logging.getLogger(__name__)


class BaseAppException(Exception):
    def __init__(self, message: str, status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class SentimentAnalysisException(BaseAppException):
    def __init__(self, message: str = "감성 분석 중 오류가 발생했습니다."):
        super().__init__(message, status.HTTP_500_INTERNAL_SERVER_ERROR)


class StockMappingException(BaseAppException):
    def __init__(self, message: str = "종목 매핑 중 오류가 발생했습니다."):
        super().__init__(message, status.HTTP_500_INTERNAL_SERVER_ERROR)


class RecommendationException(BaseAppException):
    def __init__(self, message: str = "추천 생성 중 오류가 발생했습니다."):
        super().__init__(message, status.HTTP_500_INTERNAL_SERVER_ERROR)


async def global_exception_handler(request: Request, exc: BaseAppException):
    logger.error(f"Unhandled exception: {exc.message}", exc_info=True)
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message},
    )


async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unexpected error: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "서버 내부 오류가 발생했습니다."},
    )
