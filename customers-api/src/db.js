const mysql = require('mysql2/promise');
const { DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME } = process.env;

const pool = mysql.createPool({
  host: DB_HOST || 'mysql',
  port: DB_PORT || 3306,
  user: DB_USER || 'root',
  password: DB_PASS || 'root',
  database: DB_NAME || 'appdb',
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool;