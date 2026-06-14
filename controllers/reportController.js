const pool = require('../config/db');

// Get the exchange rate for all currency based on the main currency
async function getEffectiveRate(currencyId, date) {
  const [[row]] = await pool.query(
    `SELECT rate FROM exchange_rates 
     WHERE currency_id = ? AND rate_date <= ?
     ORDER BY rate_date DESC LIMIT 1`,
    [currencyId, date]
  );
  return row ? parseFloat(row.rate) : null;
}


async function convertAmount(amount, fromCurrencyId, toCurrencyId, date, defaultCurrencyId) {
  if (fromCurrencyId === toCurrencyId) return parseFloat(amount);
  
  let amountInDefault = parseFloat(amount);
  if (fromCurrencyId !== defaultCurrencyId) {
    const rate = await getEffectiveRate(fromCurrencyId, date);
    if (!rate) throw new Error(`لا يوجد سعر صرف للعملة ${fromCurrencyId} في ${date}`);
    amountInDefault = amountInDefault / rate;  
  }
  
  if (toCurrencyId === defaultCurrencyId) return amountInDefault;
  
  const targetRate = await getEffectiveRate(toCurrencyId, date);
  if (!targetRate) throw new Error(`لا يوجد سعر صرف للعملة ${toCurrencyId} في ${date}`);
  return amountInDefault * targetRate; 
}

exports.getSummary = async (req, res, next) => {
  try {
    const { start_date, end_date, currency_id } = req.query;
    if (!start_date || !end_date) {
      return res.status(400).json({ message: 'يجب تحديد تاريخ البداية والنهاية' });
    }

    const [[defaultCurrency]] = await pool.query('SELECT id FROM currencies WHERE is_default = 1');
    const defaultCurrencyId = defaultCurrency?.id || 1;
    const targetCurrencyId = currency_id ? parseInt(currency_id) : defaultCurrencyId;
    const conversionDate = end_date;

    // sum of sales
    const [salesSummary] = await pool.query(
      `SELECT currency_id, SUM(final_amount) AS total, COUNT(*) AS count
       FROM sales WHERE DATE(sale_date) BETWEEN ? AND ? GROUP BY currency_id`,
      [start_date, end_date]
    );

    //  sum of pruchases
    const [purchasesSummary] = await pool.query(
      `SELECT currency_id, SUM(final_amount) AS total, COUNT(*) AS count
       FROM purchases WHERE DATE(purchase_date) BETWEEN ? AND ? GROUP BY currency_id`,
      [start_date, end_date]
    );

    // 3. sum of profit
    const [profitRows] = await pool.query(
      `SELECT s.currency_id, SUM(si.quantity * (si.unit_price - p.purchase_price)) AS profit
       FROM sale_items si
       JOIN sales s ON si.sale_id = s.id
       JOIN products p ON si.product_id = p.id
       WHERE DATE(s.sale_date) BETWEEN ? AND ?
       GROUP BY s.currency_id`,
      [start_date, end_date]
    );

    let totalSales = 0, totalPurchases = 0, totalProfit = 0;
    let salesCount = 0, purchaseCount = 0;

    for (let s of salesSummary) {
      totalSales += await convertAmount(s.total, s.currency_id, targetCurrencyId, conversionDate, defaultCurrencyId);
      salesCount += s.count;
    }
    for (let p of purchasesSummary) {
      totalPurchases += await convertAmount(p.total, p.currency_id, targetCurrencyId, conversionDate, defaultCurrencyId);
      purchaseCount += p.count;
    }
    for (let pr of profitRows) {
      totalProfit += await convertAmount(pr.profit, pr.currency_id, targetCurrencyId, conversionDate, defaultCurrencyId);
    }

    res.json({
      start_date,
      end_date,
      target_currency_id: targetCurrencyId,
      total_sales: totalSales.toFixed(2),
      total_purchases: totalPurchases.toFixed(2),
      profit: totalProfit.toFixed(2),
      sales_count: salesCount,
      purchase_count: purchaseCount
    });
  } catch (error) {
    next(error);
  }
};

//  chart fun
exports.getChartData = async (req, res, next) => {
  res.json({ message: 'Chart data endpoint ready' });
};