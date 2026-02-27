const db = require('../database');

const reportController = {
    daily(req, res) {
        try {
            const report = db.prepare(`
        SELECT 
          date(started_at, 'localtime') as date,
          COUNT(*) as total_sessions,
          COALESCE(SUM(total_amount), 0) as total_revenue,
          COALESCE(AVG(total_amount), 0) as avg_amount
        FROM sessions
        WHERE status = 'closed' AND date(started_at, 'localtime') = date('now', 'localtime')
        GROUP BY date(started_at, 'localtime')
      `).get();

            const hourly = db.prepare(`
        SELECT 
          strftime('%H', started_at, 'localtime') as hour,
          COUNT(*) as count,
          COALESCE(SUM(total_amount), 0) as revenue
        FROM sessions
        WHERE status = 'closed' AND date(started_at, 'localtime') = date('now', 'localtime')
        GROUP BY strftime('%H', started_at, 'localtime')
        ORDER BY hour
      `).all();

            res.json({
                summary: report || { date: new Date().toISOString().split('T')[0], total_sessions: 0, total_revenue: 0, avg_amount: 0 },
                hourly
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    weekly(req, res) {
        try {
            const report = db.prepare(`
        SELECT 
          date(started_at, 'localtime') as date,
          COUNT(*) as total_sessions,
          COALESCE(SUM(total_amount), 0) as total_revenue,
          COALESCE(AVG(total_amount), 0) as avg_amount
        FROM sessions
        WHERE status = 'closed' AND date(started_at, 'localtime') >= date('now', '-7 days', 'localtime')
        GROUP BY date(started_at, 'localtime')
        ORDER BY date
      `).all();

            const totals = db.prepare(`
        SELECT 
          COUNT(*) as total_sessions,
          COALESCE(SUM(total_amount), 0) as total_revenue,
          COALESCE(AVG(total_amount), 0) as avg_amount
        FROM sessions
        WHERE status = 'closed' AND date(started_at, 'localtime') >= date('now', '-7 days', 'localtime')
      `).get();

            res.json({ daily: report, totals });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    monthly(req, res) {
        try {
            const report = db.prepare(`
        SELECT 
          date(started_at, 'localtime') as date,
          COUNT(*) as total_sessions,
          COALESCE(SUM(total_amount), 0) as total_revenue,
          COALESCE(AVG(total_amount), 0) as avg_amount
        FROM sessions
        WHERE status = 'closed' AND date(started_at, 'localtime') >= date('now', '-30 days', 'localtime')
        GROUP BY date(started_at, 'localtime')
        ORDER BY date
      `).all();

            const totals = db.prepare(`
        SELECT 
          COUNT(*) as total_sessions,
          COALESCE(SUM(total_amount), 0) as total_revenue,
          COALESCE(AVG(total_amount), 0) as avg_amount
        FROM sessions
        WHERE status = 'closed' AND date(started_at, 'localtime') >= date('now', '-30 days', 'localtime')
      `).get();

            res.json({ daily: report, totals });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
};

module.exports = reportController;
