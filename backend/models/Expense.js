const db = require('../database');

const Expense = {
    add(description, category, amount, date, userId, userName) {
        const result = db.prepare(
            'INSERT INTO expenses (description, category, amount, date, added_by, added_by_name) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(description, category, amount, date || new Date().toISOString().split('T')[0], userId, userName);
        return this.getById(result.lastInsertRowid);
    },

    getById(id) {
        return db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
    },

    update(id, data) {
        const fields = [];
        const values = [];
        if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
        if (data.category !== undefined) { fields.push('category = ?'); values.push(data.category); }
        if (data.amount !== undefined) { fields.push('amount = ?'); values.push(data.amount); }
        if (data.date !== undefined) { fields.push('date = ?'); values.push(data.date); }
        if (fields.length === 0) return this.getById(id);
        values.push(id);
        db.prepare(`UPDATE expenses SET ${fields.join(', ')} WHERE id = ?`).run(...values);
        return this.getById(id);
    },

    delete(id) {
        db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
        return { success: true };
    },

    getAll(limit = 100) {
        return db.prepare('SELECT * FROM expenses ORDER BY date DESC, created_at DESC LIMIT ?').all(limit);
    },

    getDaily() {
        const expenses = db.prepare(`
      SELECT * FROM expenses 
      WHERE date = date('now', 'localtime')
      ORDER BY created_at DESC
    `).all();

        const summary = db.prepare(`
      SELECT 
        COALESCE(SUM(amount), 0) as total,
        COUNT(*) as count
      FROM expenses 
      WHERE date = date('now', 'localtime')
    `).get();

        const byCategory = db.prepare(`
      SELECT category, SUM(amount) as total, COUNT(*) as count
      FROM expenses 
      WHERE date = date('now', 'localtime')
      GROUP BY category
      ORDER BY total DESC
    `).all();

        return { expenses, summary, byCategory };
    },

    getWeekly() {
        const expenses = db.prepare(`
      SELECT * FROM expenses 
      WHERE date >= date('now', '-7 days', 'localtime')
      ORDER BY date DESC, created_at DESC
    `).all();

        const summary = db.prepare(`
      SELECT 
        COALESCE(SUM(amount), 0) as total,
        COUNT(*) as count
      FROM expenses 
      WHERE date >= date('now', '-7 days', 'localtime')
    `).get();

        const byCategory = db.prepare(`
      SELECT category, SUM(amount) as total, COUNT(*) as count
      FROM expenses 
      WHERE date >= date('now', '-7 days', 'localtime')
      GROUP BY category
      ORDER BY total DESC
    `).all();

        const byDay = db.prepare(`
      SELECT date, SUM(amount) as total, COUNT(*) as count
      FROM expenses 
      WHERE date >= date('now', '-7 days', 'localtime')
      GROUP BY date
      ORDER BY date
    `).all();

        return { expenses, summary, byCategory, byDay };
    },

    getMonthly() {
        const expenses = db.prepare(`
      SELECT * FROM expenses 
      WHERE date >= date('now', '-30 days', 'localtime')
      ORDER BY date DESC, created_at DESC
    `).all();

        const summary = db.prepare(`
      SELECT 
        COALESCE(SUM(amount), 0) as total,
        COUNT(*) as count
      FROM expenses 
      WHERE date >= date('now', '-30 days', 'localtime')
    `).get();

        const byCategory = db.prepare(`
      SELECT category, SUM(amount) as total, COUNT(*) as count
      FROM expenses 
      WHERE date >= date('now', '-30 days', 'localtime')
      GROUP BY category
      ORDER BY total DESC
    `).all();

        const byDay = db.prepare(`
      SELECT date, SUM(amount) as total, COUNT(*) as count
      FROM expenses 
      WHERE date >= date('now', '-30 days', 'localtime')
      GROUP BY date
      ORDER BY date
    `).all();

        return { expenses, summary, byCategory, byDay };
    },

    getCategories() {
        const custom = db.prepare('SELECT name FROM expense_categories ORDER BY name').all().map(c => c.name);
        const defaults = ['Ərzaq', 'İşçi heyəti', 'Kommunal', 'Digər'];
        return [...new Set([...defaults, ...custom])];
    },

    addCategory(name) {
        try {
            db.prepare('INSERT OR IGNORE INTO expense_categories (name) VALUES (?)').run(name);
            return { success: true };
        } catch (e) {
            return { success: true }; // ignore duplicates
        }
    },

    getTotalExpenses() {
        const result = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM expenses').get();
        return result.total;
    },

    getDailyTotal() {
        const result = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total 
      FROM expenses 
      WHERE date = date('now', 'localtime')
    `).get();
        return result.total;
    }
};

module.exports = Expense;
