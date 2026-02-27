const express = require('express');
const router = express.Router();
const backupController = require('../controllers/backupController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

const multer = require('multer');
const upload = multer({ dest: require('os').tmpdir(), limits: { fileSize: 50 * 1024 * 1024 } });

// GET /api/backup/export  → download full JSON backup
router.get('/export', isAuthenticated, isAdmin, backupController.createBackup);

// POST /api/backup/restore → upload JSON, restore DB
router.post('/restore', isAuthenticated, isAdmin, upload.single('backupFile'), backupController.restoreBackup);

module.exports = router;
