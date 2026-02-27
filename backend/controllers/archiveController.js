const db = require('../database');

// GET /api/archive/months  → available months list
exports.getMonths = (req, res) => {
  try {
    // Get distinct months from both sessions and expenses
    const sessionMonths = db.prepare(`
      SELECT DISTINCT strftime('%Y-%m', ended_at) AS month
      FROM sessions
      WHERE status = 'closed' AND ended_at IS NOT NULL
    `).all().map(r => r.month).filter(Boolean);

    const expenseMonths = db.prepare(`
      SELECT DISTINCT strftime('%Y-%m', date) AS month
      FROM expenses
    `).all().map(r => r.month).filter(Boolean);

    // Merge and sort descending
    const all = [...new Set([...sessionMonths, ...expenseMonths])].sort().reverse();

    res.json({ months: all });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/archive/:month  → full breakdown for YYYY-MM
exports.getMonth = (req, res) => {
  try {
    const month = req.params.month; // e.g. "2026-02"
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'Invalid month format, use YYYY-MM' });
    }

    // ── Revenue (closed sessions) ────────────────────────────────────────────
    const revRow = db.prepare(`
      SELECT
        COUNT(*)                         AS session_count,
        ROUND(SUM(total_amount), 2)      AS total_revenue,
        ROUND(AVG(total_amount), 2)      AS avg_bill,
        ROUND(MAX(total_amount), 2)      AS max_bill
      FROM sessions
      WHERE status = 'closed'
        AND strftime('%Y-%m', ended_at) = ?
    `).get(month);

    // ── Expenses ──────────────────────────────────────────────────────────────
    const expRow = db.prepare(`
      SELECT ROUND(SUM(amount), 2) AS total_expenses, COUNT(*) AS expense_count
      FROM expenses
      WHERE strftime('%Y-%m', date) = ?
    `).get(month);

    // ── Expenses by category ─────────────────────────────────────────────────
    const expByCategory = db.prepare(`
      SELECT category, ROUND(SUM(amount), 2) AS total, COUNT(*) AS cnt
      FROM expenses
      WHERE strftime('%Y-%m', date) = ?
      GROUP BY category
      ORDER BY total DESC
    `).all(month);

    // ── Top products ──────────────────────────────────────────────────────────
    const topProducts = db.prepare(`
      SELECT
        p.name,
        p.category,
        SUM(oi.quantity)                        AS total_qty,
        ROUND(SUM(oi.quantity * oi.unit_price), 2) AS total_revenue
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      JOIN sessions s ON s.id = oi.session_id
      WHERE s.status = 'closed'
        AND strftime('%Y-%m', s.ended_at) = ?
      GROUP BY oi.product_id
      ORDER BY total_qty DESC
      LIMIT 20
    `).all(month);

    // ── Expense detail list ───────────────────────────────────────────────
    const expenses = db.prepare(`
          SELECT id, date, category, description, ROUND(amount, 2) AS amount
          FROM expenses
          WHERE strftime('%Y-%m', date) = ?
          ORDER BY date DESC
        `).all(month);

    // ── Daily breakdown ───────────────────────────────────────────────────────
    const dailyBreakdown = db.prepare(`
      SELECT
        date(s.ended_at)                AS day,
        COUNT(s.id)                     AS sessions,
        ROUND(SUM(s.total_amount), 2)   AS revenue,
        COALESCE((
          SELECT ROUND(SUM(e.amount), 2)
          FROM expenses e
          WHERE date(e.date) = date(s.ended_at)
        ), 0)                           AS expenses
      FROM sessions s
      WHERE s.status = 'closed'
        AND strftime('%Y-%m', s.ended_at) = ?
      GROUP BY date(s.ended_at)
      ORDER BY day DESC
    `).all(month);

    // ── All closed sessions with items ────────────────────────────────────────
    const sessions = db.prepare(`
      SELECT
        s.id,
        t.number   AS table_number,
        s.started_at,
        s.ended_at,
        s.total_amount,
        u.username AS waiter,
        ROUND((strftime('%s', s.ended_at) - strftime('%s', s.started_at)) / 60.0) AS duration_min
      FROM sessions s
      JOIN tables t ON t.id = s.table_id
      LEFT JOIN users u ON u.id = s.waiter_id
      WHERE s.status = 'closed'
        AND strftime('%Y-%m', s.ended_at) = ?
      ORDER BY s.ended_at DESC
    `).all(month);

    const itemStmt = db.prepare(`
      SELECT p.name AS product_name, oi.quantity, oi.unit_price,
             ROUND(oi.quantity * oi.unit_price, 2) AS line_total
      FROM order_items oi JOIN products p ON p.id = oi.product_id
      WHERE oi.session_id = ?
      ORDER BY p.name
    `);
    const sessionsWithItems = sessions.map(s => ({ ...s, items: itemStmt.all(s.id) }));

    res.json({
      month,
      summary: {
        session_count: revRow.session_count || 0,
        total_revenue: revRow.total_revenue || 0,
        avg_bill: revRow.avg_bill || 0,
        max_bill: revRow.max_bill || 0,
        total_expenses: expRow.total_expenses || 0,
        expense_count: expRow.expense_count || 0,
        net_profit: Math.round(((revRow.total_revenue || 0) - (expRow.total_expenses || 0)) * 100) / 100,
      },
      expByCategory,
      expenses,
      dailyBreakdown,
      sessions: sessionsWithItems,
    });
  } catch (err) {
    console.error('Archive error:', err);
    res.status(500).json({ error: err.message });
  }
};
