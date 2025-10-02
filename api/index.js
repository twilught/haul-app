const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Connect MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'db',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'secret',
  database: process.env.DB_NAME || 'haul_app'
});

// Health check
app.get('/', (req, res) => {
  res.send('🚀 Haul API is running');
});

// Create round
app.post('/rounds', (req, res) => {
  const { title, cutoff_time, max_orders } = req.body;
  pool.query(
    'INSERT INTO rounds (title, cutoff_time, max_orders) VALUES (?, ?, ?)',
    [title, cutoff_time, max_orders],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: results.insertId, title, cutoff_time, max_orders });
    }
  );
});

// List rounds
app.get('/rounds', (req, res) => {
  pool.query('SELECT * FROM rounds', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Join order
app.post('/orders', (req, res) => {
  const { round_id, buyer_name, item } = req.body;
  pool.query(
    'INSERT INTO orders (round_id, buyer_name, item) VALUES (?, ?, ?)',
    [round_id, buyer_name, item],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: results.insertId, round_id, buyer_name, item });
    }
  );
});

// List orders
app.get('/orders', (req, res) => {
  pool.query('SELECT * FROM orders', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

const port = process.env.PORT || 5000;
app.listen(port, '0.0.0.0', () => {
  console.log(`API listening on port ${port}`);
});
