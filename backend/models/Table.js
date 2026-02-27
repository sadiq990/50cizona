const db = require('../database');

const Table = {
    getAll() {
        const tables = db.prepare(`
      SELECT t.*, 
        s.id as active_session_id,
        s.total_amount as current_amount,
        s.started_at as session_started_at
      FROM tables t
      LEFT JOIN sessions s ON s.table_id = t.id AND s.status = 'active'
      ORDER BY t.number
    `).all();
        return tables;
    },

    getById(id) {
        return db.prepare(`
      SELECT t.*, 
        s.id as active_session_id,
        s.total_amount as current_amount,
        s.started_at as session_started_at
      FROM tables t
      LEFT JOIN sessions s ON s.table_id = t.id AND s.status = 'active'
      WHERE t.id = ?
    `).get(id);
    },

    updateStatus(id, status) {
        db.prepare('UPDATE tables SET status = ? WHERE id = ?').run(status, id);
        return this.getById(id);
    }
};

module.exports = Table;
