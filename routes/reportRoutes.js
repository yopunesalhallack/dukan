const router = require('express').Router();
const auth = require('../middlewares/authMiddleware');
const { getSummary, getChartData } = require('../controllers/reportController');

router.get('/summary', auth, getSummary);
router.get('/chart', auth, getChartData);

module.exports = router;