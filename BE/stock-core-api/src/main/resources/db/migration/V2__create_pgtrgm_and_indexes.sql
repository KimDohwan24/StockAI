CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_stocks_name_trgm ON stocks USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_overseas_name_trgm ON overseas_stocks USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_overseas_ticker_trgm ON overseas_stocks USING gin (ticker gin_trgm_ops);