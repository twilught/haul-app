const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

// Create MySQL connection pool
const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'haul_app'
});

// Initialize Express app
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 🧩 Helper: Run MySQL query as Promise
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    pool.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
}

// 🟢 Root test endpoint
app.get('/', (req, res) => {
  res.send('🚀 Haul API is running');
});

// 🟢 Get all rounds with order count
app.get('/rounds', async (req, res) => {
  try {
    const rounds = await query(`
      SELECT r.*, COUNT(o.id) AS order_count
      FROM rounds r
      LEFT JOIN orders o ON r.id = o.round_id
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `);
    res.json(rounds);
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

// 🟢 Create a new round (by Runner)
app.post('/rounds', async (req, res) => {
  const { title, store, notes, cutoff_time, max_orders } = req.body;
  try {
    const sql = `
      INSERT INTO rounds (title, store, notes, cutoff_time, max_orders)
      VALUES (?, ?, ?, ?, ?)
    `;
    await query(sql, [title, store, notes, cutoff_time, max_orders]);
    res.status(201).json({ message: 'Round created successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to create round');
  }
});

// 🟢 Lock a round (prevent new orders)
app.post('/rounds/:id/lock', async (req, res) => {
  try {
    const { id } = req.params;
    await query(`UPDATE rounds SET status='LOCKED' WHERE id=?`, [id]);
    res.json({ message: `Round ${id} locked` });
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to lock round');
  }
});

// 🟢 Close a round (mark complete)
app.post('/rounds/:id/close', async (req, res) => {
  try {
    const { id } = req.params;
    await query(`UPDATE rounds SET status='CLOSED' WHERE id=?`, [id]);
    res.json({ message: `Round ${id} closed` });
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to close round');
  }
});

// 🟢 Get orders for a specific round
app.get('/rounds/:id/orders', async (req, res) => {
  const { id } = req.params;
  try {
    const orders = await query(`SELECT * FROM orders WHERE round_id=?`, [id]);
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to fetch orders');
  }
});

// 🟢 Add new order (by Buyer)
app.post('/orders', async (req, res) => {
  const { round_id, buyer_name, item, qty, size, sweetness, ice, remark, dropoff_point } = req.body;

  try {
    const sql = `
      INSERT INTO orders (round_id, buyer_name, item, qty, size, sweetness, ice, remark, dropoff_point)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await query(sql, [
      round_id,
      buyer_name,
      item,
      qty || 1,
      size || null,
      sweetness || null,
      ice || null,
      remark || null,
      dropoff_point || null
    ]);
    res.status(201).json({ message: 'Order added successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to add order');
  }
});

// 🧩 Error handling
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

// 🟢 Start server
const port = process.env.PORT || 5000;
app.listen(port, '0.0.0.0', () => {
  console.log(`API listening on port ${port}`);
});
