ALTER TABLE orders
  ADD COLUMN dropoff_point VARCHAR(120) NULL AFTER buyer_name;

ALTER TABLE rounds
  DROP COLUMN IF EXISTS dropoff_point;
