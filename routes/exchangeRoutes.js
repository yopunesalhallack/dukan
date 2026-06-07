const router = require('express').Router();
const auth = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/exchangeController');

router.get('/', auth, ctrl.getAllRates);
router.post('/', auth, ctrl.setRate);

module.exports = router;