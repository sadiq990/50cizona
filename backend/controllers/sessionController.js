'use strict';

const Session = require('../models/Session');
const db = require('../database');
const { printReceipt, logPrint, getSettings } = require('../services/printService');

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

function getSessionFull(sessionId) {
    return db.prepare(`
        SELECT s.*, t.number AS table_number, u.username AS waiter_name
        FROM sessions s
        JOIN tables t ON t.id = s.table_id
        LEFT JOIN users u ON u.id = s.waiter_id
        WHERE s.id = ?
    `).get(sessionId);
}

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

    async end(req, res) {
        try {
            const { sessionId } = req.body;
            if (!sessionId) return res.status(400).json({ error: 'Sessiya ID tələb olunur' });
            const session = Session.end(sessionId);
            if (session.error) return res.status(400).json(session);

            // ── Auto-print ────────────────────────────────────────────────────────
            const settings = getSettings();
            if (settings.auto_print === 'true') {
                try {
                    const sessionFull = getSessionFull(sessionId);
                    const items = getOrderItems(sessionId);
                    const waiterName = sessionFull?.waiter_name || 'N/A';
                    const printedBy = req.session?.user?.id || null;

                    // Fire-and-forget but log result
                    printReceipt(sessionFull || session, items, waiterName)
                        .then(result => {
                            logPrint(sessionId, result.success ? 'success' : 'failed', result.error, printedBy);
                            if (!result.success) {
                                console.warn('⚠️ Auto-print failed:', result.error);
                            } else {
                                console.log('🖨️  Auto-print success for session', sessionId);
                            }
                        })
                        .catch(err => {
                            logPrint(sessionId, 'failed', err.message, printedBy);
                            console.error('Auto-print exception:', err.message);
                        });
                } catch (printErr) {
                    console.error('Auto-print setup error:', printErr.message);
                }
            }
            // ──────────────────────────────────────────────────────────────────────

            res.json({ ...session, autoPrintTriggered: settings.auto_print === 'true' });
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

