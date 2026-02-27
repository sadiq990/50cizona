const Session = require('../models/Session');

const sessionController = {
    start(req, res) {
        try {
            const { tableId } = req.body;
            if (!tableId) return res.status(400).json({ error: 'Masa ID tələb olunur' });
            const waiterId = req.session.user.id;
            const session = Session.start(tableId, waiterId);
            if (session.error) return res.status(400).json(session);
            res.status(201).json(session);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    end(req, res) {
        try {
            const { sessionId } = req.body;
            if (!sessionId) return res.status(400).json({ error: 'Sessiya ID tələb olunur' });
            const session = Session.end(sessionId);
            if (session.error) return res.status(400).json(session);
            res.json(session);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    getActive(req, res) {
        try {
            const sessions = Session.getActive();
            res.json(sessions);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    getStats(req, res) {
        try {
            const stats = Session.getStats();
            res.json(stats);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
};

module.exports = sessionController;
