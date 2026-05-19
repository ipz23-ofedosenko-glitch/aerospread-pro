const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Отримати всі речовини
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM substances 
       WHERE is_active = true 
       ORDER BY name_ua ASC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Помилка отримання речовин:', error);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

// Отримати речовину за ID
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM substances WHERE id = $1 AND is_active = true',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Речовину не знайдено' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Помилка отримання речовини:', error);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

// Пошук речовин
router.get('/search/:query', async (req, res) => {
  try {
    const searchQuery = `%${req.params.query}%`;
    const result = await db.query(
      `SELECT * FROM substances 
       WHERE (name_ua ILIKE $1 OR name_en ILIKE $1 OR cas_number ILIKE $1)
       AND is_active = true
       ORDER BY name_ua ASC`,
      [searchQuery]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Помилка пошуку речовин:', error);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

module.exports = router;
