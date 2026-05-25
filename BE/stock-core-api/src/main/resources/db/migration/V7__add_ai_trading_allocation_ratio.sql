-- users 테이블에 AI 1회 거래당 예수금 비중 설정 컬럼 추가
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_trading_allocation_ratio DOUBLE PRECISION DEFAULT 0.10 NOT NULL;
