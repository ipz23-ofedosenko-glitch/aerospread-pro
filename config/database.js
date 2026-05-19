const { Pool } = require('pg');
require('dotenv').config();

// Створення пулу підключень до PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Обробка помилок підключення
pool.on('error', (err) => {
  console.error('Несподівана помилка клієнта бази даних:', err);
  process.exit(-1);
});

// Тестове підключення
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Помилка підключення до бази даних:', err.stack);
  }
  console.log('✅ Успішне підключення до PostgreSQL');
  release();
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
