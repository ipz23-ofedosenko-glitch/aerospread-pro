const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// POST /api/simulation/save - Збереження результатів розрахунку
router.post('/save', async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            project_name, substance_id, latitude, longitude,
            source_height, emission_rate, wind_speed, wind_direction,
            wind_direction_code, substance_name, substance_name_en,
            mac_single, temperature, pressure, humidity, stability_class,
            max_concentration, max_distance, danger_radius,
            gdk_ratio, calculation_date
        } = req.body;

        // Перевіряємо обов'язкові параметри
        if (!latitude || !longitude || !max_concentration) {
            return res.status(400).json({ 
                error: 'Відсутні обов\'язкові параметри' 
            });
        }

        // Спочатку зберігаємо додаткову речовину якщо не вказана
        let substanceId = substance_id || 1;

        // Створюємо проект
        const projectResult = await db.query(
            `INSERT INTO projects (user_id, name, latitude, longitude, description, last_calculated)
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
            RETURNING id`,
            [userId, project_name || 'Розрахунок', latitude, longitude, 'Розрахунок розповсюдження']
        );

        const projectId = projectResult.rows[0].id;

        // Зберігаємо параметри викиду
        const paramsResult = await db.query(
            `INSERT INTO emission_parameters 
            (project_id, substance_id, source_height, emission_rate,
             wind_speed, wind_direction, wind_direction_code,
             substance_name, substance_name_en, mac_single,
             air_temperature, atmospheric_pressure, humidity, stability_class)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING id`,
            [projectId, substanceId, source_height, emission_rate,
             wind_speed, wind_direction || null, wind_direction_code || null,
             substance_name || null, substance_name_en || null, mac_single || null,
             temperature, pressure, humidity, stability_class]
        );

        const paramId = paramsResult.rows[0].id;

        // Зберігаємо результати розрахунку
        const resultsResult = await db.query(
            `INSERT INTO simulation_results 
            (project_id, emission_parameter_id, max_concentration, 
             max_concentration_distance, dangerous_zone_radius, calculation_time)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
            [projectId, paramId, max_concentration, max_distance, danger_radius, 1.5]
        );

        res.status(201).json({
            success: true,
            project_id: projectId,
            result: resultsResult.rows[0],
            message: 'Проект успішно збережено'
        });

    } catch (error) {
        console.error('Помилка збереження результатів:', error.message);
        res.status(500).json({ 
            error: 'Помилка сервера',
            message: error.message
        });
    }
});

// GET /api/simulation/results - Отримати всі результати користувача
router.get('/results', async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await db.query(
            `SELECT 
                p.id, 
                p.name as project_name, 
                p.latitude, 
                p.longitude,
                p.last_calculated as calculation_date,
                COALESCE(sr.max_concentration, 0)::float as max_concentration, 
                COALESCE(sr.max_concentration_distance, 0)::float as max_distance,
                COALESCE(sr.dangerous_zone_radius, 0)::float as danger_radius,
                COALESCE(sr.dangerous_zone_radius / NULLIF(sr.max_concentration, 0), 0)::float as gdk_ratio,
                ep.substance_name as substance_name,
                ep.substance_name_en as substance_name_en
            FROM projects p
            LEFT JOIN simulation_results sr ON p.id = sr.project_id
            LEFT JOIN emission_parameters ep ON sr.emission_parameter_id = ep.id
            WHERE p.user_id = $1 AND p.is_active = true
            ORDER BY p.last_calculated DESC NULLS LAST`,
            [userId]
        );

        console.log('📊 Отримані проекти:', result.rows);
        console.log('📊 Кількість проектів:', result.rows.length);
        
        res.json(result.rows);

    } catch (error) {
        console.error('❌ Помилка отримання результатів:', error.message);
        res.status(500).json({ 
            error: 'Помилка сервера',
            message: error.message 
        });
    }
});

// GET /api/simulation/results/:id - Отримати конкретний результат
router.get('/results/:id', async (req, res) => {
    try {
        const userId = req.user.id;
        const projectId = req.params.id;

        const result = await db.query(
            `SELECT 
                p.id, 
                p.name as project_name, 
                p.latitude, 
                p.longitude,
                p.last_calculated as calculation_date,
                COALESCE(sr.max_concentration, 0) as max_concentration, 
                COALESCE(sr.max_concentration_distance, 0) as max_distance,
                COALESCE(sr.dangerous_zone_radius, 0) as danger_radius,
                COALESCE(ep.source_height, 0) as source_height, 
                COALESCE(ep.emission_rate, 0) as emission_rate, 
                COALESCE(ep.wind_speed, 0) as wind_speed,
                ep.wind_direction as wind_direction,
                ep.wind_direction_code as wind_direction_code,
                ep.substance_name as substance_name,
                ep.substance_name_en as substance_name_en,
                ep.mac_single as mac_single,
                COALESCE(ep.air_temperature, 0) as temperature, 
                COALESCE(ep.atmospheric_pressure, 1013) as pressure, 
                COALESCE(ep.humidity, 65) as humidity, 
                COALESCE(ep.stability_class, 'D') as stability_class
            FROM projects p
            LEFT JOIN simulation_results sr ON p.id = sr.project_id
            LEFT JOIN emission_parameters ep ON sr.emission_parameter_id = ep.id
            WHERE p.id = $1 AND p.user_id = $2`,
            [projectId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Проект не знайдено' });
        }

        console.log('Отримані деталі проекту:', result.rows[0]);
        res.json(result.rows[0]);

    } catch (error) {
        console.error('Помилка отримання деталей:', error.message);
        res.status(500).json({ 
            error: 'Помилка сервера',
            message: error.message 
        });
    }
});

// DELETE /api/simulation/results/:id - Видалити проект
router.delete('/results/:id', async (req, res) => {
    try {
        const userId = req.user.id;
        const projectId = req.params.id;

        // Перевіряємо що проект належить користувачу
        const checkResult = await db.query(
            `SELECT id FROM projects WHERE id = $1 AND user_id = $2`,
            [projectId, userId]
        );

        if (checkResult.rows.length === 0) {
            return res.status(403).json({ error: 'Доступ заборонено' });
        }

        // Видаляємо результати розрахунків
        await db.query(
            `DELETE FROM simulation_results WHERE project_id = $1`,
            [projectId]
        );

        // Видаляємо параметри викиду
        await db.query(
            `DELETE FROM emission_parameters WHERE project_id = $1`,
            [projectId]
        );

        // Видаляємо проект (м'яке видалення - встановлюємо is_active = false)
        await db.query(
            `UPDATE projects SET is_active = false WHERE id = $1`,
            [projectId]
        );

        res.json({ 
            success: true, 
            message: 'Проект видалено',
            project_id: projectId 
        });

    } catch (error) {
        console.error('Помилка видалення:', error.message);
        res.status(500).json({ 
            error: 'Помилка сервера',
            message: error.message 
        });
    }
});

module.exports = router;
