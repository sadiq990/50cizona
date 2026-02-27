const db = require('../database');
const bcrypt = require('bcryptjs');

const User = {
    findByUsername(username) {
        return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    },

    authenticate(username, password) {
        const user = this.findByUsername(username);
        if (!user) return null;
        const valid = bcrypt.compareSync(password, user.password);
        if (!valid) return null;
        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
    },

    create(username, password, role = 'waiter') {
        const hash = bcrypt.hashSync(password, 10);
        const result = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(username, hash, role);
        return { id: result.lastInsertRowid, username, role };
    },

    getAll() {
        return db.prepare('SELECT id, username, role, created_at FROM users').all();
    }
};

module.exports = User;
