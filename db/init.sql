-- Fresh schema for Haul App (Rounds & Orders)

CREATE TABLE IF NOT EXISTS rounds (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  store VARCHAR(120),
  dropoff_point VARCHAR(120),
  notes VARCHAR(255),
  cutoff_time DATETIME,
  max_orders INT DEFAULT 10,
  status ENUM('OPEN','LOCKED','CLOSED') NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  round_id INT NOT NULL,
  buyer_name VARCHAR(100) NOT NULL,
  item VARCHAR(200) NOT NULL,
  qty INT NOT NULL DEFAULT 1,
  size VARCHAR(10),
  sweetness VARCHAR(10),
  ice VARCHAR(10),
  remark VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_round FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_orders_round ON orders(round_id);
