const Template = require('../models/Template');

const templateController = {
    list(req, res) {
        try {
            const templates = Template.getAll();
            res.json(templates);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    create(req, res) {
        try {
            const { name, category, price } = req.body;
            if (!name || !category) {
                return res.status(400).json({ error: 'Ad və kateqoriya tələb olunur' });
            }
            const template = Template.add(name, category, parseFloat(price));
            res.status(201).json(template);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    delete(req, res) {
        try {
            const { id } = req.params;
            Template.delete(id);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
};

module.exports = templateController;
