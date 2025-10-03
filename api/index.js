const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// MySQL pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'db',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'secret',
  database: process.env.DB_NAME || 'haul_app',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Simple helper to query with promise
function q(sql, params = []) {
  return new Promise((resolve, reject) => {
    pool.query(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

// Health
app.get('/', (_req, res) => res.send('🚀 Haul API is running'));

// Create round
app.post('/rounds', async (req, res) => {
  try {
    const { title, store, dropoff_point, notes, cutoff_time, max_orders } = req.body;
    if (!title || !cutoff_time) return res.status(400).json({ error: 'title & cutoff_time required' });
    const sql = `
      INSERT INTO rounds (title, store, dropoff_point, notes, cutoff_time, max_orders, status)
      VALUES (?, ?, ?, ?, ?, ?, 'OPEN')
    `;
    const r = await q(sql, [
      title,
      store || null,
      dropoff_point || null,
      notes || null,
      cutoff_time,
      max_orders || 10
    ]);
    res.json({ id: r.insertId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// List rounds (include order_count)
app.get('/rounds', async (_req, res) => {
  try {
    const sql = `
      SELECT r.*,
        (SELECT COUNT(*) FROM orders o WHERE o.round_id = r.id) AS order_count
      FROM rounds r
      ORDER BY r.created_at DESC, r.id DESC
    `;
    const rows = await q(sql);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Lock round
app.post('/rounds/:id/lock', async (req, res) => {
  try {
    const id = req.params.id;
    const r = await q('UPDATE rounds SET status="LOCKED" WHERE id=? AND status="OPEN"', [id]);
    res.json({ locked: r.affectedRows > 0 });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Close round
app.post('/rounds/:id/close', async (req, res) => {
  try {
    const id = req.params.id;
    const r = await q('UPDATE rounds SET status="CLOSED" WHERE id=? AND status IN ("OPEN","LOCKED")', [id]);
    res.json({ closed: r.affectedRows > 0 });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// List orders (optional filter by round_id)
app.get('/orders', async (req, res) => {
  try {
    const { round_id } = req.query;
    let rows;
    if (round_id) {
      rows = await q('SELECT * FROM orders WHERE round_id=? ORDER BY created_at DESC, id DESC', [round_id]);
    } else {
      rows = await q('SELECT * FROM orders ORDER BY created_at DESC, id DESC');
    }
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Create order
app.post('/orders', async (req, res) => {
  try {
    const { round_id, buyer_name, item, qty, size, sweetness, ice, remark } = req.body;
    if (!round_id || !buyer_name || !item) {
      return res.status(400).json({ error: 'round_id, buyer_name, item required' });
    }
    // check round exists and OPEN and under max limit
    const rows = await q(`
      SELECT id, status, max_orders,
        (SELECT COUNT(*) FROM orders WHERE round_id = ?) AS c
      FROM rounds WHERE id=?
    `, [round_id, round_id]);
    if (!rows.length) return res.status(404).json({ error: 'round not found' });
    const r = rows[0];
    if (r.status !== 'OPEN') return res.status(400).json({ error: 'round is not OPEN' });
    if (r.max_orders && r.c >= r.max_orders) return res.status(400).json({ error: 'round is full' });

    const ins = `
      INSERT INTO orders (round_id, buyer_name, item, qty, size, sweetness, ice, remark)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await q(ins, [
      round_id, buyer_name, item, qty || 1, size || null, sweetness || null, ice || null, remark || null
    ]);
    res.json({ id: result.insertId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

const port = process.env.PORT || 5000;
app.listen(port, '0.0.0.0', () => {
  console.log(`API listening on port ${port}`);
});
