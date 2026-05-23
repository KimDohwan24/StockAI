CREATE TABLE IF NOT EXISTS stocks (
    id BIGSERIAL PRIMARY KEY,
    stock_code VARCHAR(12) NOT NULL,
    name VARCHAR(100) NOT NULL,
    sector VARCHAR(50),
    market_type VARCHAR(10) NOT NULL,
    current_price VARCHAR(20),
    change_value VARCHAR(20),
    change_sign VARCHAR(5),
    change_rate VARCHAR(20),
    volume VARCHAR(20),
    market_cap VARCHAR(20),
    price_updated_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_stocks_stock_code UNIQUE (stock_code)
);

CREATE TABLE IF NOT EXISTS overseas_stocks (
    id BIGSERIAL PRIMARY KEY,
    ticker VARCHAR(20) NOT NULL,
    name VARCHAR(200) NOT NULL,
    exchange_code VARCHAR(10) NOT NULL,
    country VARCHAR(30) NOT NULL,
    sector VARCHAR(100),
    currency VARCHAR(5) NOT NULL,
    current_price VARCHAR(20),
    change_value VARCHAR(20),
    change_sign VARCHAR(5),
    change_rate VARCHAR(20),
    volume VARCHAR(20),
    price_updated_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_overseas_stocks_ticker_exchange UNIQUE (ticker, exchange_code)
);