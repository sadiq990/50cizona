const fs = require('fs');
const path = require('path');
const db = require('../database');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '..', '..', 'backup');
const DB_PATH = path.join(DATA_DIR, 'restaurant.db');

if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

// Tables to export/restore (FK order)
const EXPORT_TABLES = [
    'users', 'tables', 'products', 'expense_templates',
    'sessions', 'order_items', 'expenses',
];

// ─── RETENTION: keep only last N backup files of a given prefix ───────────────
function applyRetention(prefix = 'backup-', keepDays = 7) {
    try {
        const files = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.startsWith(prefix) && f.endsWith('.json'))
            .sort()        // oldest first
            .reverse();    // newest first
        for (const old of files.slice(keepDays)) {
            fs.unlinkSync(path.join(BACKUP_DIR, old));
            console.log(`🗑️  Retention: removed old backup ${old}`);
        }
    } catch (err) {
        console.error('Retention cleanup error:', err.message);
    }
}

// ─── BUILD JSON PAYLOAD ───────────────────────────────────────────────────────
function buildPayload(auto = false) {
    const payload = {
        version: 1,
        exported_at: new Date().toISOString(),
        auto,
        tables: {},
    };
    for (const table of EXPORT_TABLES) {
        payload.tables[table] = db.prepare(`SELECT * FROM ${table}`).all();
    }
    return payload;
}

// ─── MANUAL BACKUP (called by route) ─────────────────────────────────────────
// Saves to /app/backup AND sends file to browser
exports.createBackup = (req, res) => {
    try {
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
            + `-${pad(now.getHours())}-${pad(now.getMinutes())}`;
        const filename = `backup-${stamp}.json`;
        const filePath = path.join(BACKUP_DIR, filename);

        const payload = buildPayload(false);
        const json = JSON.stringify(payload, null, 2);

        // Save to persistent volume
        fs.writeFileSync(filePath, json);
        console.log(`✅ Manual backup saved: ${filename}`);

        // Apply 7-day retention on manual backups
        applyRetention('backup-', 7);

        // Stream to browser as download
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/json');
        res.send(json);
    } catch (err) {
        console.error('Backup failed:', err);
        res.status(500).json({ success: false, message: 'Backup uğursuz: ' + err.message });
    }
};

// ─── RESTORE (JSON import) ────────────────────────────────────────────────────
exports.restoreBackup = (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Fayl yüklənmədi' });
        }

        const raw = fs.readFileSync(req.file.path, 'utf8');
        fs.unlinkSync(req.file.path);

        let payload;
        try { payload = JSON.parse(raw); } catch {
            return res.status(400).json({ success: false, message: 'Fayl etibarsızdır (JSON deyil)' });
        }

        if (!payload.tables) {
            return res.status(400).json({ success: false, message: 'Backup faylı düzgün formatda deyil' });
        }

        // Pre-restore safety snapshot (as a named file)
        const restore = db.transaction(() => {
            db.pragma('foreign_keys = OFF');
            for (const table of [...EXPORT_TABLES].reverse()) {
                try { db.prepare(`DELETE FROM ${table}`).run(); } catch { }
                try { db.prepare(`DELETE FROM sqlite_sequence WHERE name=?`).run(table); } catch { }
            }
            for (const table of EXPORT_TABLES) {
                const rows = payload.tables[table];
                if (!rows || rows.length === 0) continue;
                const cols = Object.keys(rows[0]);
                const stmt = db.prepare(
                    `INSERT OR IGNORE INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`
                );
                for (const row of rows) stmt.run(cols.map(c => row[c]));
            }
            db.pragma('foreign_keys = ON');
        });

        restore();
        res.json({ success: true, message: 'Məlumatlar uğurla bərpa edildi. Səhifə yenilənəcək.' });
    } catch (err) {
        console.error('Restore failed:', err);
        db.pragma('foreign_keys = ON');
        res.status(500).json({ success: false, message: 'Bərpa uğursuz: ' + err.message });
    }
};

// ─── DAILY AUTO-BACKUP (called by catch-up scheduler in server.js) ────────────
exports.nightlyBackup = () => {
    try {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const filename = `auto-backup-${today}.json`;
        const filePath = path.join(BACKUP_DIR, filename);

        // Don't duplicate if today's already exists
        if (fs.existsSync(filePath)) {
            console.log(`ℹ️  Auto-backup already exists for ${today}, skipping.`);
            return false;
        }

        const json = JSON.stringify(buildPayload(true));
        fs.writeFileSync(filePath, json);
        console.log(`✅ Auto-backup created: ${filename}`);

        // Keep only last 7 daily auto-backups
        applyRetention('auto-backup-', 7);
        return true;
    } catch (err) {
        console.error('❌ Auto-backup failed:', err.message);
        return false;
    }
};
