'use strict';

const db = require('../database');
const { printReceipt, logPrint, getSettings, listWindowsPrinters } = require('../services/printService');

// ── helpers ──────────────────────────────────────────────────────────────────

function getSessionFull(sessionId) {
    return db.prepare(`
        SELECT s.*, t.number AS table_number, u.username AS waiter_name
        FROM sessions s
        JOIN tables t ON t.id = s.table_id
        LEFT JOIN users u ON u.id = s.waiter_id
        WHERE s.id = ?
    `).get(sessionId);
}

function getOrderItems(sessionId) {
    return db.prepare(`
        SELECT oi.*, p.name AS product_name,
               (oi.quantity * oi.unit_price) AS line_total
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        WHERE oi.session_id = ?
        ORDER BY oi.created_at
    `).all(sessionId);
}

// ── printBill ─────────────────────────────────────────────────────────────────

const printController = {
    async printBill(req, res) {
        try {
            const sessionId = parseInt(req.params.sessionId, 10);
            if (!sessionId) return res.status(400).json({ error: 'Hesab ID tələb olunur' });

            const session = getSessionFull(sessionId);
            if (!session) return res.status(404).json({ error: 'Hesab tapılmadı' });

            const items = getOrderItems(sessionId);
            if (items.length === 0) return res.status(400).json({ error: 'Sifariş siyahısı boşdur' });

            const waiterName = session.waiter_name || 'N/A';
            const printedBy = req.session?.user?.id || null;

            const result = await printReceipt(session, items, waiterName);

            logPrint(sessionId, result.success ? 'success' : 'failed', result.error, printedBy);

            if (result.success) {
                res.json({ success: true, message: 'Çek uğurla çap edildi' });
            } else {
                res.status(503).json({ success: false, error: result.error });
            }
        } catch (err) {
            console.error('printBill error:', err);
            res.status(500).json({ error: err.message });
        }
    },

    // ── Settings ──────────────────────────────────────────────────────────────

    getSettings(req, res) {
        try {
            const settings = getSettings();
            res.json(settings);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    updateSettings(req, res) {
        try {
            const allowed = ['auto_print', 'printer_type', 'printer_ip', 'printer_port', 'printer_name', 'business_name'];
            const upsert = db.prepare(
                'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
            );
            const updateMany = db.transaction((pairs) => {
                for (const [k, v] of pairs) {
                    if (allowed.includes(k)) upsert.run(k, String(v));
                }
            });
            updateMany(Object.entries(req.body));
            res.json({ success: true, message: 'Parametrlər saxlandı' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    // ── Print log ─────────────────────────────────────────────────────────────

    getLog(req, res) {
        try {
            const logs = db.prepare(`
                SELECT pl.*, s.id AS session_id, t.number AS table_number,
                       s.total_amount, u.username AS printed_by_name
                FROM print_log pl
                JOIN sessions s ON s.id = pl.session_id
                JOIN tables t ON t.id = s.table_id
                LEFT JOIN users u ON u.id = pl.printed_by
                ORDER BY pl.printed_at DESC
                LIMIT 100
            `).all();
            res.json(logs);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    // ── List Windows printers ─────────────────────────────────────────────────

    async listPrinters(req, res) {
        try {
            const printers = await listWindowsPrinters();
            res.json({ printers });
        } catch (err) {
            res.status(500).json({ error: err.message, printers: [] });
        }
    }
};

module.exports = printController;
