const db = require('../database');

const Session = {
  start(tableId, waiterId) {
    // Check if table already has an active session
    const existing = db.prepare('SELECT * FROM sessions WHERE table_id = ? AND status = ?').get(tableId, 'active');
    if (existing) return { error: 'Bu masada artıq aktiv sessiya var' };

    const result = db.prepare('INSERT INTO sessions (table_id, waiter_id, status) VALUES (?, ?, ?)').run(tableId, waiterId, 'active');
    db.prepare('UPDATE tables SET status = ? WHERE id = ?').run('occupied', tableId);
    return this.getById(result.lastInsertRowid);
  },

  end(sessionId) {
    const session = this.getById(sessionId);
    if (!session) return { error: 'Sessiya tapılmadı' };

    // Calculate total
    const total = db.prepare('SELECT COALESCE(SUM(quantity * unit_price), 0) as total FROM order_items WHERE session_id = ?').get(sessionId);

    db.prepare('UPDATE sessions SET status = ?, ended_at = CURRENT_TIMESTAMP, total_amount = ? WHERE id = ?').run('closed', total.total, sessionId);
    db.prepare('UPDATE tables SET status = ? WHERE id = ?').run('available', session.table_id);

    return this.getById(sessionId);
  },

  getById(id) {
    return db.prepare(`
      SELECT s.*, t.number as table_number 
      FROM sessions s 
      JOIN tables t ON t.id = s.table_id 
      WHERE s.id = ?
    `).get(id);
  },

  getActive() {
    return db.prepare(`
      SELECT s.*, t.number as table_number 
      FROM sessions s 
      JOIN tables t ON t.id = s.table_id 
      WHERE s.status = 'active'
      ORDER BY s.started_at
    `).all();
  },

  getByTableId(tableId) {
    return db.prepare(`
      SELECT s.*, t.number as table_number 
      FROM sessions s 
      JOIN tables t ON t.id = s.table_id 
      WHERE s.table_id = ? 
      ORDER BY s.started_at DESC
    `).all(tableId);
  },

  getStats() {
    const today = new Date().toISOString().split('T')[0];

    const totalRevenue = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total 
      FROM sessions WHERE status = 'closed'
    `).get();

    const dailyOrders = db.prepare(`
      SELECT COUNT(*) as count 
      FROM sessions 
      WHERE date(started_at) = date('now', 'localtime')
    `).get();

    const topProducts = db.prepare(`
      SELECT p.name, SUM(oi.quantity) as total_qty, SUM(oi.quantity * oi.unit_price) as total_revenue
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      JOIN sessions s ON s.id = oi.session_id
      WHERE s.status = 'closed'
      GROUP BY oi.product_id
      ORDER BY total_qty DESC
      LIMIT 5
    `).all();

    const bestTable = db.prepare(`
      SELECT t.number, SUM(s.total_amount) as total_revenue
      FROM sessions s
      JOIN tables t ON t.id = s.table_id
      WHERE s.status = 'closed'
      GROUP BY s.table_id
      ORDER BY total_revenue DESC
      LIMIT 1
    `).get();

    const avgDuration = db.prepare(`
      SELECT AVG(
        (julianday(ended_at) - julianday(started_at)) * 24 * 60
      ) as avg_minutes
      FROM sessions 
      WHERE status = 'closed' AND ended_at IS NOT NULL
    `).get();

    // Expense totals
    const totalExpenses = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM expenses
    `).get();

    const dailyExpenses = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM expenses 
      WHERE date = date('now', 'localtime')
    `).get();

    const topExpenseCategory = db.prepare(`
      SELECT category, SUM(amount) as total
      FROM expenses 
      WHERE date = date('now', 'localtime')
      GROUP BY category
      ORDER BY total DESC
      LIMIT 1
    `).get();

    return {
      totalRevenue: totalRevenue.total,
      dailyOrders: dailyOrders.count,
      topProducts,
      bestTable: bestTable || { number: '-', total_revenue: 0 },
      avgDuration: avgDuration.avg_minutes ? Math.round(avgDuration.avg_minutes) : 0,
      totalExpenses: totalExpenses.total,
      dailyExpenses: dailyExpenses.total,
      netRevenue: totalRevenue.total - totalExpenses.total,
      topExpenseCategory: topExpenseCategory || { category: '-', total: 0 }
    };
  }
};

module.exports = Session;
