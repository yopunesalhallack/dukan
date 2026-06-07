module.exports = (err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || 'حدث خطأ داخلي في الخادم' });
};