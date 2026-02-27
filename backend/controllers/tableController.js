const Table = require('../models/Table');

const tableController = {
    getAll(req, res) {
        try {
            const tables = Table.getAll();
            res.json(tables);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    updateStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const table = Table.updateStatus(id, status);
            res.json(table);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
};

module.exports = tableController;
