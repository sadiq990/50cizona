const db = require('../database');

const Product = {
    getAll() {
        return db.prepare('SELECT * FROM products ORDER BY category, name').all();
    },

    getActive() {
        return db.prepare('SELECT * FROM products WHERE is_active = 1 ORDER BY category, name').all();
    },

    getById(id) {
        return db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    },

    create(name, price, category = 'general') {
        const result = db.prepare('INSERT INTO products (name, price, category) VALUES (?, ?, ?)').run(name, price, category);
        return this.getById(result.lastInsertRowid);
    },

    update(id, data) {
        const fields = [];
        const values = [];
        if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
        if (data.price !== undefined) { fields.push('price = ?'); values.push(data.price); }
        if (data.category !== undefined) { fields.push('category = ?'); values.push(data.category); }
        if (fields.length === 0) return this.getById(id);
        values.push(id);
        db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`).run(...values);
        return this.getById(id);
    },

    deactivate(id) {
        const product = this.getById(id);
        const newStatus = product.is_active ? 0 : 1;
        db.prepare('UPDATE products SET is_active = ? WHERE id = ?').run(newStatus, id);
        return this.getById(id);
    }
};

module.exports = Product;
