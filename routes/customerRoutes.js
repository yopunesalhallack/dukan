const router = require('express').Router();

// مثال لمسار بسيط (يمكنك توسيعه لاحقاً)
router.get('/', (req, res) => {
  res.json({ message: 'قائمة العملاء' });
});

module.exports = router;  // <-- هذا السطر ضروري جداً