const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Всі маршрути вимагають авторизації
router.use(authenticateToken);

// Отримати всі проекти користувача
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT p.*, COUNT(sr.id) as simulation_count
       FROM projects p
       LEFT JOIN simulation_results sr ON p.id = sr.project_id
       WHERE p.user_id = $1 AND p.is_active = true
       GROUP BY p.id
       ORDER BY p.updated_at DESC`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Помилка отримання проектів:', error);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

// Створити новий проект
router.post('/', async (req, res) => {
  try {
    const { name, description, location_name, latitude, longitude } = req.body;

    if (!name || !latitude || !longitude) {
      return res.status(400).json({ 
        error: 'Назва, широта та довгота обов\'язкові' 
      });
    }

    const result = await db.query(
      `INSERT INTO projects (user_id, name, description, location_name, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.id, name, description, location_name, latitude, longitude]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Помилка створення проекту:', error);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

// Отримати конкретний проект
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM projects 
       WHERE id = $1 AND user_id = $2 AND is_active = true`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Проект не знайдено' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Помилка отримання проекту:', error);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

// Оновити проект
router.put('/:id', async (req, res) => {
  try {
    const { name, description, location_name, latitude, longitude } = req.body;

    const result = await db.query(
      `UPDATE projects 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           location_name = COALESCE($3, location_name),
           latitude = COALESCE($4, latitude),
           longitude = COALESCE($5, longitude)
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [name, description, location_name, latitude, longitude, req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Проект не знайдено' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Помилка оновлення проекту:', error);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

// Видалити проект (м'яке видалення)
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE projects SET is_active = false 
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Проект не знайдено' });
    }

    res.json({ message: 'Проект видалено' });
  } catch (error) {
    console.error('Помилка видалення проекту:', error);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

module.exports = router;
