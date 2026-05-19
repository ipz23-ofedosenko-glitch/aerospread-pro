-- Створення бази даних AeroSpread Pro
-- Використовується для моделювання розповсюдження аерозольних забруднень

-- Таблиця користувачів
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Таблиця речовин (забруднювачів)
CREATE TABLE IF NOT EXISTS substances (
    id SERIAL PRIMARY KEY,
    name_ua VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    cas_number VARCHAR(50),
    molecular_weight DECIMAL(10, 4), -- молекулярна маса, г/моль
    density DECIMAL(10, 4), -- щільність, г/см³
    mac_single DECIMAL(10, 6), -- ГДКм.р. (мг/м³) - максимальна разова
    mac_daily DECIMAL(10, 6), -- ГДКс.д. (мг/м³) - середньодобова
    danger_class INTEGER, -- клас небезпеки (1-4)
    aggregation_state VARCHAR(50), -- агрегатний стан (газ, рідина, тверда речовина, аерозоль)
    description TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Таблиця проектів моделювання
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    location_name VARCHAR(255), -- назва місця
    latitude DECIMAL(10, 7) NOT NULL, -- широта джерела викиду
    longitude DECIMAL(10, 7) NOT NULL, -- довгота джерела викиду
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_calculated TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Таблиця параметрів викиду для проектів
CREATE TABLE IF NOT EXISTS emission_parameters (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    substance_id INTEGER NOT NULL REFERENCES substances(id),
    
    -- Параметри джерела викиду
    source_height DECIMAL(10, 2) NOT NULL, -- висота джерела викиду, м
    source_diameter DECIMAL(10, 2), -- діаметр устя джерела, м
    exit_velocity DECIMAL(10, 2), -- швидкість виходу газоповітряної суміші, м/с
    exit_temperature DECIMAL(10, 2), -- температура виходу, °C
    emission_rate DECIMAL(15, 6) NOT NULL, -- потужність викиду, г/с
    
    -- Метеорологічні умови
    wind_speed DECIMAL(10, 2), -- швидкість вітру, м/с
    wind_direction DECIMAL(10, 2), -- напрямок вітру, градуси
    air_temperature DECIMAL(10, 2), -- температура повітря, °C
    atmospheric_pressure DECIMAL(10, 2), -- атмосферний тиск, гПа
    humidity DECIMAL(10, 2), -- вологість, %
    stability_class VARCHAR(10), -- клас стійкості атмосфери (A, B, C, D, E, F)
    
    -- Додаткові параметри
    roughness_length DECIMAL(10, 4), -- параметр шорсткості поверхні, м
    calculation_distance DECIMAL(10, 2) DEFAULT 5000, -- відстань розрахунку, м
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблиця результатів моделювання
CREATE TABLE IF NOT EXISTS simulation_results (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    emission_parameter_id INTEGER NOT NULL REFERENCES emission_parameters(id),
    
    -- Результати розрахунків
    max_concentration DECIMAL(15, 8), -- максимальна концентрація, мг/м³
    max_concentration_distance DECIMAL(10, 2), -- відстань до максимуму, м
    dangerous_zone_radius DECIMAL(10, 2), -- радіус небезпечної зони (>ГДК), м
    
    -- JSON дані для візуалізації
    concentration_grid JSONB, -- сітка концентрацій для побудови ізоліній
    isolines_data JSONB, -- дані ізоліній
    
    calculation_time DECIMAL(10, 3), -- час розрахунку, секунди
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблиця звітів
CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    simulation_result_id INTEGER REFERENCES simulation_results(id),
    
    report_type VARCHAR(50) NOT NULL, -- тип звіту (PDF, DOCX)
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500),
    file_size INTEGER, -- розмір файлу в байтах
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

-- Індекси для оптимізації запитів
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_emission_parameters_project_id ON emission_parameters(project_id);
CREATE INDEX idx_simulation_results_project_id ON simulation_results(project_id);
CREATE INDEX idx_reports_project_id ON reports(project_id);
CREATE INDEX idx_substances_name ON substances(name_ua);

-- Тригери для автоматичного оновлення updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_substances_updated_at BEFORE UPDATE ON substances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_emission_parameters_updated_at BEFORE UPDATE ON emission_parameters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
