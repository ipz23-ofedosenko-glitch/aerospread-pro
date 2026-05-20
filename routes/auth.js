const express = require('express');
const dns = require('dns').promises;
const router = express.Router();

async function validateEmailDomain(email) {
    try {
        const domain = email.split('@')[1];
        if (!domain) return false;
        const records = await dns.resolveMx(domain);
        return records && records.length > 0;
    } catch (e) {
        return false;
    }
}
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Реєстрація нового користувача
router.post('/register', async (req, res) => {
  try {
    const { full_name, email, password } = req.body;

    // Валідація вхідних даних
    if (!full_name || !email || !password) {
      return res.status(400).json({ 
        error: 'Всі поля обов\'язкові для заповнення' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Пароль повинен містити мінімум 6 символів' 
      });
    }

    // Перевірка що домен email існує
    const emailValid = await validateEmailDomain(email);
    if (!emailValid) {
      return res.status(400).json({ 
        error: 'Вказаний email не існує або недійсний' 
      });
    }

    // Перевірка чи користувач вже існує
    const userExists = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (userExists.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Користувач з таким email вже існує' 
      });
    }

    // Хешування паролю
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Створення нового користувача
    const result = await db.query(
      `INSERT INTO users (full_name, email, password_hash) 
       VALUES ($1, $2, $3) 
       RETURNING id, full_name, email, created_at`,
      [full_name, email, password_hash]
    );

    const user = result.rows[0];

    // Створення JWT токена
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        full_name: user.full_name 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Реєстрація успішна',
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        created_at: user.created_at
      },
      token
    });

  } catch (error) {
    console.error('Помилка реєстрації:', error);
    res.status(500).json({ 
      error: 'Помилка сервера при реєстрації' 
    });
  }
});

// Вхід користувача
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Валідація
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email та пароль обов\'язкові' 
      });
    }

    // Пошук користувача
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Невірний email або пароль' 
      });
    }

    const user = result.rows[0];

    // Перевірка паролю
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ 
        error: 'Невірний email або пароль' 
      });
    }

    // Оновлення часу останнього входу
    await db.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Створення JWT токена
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        full_name: user.full_name 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Вхід успішний',
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        last_login: user.last_login
      },
      token
    });

  } catch (error) {
    console.error('Помилка входу:', error);
    res.status(500).json({ 
      error: 'Помилка сервера при вході' 
    });
  }
});

// Отримання профілю поточного користувача
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, full_name, email, created_at, last_login 
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Користувача не знайдено' 
      });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Помилка отримання профілю:', error);
    res.status(500).json({ 
      error: 'Помилка сервера' 
    });
  }
});

// Перевірка токена
router.get('/verify', authenticateToken, (req, res) => {
  res.json({ 
    valid: true, 
    user: req.user 
  });
});

module.exports = router;
