const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const { isAuthenticated } = require('../middleware/auth');

router.post('/start', isAuthenticated, sessionController.start);
router.post('/end', isAuthenticated, sessionController.end);
router.get('/active', isAuthenticated, sessionController.getActive);
router.get('/stats', isAuthenticated, sessionController.getStats);

module.exports = router;
