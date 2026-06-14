const router = require('express').Router();
const auth = require('../middlewares/authMiddleware');
const ctrl = require('../controllers/categoryController');

router.get('/', auth, ctrl.getAll);
router.post('/', auth, ctrl.create);
router.put('/:id', auth, ctrl.update);
router.delete('/:id', auth, ctrl.delete);

module.exports = router;