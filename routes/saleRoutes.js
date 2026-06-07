const router = require('express').Router();
const auth = require('../middlewares/authMiddleware');
const { createSale, getSaleById ,getTodayStats,getAllSales } = require('../controllers/saleController');

router.post('/', auth, createSale);
router.get('/today', auth, getTodayStats);
router.get('/:id', auth, getSaleById);
router.get('/', auth, getAllSales);
module.exports = router;