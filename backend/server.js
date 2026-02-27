const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session
app.use(session({
    secret: process.env.SESSION_SECRET || 'restaurant-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }
}));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tables', require('./routes/tables'));
app.use('/api/products', require('./routes/products'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/export', require('./routes/export'));
app.use('/api/backup', require('./routes/backup'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/templates', require('./routes/templates'));
app.use('/api/history', require('./routes/history'));
app.use('/api/archive', require('./routes/archive'));

// Frontend
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) res.sendFile(path.join(frontendPath, 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({ error: 'Daxili server xətası' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🍽️  Restaurant App running on http://localhost:${PORT}`);

    const { nightlyBackup } = require('./controllers/backupController');

    // ── Catch-up scheduler: runs every hour ─────────────────────────────────
    // If today's auto-backup doesn't exist AND time is >= 21:00, create it.
    // This handles the case where the machine was off at exactly 21:00.
    function runCatchUpBackup() {
        const now = new Date();
        const hour = now.getHours(); // server local time (Baku = UTC+4)
        if (hour >= 21) {
            nightlyBackup(); // internally checks if today's file already exists
        }
    }

    // Check immediately on startup (in case the server restarted after 21:00)
    runCatchUpBackup();

    // Then check every hour
    cron.schedule('0 * * * *', () => {
        console.log('⏰ Hourly backup check...');
        runCatchUpBackup();
    });

    console.log('⏰ Auto-backup: catch-up check runs hourly, triggers after 21:00');
});
