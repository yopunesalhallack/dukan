// test-direct.js
require('dotenv').config();  // تأكد من تثبيت dotenv
const mysql = require('mysql2/promise');

(async () => {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        console.log('type of pool:', typeof pool);
        console.log('does it have getConnection?', typeof pool.getConnection);

        const conn = await pool.getConnection();
        console.log('✅ connected to database successfully');
        conn.release();
        await pool.end();
    } catch (err) {
        console.error('❌  failed to connect to database:', err.message);
    }
})();