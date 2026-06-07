const pool = require('../config/db');

exports.getAll = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, c.code as currency_code, c.symbol as currency_symbol, cat.name as category_name 
       FROM products p 
       LEFT JOIN currencies c ON p.currency_id = c.id 
       LEFT JOIN categories cat ON p.category_id = cat.id`
    );
    res.json(rows);
  } catch (error) { next(error); }
};


exports.getById = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, c.code as currency_code, c.symbol as currency_symbol, cat.name as category_name 
       FROM products p 
       LEFT JOIN currencies c ON p.currency_id = c.id 
       LEFT JOIN categories cat ON p.category_id = cat.id 
       WHERE p.id = ?`, [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'المنتج غير موجود' });
    res.json(rows[0]);
  } catch (error) { next(error); }
};

exports.create = async (req, res, next) => {
  try {
    const { name, barcode, category_id, purchase_price, selling_price, currency_id, stock_quantity, min_stock_alert } = req.body;
    const [result] = await pool.query(
      `INSERT INTO products (name, barcode, category_id, purchase_price, selling_price, currency_id, stock_quantity, min_stock_alert) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, barcode, category_id || null, purchase_price, selling_price, currency_id, stock_quantity || 0, min_stock_alert || 5]
    );
    res.status(201).json({ id: result.insertId, message: 'تمت إضافة المنتج' });
  } catch (error) { next(error); }
};

exports.update = async (req, res, next) => {
  try {
    const { name, barcode, category_id, purchase_price, selling_price, currency_id, stock_quantity, min_stock_alert } = req.body;
    await pool.query(
      `UPDATE products SET name=?, barcode=?, category_id=?, purchase_price=?, selling_price=?, currency_id=?, stock_quantity=?, min_stock_alert=? WHERE id=?`,
      [name, barcode, category_id, purchase_price, selling_price, currency_id, stock_quantity, min_stock_alert, req.params.id]
    );
    res.json({ message: 'تم تحديث المنتج' });
  } catch (error) { next(error); }
};

exports.delete = async (req, res, next) => {
  try {
    await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'تم حذف المنتج' });
  } catch (error) { next(error); }
};