-- Робимо substance_id необов'язковим
ALTER TABLE emission_parameters ALTER COLUMN substance_id DROP NOT NULL;
