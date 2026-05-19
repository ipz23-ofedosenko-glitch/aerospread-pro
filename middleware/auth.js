const jwt = require('jsonwebtoken');

// Middleware для перевірки JWT токена
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      error: 'Токен авторизації не надано',
      message: 'Будь ласка, увійдіть до системи' 
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ 
        error: 'Недійсний або прострочений токен',
        message: 'Будь ласка, увійдіть до системи знову' 
      });
    }

    req.user = user;
    next();
  });
};

module.exports = { authenticateToken };
