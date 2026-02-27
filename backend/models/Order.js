const db = require('../database');

const Order = {
    add(sessionId, productId, quantity = 1) {
        const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(productId);
        if (!product) return { error: 'Məhsul tapılmadı və ya aktiv deyil' };

        // Check if same product already in this session
        const existing = db.prepare('SELECT * FROM order_items WHERE session_id = ? AND product_id = ?').get(sessionId, productId);

        if (existing) {
            const newQty = existing.quantity + quantity;
            if (newQty <= 0) {
                db.prepare('DELETE FROM order_items WHERE id = ?').run(existing.id);
            } else {
                db.prepare('UPDATE order_items SET quantity = ? WHERE id = ?').run(newQty, existing.id);
            }
        } else if (quantity > 0) {
            db.prepare('INSERT INTO order_items (session_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)').run(sessionId, productId, quantity, product.price);
        }

        // Update session total
        const total = db.prepare('SELECT COALESCE(SUM(quantity * unit_price), 0) as total FROM order_items WHERE session_id = ?').get(sessionId);
        db.prepare('UPDATE sessions SET total_amount = ? WHERE id = ?').run(total.total, sessionId);

        return this.getBySession(sessionId);
    },

    remove(sessionId, productId) {
        db.prepare('DELETE FROM order_items WHERE session_id = ? AND product_id = ?').run(sessionId, productId);

        // Update session total
        const total = db.prepare('SELECT COALESCE(SUM(quantity * unit_price), 0) as total FROM order_items WHERE session_id = ?').get(sessionId);
        db.prepare('UPDATE sessions SET total_amount = ? WHERE id = ?').run(total.total, sessionId);

        return this.getBySession(sessionId);
    },

    getBySession(sessionId) {
        return db.prepare(`
      SELECT oi.*, p.name as product_name, p.category,
        (oi.quantity * oi.unit_price) as line_total
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      WHERE oi.session_id = ?
      ORDER BY oi.created_at
    `).all(sessionId);
    },

    getTotal(sessionId) {
        const result = db.prepare('SELECT COALESCE(SUM(quantity * unit_price), 0) as total FROM order_items WHERE session_id = ?').get(sessionId);
        return result.total;
    }
};

module.exports = Order;
