const pool = require('../config/db');

// يجلب سعر الصرف الفعّال لعملة ما قبل تاريخ معين
async function getEffectiveRate(currencyId, date) {
  const [[row]] = await pool.query(
    `SELECT rate FROM exchange_rates 
     WHERE currency_id = ? AND rate_date <= ?
     ORDER BY rate_date DESC LIMIT 1`,
    [currencyId, date]
  );
  if (row) return parseFloat(row.rate);
  // إذا لم يوجد، فهي العملة الأساسية أو معدلها 1
  const [[curr]] = await pool.query('SELECT is_default FROM currencies WHERE id = ?', [currencyId]);
  return curr && curr.is_default ? 1 : 1;
}

exports.getSummary = async (req, res, next) => {
  try {
    const { start_date, end_date, currency_id } = req.query;
    if (!start_date || !end_date) {
      return res.status(400).json({ message: 'يجب تحديد تاريخ البداية والنهاية' });
    }

    // العملة المستهدفة (التي نريد عرض التقرير بها)
    const targetCurrencyId = currency_id ? parseInt(currency_id) : null;
    // العملة الأساسية
    const [[defaultCurrency]] = await pool.query('SELECT id FROM currencies WHERE is_default = 1');
    const defaultCurrencyId = defaultCurrency?.id || 1;
    const effectiveTarget = targetCurrencyId || defaultCurrencyId;

    // جلب المبيعات والمشتريات مجمعة حسب العملة
    const [sales] = await pool.query(
      `SELECT currency_id, SUM(final_amount) AS total, COUNT(*) AS count
       FROM sales WHERE DATE(sale_date) BETWEEN ? AND ? GROUP BY currency_id`,
      [start_date, end_date]
    );
    const [purchases] = await pool.query(
      `SELECT currency_id, SUM(final_amount) AS total, COUNT(*) AS count
       FROM purchases WHERE DATE(purchase_date) BETWEEN ? AND ? GROUP BY currency_id`,
      [start_date, end_date]
    );

    // دالة تحويل من أي عملة إلى العملة المستهدفة
    const convert = async (amount, fromCurrencyId) => {
      if (fromCurrencyId === effectiveTarget) return parseFloat(amount);
      // التحويل إلى العملة الأساسية أولاً
      let amountInDefault = parseFloat(amount);
      if (fromCurrencyId !== defaultCurrencyId) {
        const rate = await getEffectiveRate(fromCurrencyId, end_date);
        amountInDefault = parseFloat(amount) / rate;
      }
      if (effectiveTarget === defaultCurrencyId) return amountInDefault;
      const targetRate = await getEffectiveRate(effectiveTarget, end_date);
      return amountInDefault * targetRate;
    };

    let totalSales = 0, totalPurchases = 0, salesCount = 0, purchaseCount = 0;
    for (let s of sales) {
      totalSales += await convert(s.total, s.currency_id);
      salesCount += s.count;
    }
    for (let p of purchases) {
      totalPurchases += await convert(p.total, p.currency_id);
      purchaseCount += p.count;
    }

    res.json({
      start_date,
      end_date,
      target_currency_id: effectiveTarget,
      total_sales: totalSales.toFixed(2),
      total_purchases: totalPurchases.toFixed(2),
      profit: (totalSales - totalPurchases).toFixed(2),
      sales_count: salesCount,
      purchase_count: purchaseCount
    });
  } catch (error) { next(error); }
};


exports.getChartData = async (req, res, next) => {
  res.json({ message: 'Chart data endpoint ready' });
};