const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Тут буде логіка генерації звітів
// Поки що заглушка

router.post('/generate', async (req, res) => {
  res.json({ 
    message: 'Маршрут генерації звітів буде реалізовано на наступному кроці' 
  });
});

module.exports = router;
