const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Отримати поточну погоду за координатами
router.get('/current', async (req, res) => {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ 
        error: 'Координати (lat, lon) обов\'язкові' 
      });
    }

    const apiKey = process.env.OPENWEATHER_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ 
        error: 'API ключ OpenWeather не налаштовано' 
      });
    }

    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather`,
      {
        params: {
          lat,
          lon,
          appid: apiKey,
          units: 'metric',
          lang: 'uk'
        }
      }
    );

    const data = response.data;

    // Форматування даних для використання
    const weatherData = {
      temperature: data.main.temp,
      pressure: data.main.pressure,
      humidity: data.main.humidity,
      wind_speed: data.wind.speed,
      wind_direction: data.wind.deg,
      clouds: data.clouds.all,
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      timestamp: new Date(data.dt * 1000),
      
      // Додаткова інформація
      feels_like: data.main.feels_like,
      temp_min: data.main.temp_min,
      temp_max: data.main.temp_max,
      visibility: data.visibility,
      
      // Оригінальні дані
      raw: data
    };

    res.json(weatherData);

  } catch (error) {
    console.error('Помилка отримання погоди:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      return res.status(401).json({ 
        error: 'Невірний API ключ OpenWeather' 
      });
    }
    
    res.status(500).json({ 
      error: 'Помилка отримання даних погоди',
      details: error.message 
    });
  }
});

// Отримати прогноз погоди на 5 днів
router.get('/forecast', async (req, res) => {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ 
        error: 'Координати (lat, lon) обов\'язкові' 
      });
    }

    const apiKey = process.env.OPENWEATHER_API_KEY;

    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/forecast`,
      {
        params: {
          lat,
          lon,
          appid: apiKey,
          units: 'metric',
          lang: 'uk'
        }
      }
    );

    res.json(response.data);

  } catch (error) {
    console.error('Помилка отримання прогнозу:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Помилка отримання прогнозу погоди' 
    });
  }
});

module.exports = router;
