const pool = require('../config/db');

exports.getAllRates = async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.id, c.code, c.name, c.symbol, c.is_default,
             e.rate, e.rate_date
      FROM currencies c
      LEFT JOIN exchange_rates e ON c.id = e.currency_id
        AND e.rate_date = (
          SELECT MAX(rate_date) FROM exchange_rates WHERE currency_id = c.id
        )
      ORDER BY c.id
    `);
    res.json(rows);
  } catch (error) { next(error); }
};

exports.setRate = async (req, res, next) => {
  try {
    const { currency_id, rate, rate_date } = req.body;
    const date = rate_date || new Date().toISOString().split('T')[0];

    await pool.query(
      `INSERT INTO exchange_rates (currency_id, rate, rate_date) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE rate = VALUES(rate)`,
      [currency_id, rate, date]
    );
    res.json({ message: 'تم تحديث سعر الصرف' });
  } catch (error) {
    next(error);
  }
};