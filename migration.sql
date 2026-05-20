-- Міграція: додаємо відсутні колонки до emission_parameters
-- Запускати один раз: psql -U your_user -d your_db -f migration.sql

ALTER TABLE emission_parameters
    ADD COLUMN IF NOT EXISTS wind_direction_code VARCHAR(10),
    ADD COLUMN IF NOT EXISTS substance_name      VARCHAR(255),
    ADD COLUMN IF NOT EXISTS substance_name_en   VARCHAR(255),
    ADD COLUMN IF NOT EXISTS mac_single          DECIMAL(10, 6);
