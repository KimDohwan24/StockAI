ALTER TABLE users ADD COLUMN IF NOT EXISTS initial_balance double precision DEFAULT 100000000.0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS cash_balance double precision DEFAULT 100000000.0;
