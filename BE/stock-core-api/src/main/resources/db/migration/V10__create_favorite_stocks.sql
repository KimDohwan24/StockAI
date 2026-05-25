CREATE TABLE IF NOT EXISTS favorite_stocks (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    stock_code VARCHAR(20) NOT NULL,
    stock_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_favorite_stocks_user_stock UNIQUE (user_id, stock_code)
);

CREATE INDEX IF NOT EXISTS idx_favorite_stocks_user_id ON favorite_stocks (user_id);
