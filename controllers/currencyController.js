const pool = require('../config/db');

exports.getAll = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM currencies ORDER BY id');
    res.json(rows);
  } catch (error) { next(error); }
};

exports.create = async (req, res, next) => {
  try {
    const { code, name, symbol, is_default } = req.body;
    if (is_default) {
      await pool.query('UPDATE currencies SET is_default = 0');
    }
    const [result] = await pool.query(
      'INSERT INTO currencies (code, name, symbol, is_default) VALUES (?, ?, ?, ?)',
      [code.toUpperCase(), name, symbol, is_default ? 1 : 0]
    );
    res.status(201).json({ id: result.insertId, message: 'تم إضافة العملة' });
  } catch (error) { next(error); }
};

exports.update = async (req, res, next) => {
  try {
    const { code, name, symbol, is_default } = req.body;
    if (is_default) {
      await pool.query('UPDATE currencies SET is_default = 0');
    }
    await pool.query(
      'UPDATE currencies SET code=?, name=?, symbol=?, is_default=? WHERE id=?',
      [code.toUpperCase(), name, symbol, is_default ? 1 : 0, req.params.id]
    );
    res.json({ message: 'تم تحديث العملة' });
  } catch (error) { next(error); }
};

exports.delete = async (req, res, next) => {
  try {
    const [[currency]] = await pool.query('SELECT is_default FROM currencies WHERE id=?', [req.params.id]);
    if (!currency) return res.status(404).json({ message: 'العملة غير موجودة' });
    if (currency.is_default) return res.status(400).json({ message: 'لا يمكن حذف العملة الأساسية' });
    await pool.query('DELETE FROM currencies WHERE id=?', [req.params.id]);
    res.json({ message: 'تم حذف العملة' });
  } catch (error) { next(error); }
};