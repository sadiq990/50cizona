const db = require('../database');

// GET /api/sessions/history?period=daily|weekly|monthly|all
exports.getHistory = (req, res) => {
    try {
        const period = req.query.period || 'daily';

        let dateFilter = '';
        if (period === 'daily') {
            dateFilter = `AND date(s.ended_at) = date('now', 'localtime')`;
        } else if (period === 'weekly') {
            dateFilter = `AND date(s.ended_at) >= date('now', 'localtime', '-7 days')`;
        } else if (period === 'monthly') {
            dateFilter = `AND date(s.ended_at) >= date('now', 'localtime', '-30 days')`;
        }

        // Closed sessions
        const sessions = db.prepare(`
      SELECT
        s.id,
        t.number   AS table_number,
        s.started_at,
        s.ended_at,
        s.total_amount,
        s.status,
        u.username AS waiter,
        ROUND(
          (strftime('%s', s.ended_at) - strftime('%s', s.started_at)) / 60.0
        ) AS duration_min
      FROM sessions s
      JOIN tables t ON t.id = s.table_id
      LEFT JOIN users u ON u.id = s.waiter_id
      WHERE s.status = 'closed'
      ${dateFilter}
      ORDER BY s.ended_at DESC
      LIMIT 500
    `).all();

        // Fetch items for each session
        const itemStmt = db.prepare(`
      SELECT
        oi.product_id,
        p.name  AS product_name,
        oi.quantity,
        oi.unit_price,
        ROUND(oi.quantity * oi.unit_price, 2) AS line_total
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      WHERE oi.session_id = ?
      ORDER BY p.name
    `);

        const result = sessions.map(s => ({
            ...s,
            items: itemStmt.all(s.id),
        }));

        // Summary
        const totalRevenue = result.reduce((sum, s) => sum + (s.total_amount || 0), 0);
        const avgBill = result.length ? totalRevenue / result.length : 0;

        res.json({
            sessions: result,
            summary: {
                count: result.length,
                totalRevenue: Math.round(totalRevenue * 100) / 100,
                avgBill: Math.round(avgBill * 100) / 100,
            },
        });
    } catch (err) {
        console.error('History error:', err);
        res.status(500).json({ error: err.message });
    }
};
