const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middlewares');
const { getKPIs, getRecentActivity, getKPIsByPeriod } = require('../controllers/dashboardControllers');

// Routes protégées du Dashboard
router.get('/kpis', protect, getKPIs);
router.get('/recent-activity', protect, getRecentActivity);
router.get('/kpis/period', protect, getKPIsByPeriod);

module.exports = router;