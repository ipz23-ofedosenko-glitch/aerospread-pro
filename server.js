const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Статичні файли (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const substanceRoutes = require('./routes/substances');
const simulationRoutes = require('./routes/simulation');
const weatherRoutes = require('./routes/weather');
const reportRoutes = require('./routes/reports');

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/substances', substanceRoutes);
app.use('/api/simulation', simulationRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/reports', reportRoutes);

// Базовий маршрут
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Обробка 404
app.use((req, res) => {
  res.status(404).json({ error: 'Маршрут не знайдено' });
});

// Глобальна обробка помилок
app.use((err, req, res, next) => {
  console.error('Помилка сервера:', err.stack);
  res.status(500).json({ 
    error: 'Внутрішня помилка сервера',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Запуск сервера
const server = app.listen(PORT, () => {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║                                                       ║');
  console.log('║          🌊 AeroSpread Pro Server                     ║');
  console.log('║                                                       ║');
  console.log(`║     Сервер запущено успішно!                          ║`);
  console.log(`║     Порт: ${PORT}                                        ║`);
  console.log(`║     URL: http://localhost:${PORT}                        ║`);
  console.log('║                                                       ║');
  console.log('║     🔗 База даних: PostgreSQL (реальна БД)             ║');
  console.log('║                                                       ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');
});

module.exports = app;
