// const pool = require('../config/db');

// exports.createSale = async (req, res, next) => {
//   const conn = await pool.getConnection();
//   try {
//     const { customer_id, items, discount, payment_method } = req.body; 
//     // items: [{product_id, quantity}]
//     await conn.beginTransaction();

//     // 1. حساب المبلغ الإجمالي والتحقق من المخزون
//     let totalAmount = 0;
//     const saleItems = [];

//     for (let item of items) {
//       const [products] = await conn.query(
//         'SELECT id, selling_price, stock_quantity FROM products WHERE id = ? FOR UPDATE',
//         [item.product_id]
//       );
//       if (products.length === 0) throw new Error(`المنتج ${item.product_id} غير موجود`);
//       const product = products[0];
//       if (product.stock_quantity < item.quantity) {
//         throw new Error(`المخزون غير كافي للمنتج "${product.name || item.product_id}"`);
//       }
//       const totalPrice = product.selling_price * item.quantity;
//       totalAmount += totalPrice;
//       saleItems.push({
//         product_id: product.id,
//         quantity: item.quantity,
//         unit_price: product.selling_price,
//         total_price: totalPrice
//       });
//     }

//     const finalAmount = totalAmount - (discount || 0);

//     // 2. إدخال الفاتورة
//     const [saleResult] = await conn.query(
//       `INSERT INTO sales (user_id, customer_id, total_amount, discount, final_amount, payment_method) 
//        VALUES (?, ?, ?, ?, ?, ?)`,
//       [req.user.id, customer_id || null, totalAmount, discount || 0, finalAmount, payment_method || 'cash']
//     );
//     const saleId = saleResult.insertId;

//     // 3. إدخال عناصر الفاتورة وتحديث المخزون
//     for (let item of saleItems) {
//       await conn.query(
//         'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)',
//         [saleId, item.product_id, item.quantity, item.unit_price, item.total_price]
//       );
//       await conn.query(
//         'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
//         [item.quantity, item.product_id]
//       );
//     }

//     await conn.commit();
//     res.status(201).json({ sale_id: saleId, final_amount: finalAmount, message: 'تمت عملية البيع بنجاح' });
//   } catch (error) {
//     await conn.rollback();
//     next(error);
//   } finally {
//     conn.release();
//   }
// };

// exports.getSaleById = async (req, res, next) => {
//   try {
//     const [sales] = await pool.query('SELECT * FROM sales WHERE id = ?', [req.params.id]);
//     if (sales.length === 0) return res.status(404).json({ message: 'الفاتورة غير موجودة' });
//     const [items] = await pool.query(
//       `SELECT si.*, p.name as product_name 
//        FROM sale_items si JOIN products p ON si.product_id = p.id 
//        WHERE si.sale_id = ?`, [req.params.id]
//     );
//     res.json({ sale: sales[0], items });
//   } catch (error) { next(error); }
// };

// // يمكن إضافة دوال للتقارير مثل مبيعات يومية، أكثر المنتجات مبيعاً... إلخ
// // controllers/saleController.js (أضف هذه الدالة)
// exports.getTodayStats = async (req, res, next) => {
//   try {
//     const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
//     const [rows] = await pool.query(
//       `SELECT COUNT(*) as sales_count, COALESCE(SUM(final_amount), 0) as total_amount 
//        FROM sales 
//        WHERE DATE(sale_date) = ?`,
//       [today]
//     );
//     res.json(rows[0]); // { sales_count: 3, total_amount: 148.50 }
//   } catch (error) {
//     next(error);
//   }
// };

const pool = require('../config/db');

// إنشاء فاتورة بيع جديدة
exports.createSale = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { customer_id, items, discount, payment_method } = req.body;
    // items: مصفوفة من [{product_id, quantity}]

    await conn.beginTransaction();

    // 1. حساب المبلغ الإجمالي والتحقق من المخزون
    let totalAmount = 0;
    const saleItems = [];

    for (let item of items) {
      const [products] = await conn.query(
        'SELECT id, name, selling_price, stock_quantity FROM products WHERE id = ? FOR UPDATE',
        [item.product_id]
      );

      if (products.length === 0) {
        throw new Error(`المنتج ذو المعرف ${item.product_id} غير موجود`);
      }

      const product = products[0];

      if (product.stock_quantity < item.quantity) {
        throw new Error(
          `المخزون غير كافٍ للمنتج "${product.name}". المتاح: ${product.stock_quantity}`
        );
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

    // 2. إدخال الفاتورة الرئيسية
    const [saleResult] = await conn.query(
      `INSERT INTO sales (user_id, customer_id, total_amount, discount, final_amount, payment_method)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,                  // من توكن JWT
        customer_id || null,
        totalAmount,
        discount || 0,
        finalAmount,
        payment_method || 'cash'
      ]
    );
    const saleId = saleResult.insertId;

    // 3. إدخال عناصر الفاتورة وتحديث المخزون
    for (let item of saleItems) {
      await conn.query(
        'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)',
        [saleId, item.product_id, item.quantity, item.unit_price, item.total_price]
      );

      await conn.query(
        'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
        [item.quantity, item.product_id]
      );
    }

    await conn.commit();

    res.status(201).json({
      sale_id: saleId,
      total_amount: totalAmount,
      discount: discount || 0,
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

// جلب فاتورة واحدة مع تفاصيلها
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

// إحصائيات مبيعات اليوم الحالي
exports.getTodayStats = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0]; // مثال "2025-03-15"

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

// (اختياري) جلب جميع الفواتير - مفيد لصفحة التقارير لاحقاً
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