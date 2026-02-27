const db = require('../database');

const Template = {
    getAll() {
        return db.prepare('SELECT * FROM expense_templates ORDER BY name').all();
    },

    add(name, category, price) {
        const result = db.prepare(
            'INSERT INTO expense_templates (name, category, price) VALUES (?, ?, ?)'
        ).run(name, category, price || 0);
        return { id: result.lastInsertRowid, name, category, price };
    },

    delete(id) {
        db.prepare('DELETE FROM expense_templates WHERE id = ?').run(id);
        return { success: true };
    }
};

module.exports = Template;
