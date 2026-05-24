-- 1. 유저 테이블 컬럼 추가
ALTER TABLE users ADD COLUMN ai_trading_enabled BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE users ADD COLUMN risk_profile VARCHAR(20) DEFAULT 'MEDIUM' NOT NULL; -- HIGH, MEDIUM, LOW

-- 2. 주문 체결 내역 테이블 생성
CREATE TABLE IF NOT EXISTS order_history (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    ticker VARCHAR(20) NOT NULL,
    stock_name VARCHAR(100) NOT NULL,
    order_type VARCHAR(10) NOT NULL, -- BUY, SELL
    quantity INT NOT NULL,
    price DOUBLE PRECISION NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
    ordered_by VARCHAR(10) NOT NULL DEFAULT 'USER', -- USER, AI
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_history_user_id ON order_history (user_id);
