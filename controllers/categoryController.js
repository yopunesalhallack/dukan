const pool = require('../config/db');

exports.getAll = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM categories ORDER BY name');
    res.json(rows);
  } catch (error) { next(error); }
};

exports.create = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const [result] = await pool.query(
      'INSERT INTO categories (name, description) VALUES (?, ?)',
      [name, description || null]
    );
    res.status(201).json({ id: result.insertId, message: 'تم إضافة التصنيف' });
  } catch (error) { next(error); }
};

exports.update = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    await pool.query(
      'UPDATE categories SET name = ?, description = ? WHERE id = ?',
      [name, description, req.params.id]
    );
    res.json({ message: 'تم تحديث التصنيف' });
  } catch (error) { next(error); }
};

exports.delete = async (req, res, next) => {
  try {
    await pool.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.json({ message: 'تم حذف التصنيف' });
  } catch (error) { next(error); }
};