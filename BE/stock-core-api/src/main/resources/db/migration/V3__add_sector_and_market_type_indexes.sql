CREATE INDEX IF NOT EXISTS idx_stocks_sector ON stocks (sector);
CREATE INDEX IF NOT EXISTS idx_stocks_market_type ON stocks (market_type);
CREATE INDEX IF NOT EXISTS idx_overseas_stocks_exchange_code ON overseas_stocks (exchange_code);