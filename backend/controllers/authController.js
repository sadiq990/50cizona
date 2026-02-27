const User = require('../models/User');

const authController = {
    login(req, res) {
        try {
            const { username, password } = req.body;
            if (!username || !password) {
                return res.status(400).json({ error: 'İstifadəçi adı və şifrə tələb olunur' });
            }
            const user = User.authenticate(username, password);
            if (!user) {
                return res.status(401).json({ error: 'Yanlış istifadəçi adı və ya şifrə' });
            }
            req.session.user = user;
            res.json({ success: true, user });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    logout(req, res) {
        req.session.destroy((err) => {
            if (err) return res.status(500).json({ error: 'Çıxış zamanı xəta' });
            res.json({ success: true });
        });
    },

    me(req, res) {
        if (req.session && req.session.user) {
            return res.json({ user: req.session.user });
        }
        res.status(401).json({ error: 'Giriş edilməyib' });
    }
};

module.exports = authController;
