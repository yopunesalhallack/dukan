const pool = require('../config/db');

exports.create = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { supplier_id, items, discount, currency_id } = req.body;

    await conn.beginTransaction();
    let totalAmount = 0;
    const purchaseItems = [];

    for (let item of items) {
      const [[product]] = await conn.query(
        'SELECT id, name, purchase_price FROM products WHERE id = ? FOR UPDATE',
        [item.product_id]
      );
      if (!product) throw new Error(`المنتج ${item.product_id} غير موجود`);

      const unitPrice = item.unit_price || product.purchase_price;
      const totalPrice = unitPrice * item.quantity;
      totalAmount += totalPrice;

      purchaseItems.push({
        product_id: product.id,
        quantity: item.quantity,
        unit_price: unitPrice,
        total_price: totalPrice
      });
    }

    const finalAmount = totalAmount - (discount || 0);
    const [result] = await conn.query(
      `INSERT INTO purchases (user_id, supplier_id, total_amount, discount, final_amount, currency_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, supplier_id || null, totalAmount, discount || 0, finalAmount, currency_id]
    );

    for (let item of purchaseItems) {
      await conn.query(
        `INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_price, total_price)
         VALUES (?, ?, ?, ?, ?)`,
        [result.insertId, item.product_id, item.quantity, item.unit_price, item.total_price]
      );
      // زيادة المخزون
      await conn.query('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?', [item.quantity, item.product_id]);
    }

    await conn.commit();
    res.status(201).json({ purchase_id: result.insertId, message: 'تمت عملية الشراء بنجاح' });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.*, u.name AS user_name, c.symbol AS currency_symbol
      FROM purchases p
      JOIN users u ON p.user_id = u.id
      JOIN currencies c ON p.currency_id = c.id
      ORDER BY p.purchase_date DESC
    `);
    res.json(rows);
  } catch (error) { next(error); }
};

exports.getById = async (req, res, next) => {
  try {
    const [[purchase]] = await pool.query('SELECT * FROM purchases WHERE id = ?', [req.params.id]);
    if (!purchase) return res.status(404).json({ message: 'الشراء غير موجود' });

    const [items] = await pool.query(`
      SELECT pi.*, p.name AS product_name
      FROM purchase_items pi
      JOIN products p ON pi.product_id = p.id
      WHERE pi.purchase_id = ?
    `, [req.params.id]);

    res.json({ purchase, items });
  } catch (error) { next(error); }
};