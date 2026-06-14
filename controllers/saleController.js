

const pool = require('../config/db');

// create a sale
exports.createSale = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { customer_id, items, discount, payment_method } = req.body;
    await conn.beginTransaction();

    let totalAmount = 0;
    const saleItems = [];
    let saleCurrencyId = null;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const [[product]] = await conn.query(
        'SELECT id, name, selling_price, currency_id, stock_quantity FROM products WHERE id = ? FOR UPDATE',
        [item.product_id]
      );
      if (!product) throw new Error(`المنتج ${item.product_id} غير موجود`);

      //  detrmin the currency for the invoice
      if (i === 0) saleCurrencyId = product.currency_id;
      else if (product.currency_id !== saleCurrencyId) {
        throw new Error('جميع المنتجات في الفاتورة يجب أن تكون بنفس العملة');
      }

      if (product.stock_quantity < item.quantity) {
        throw new Error(`المخزون غير كافٍ للمنتج "${product.name}"`);
      }

      const totalPrice = product.selling_price * item.quantity;
      totalAmount += totalPrice;
      saleItems.push({
        product_id: product.id,
        quantity: item.quantity,
        unit_price: product.selling_price,
        total_price: totalPrice
      });
    }

    const finalAmount = totalAmount - (discount || 0);
    const [result] = await conn.query(
      `INSERT INTO sales (user_id, customer_id, total_amount, discount, final_amount, currency_id, payment_method)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, customer_id || null, totalAmount, discount || 0, finalAmount, saleCurrencyId, payment_method || 'cash']
    );

    for (let item of saleItems) {
      await conn.query(
        'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)',
        [result.insertId, item.product_id, item.quantity, item.unit_price, item.total_price]
      );
      await conn.query('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?', [item.quantity, item.product_id]);
    }

    await conn.commit();
    res.status(201).json({
      sale_id: result.insertId,
      final_amount: finalAmount,
      message: 'تمت عملية البيع بنجاح'
    });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
};

//Get one bill with its details
exports.getSaleById = async (req, res, next) => {
  try {
    const [sales] = await pool.query('SELECT * FROM sales WHERE id = ?', [req.params.id]);

    if (sales.length === 0) {
      return res.status(404).json({ message: 'الفاتورة غير موجودة' });
    }

    const [items] = await pool.query(
      `SELECT si.*, p.name as product_name
       FROM sale_items si
       JOIN products p ON si.product_id = p.id
       WHERE si.sale_id = ?`,
      [req.params.id]
    );

    res.json({
      sale: sales[0],
      items: items
    });

  } catch (error) {
    next(error);
  }
};
// today statistics 
exports.getTodayStats = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0]; 

    const [rows] = await pool.query(
      `SELECT 
         COUNT(*) AS sales_count,
         COALESCE(SUM(final_amount), 0) AS total_amount
       FROM sales
       WHERE DATE(sale_date) = ?`,
      [today]
    );

    res.json(rows[0]); // { sales_count: 5, total_amount: 325.75 }

  } catch (error) {
    next(error);
  }
};
// get all bills
exports.getAllSales = async (req, res, next) => {
  try {
    const [sales] = await pool.query(
      `SELECT s.*, u.name AS cashier_name
       FROM sales s
       JOIN users u ON s.user_id = u.id
       ORDER BY s.sale_date DESC`
    );

    res.json(sales);

  } catch (error) {
    next(error);
  }
};