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

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'USER',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS portfolios (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    ticker VARCHAR(20) NOT NULL,
    stock_name VARCHAR(100) NOT NULL,
    quantity INT NOT NULL,
    avg_price DOUBLE PRECISION NOT NULL,
    exchange_code VARCHAR(10),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_portfolio_user_id ON portfolios (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolio_user_ticker ON portfolios (user_id, ticker);