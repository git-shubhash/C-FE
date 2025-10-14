-- Update tests table with new schema
-- Drop the old tests table if it exists
DROP TABLE IF EXISTS tests CASCADE;

-- Create the new tests table with updated schema
CREATE TABLE tests (
    test_id SERIAL PRIMARY KEY,
    service_type_id INTEGER NOT NULL REFERENCES service_types(service_type_id) ON DELETE CASCADE,
    test_name VARCHAR(100) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    normal_min NUMERIC NOT NULL,   -- lower bound of normal range
    normal_max NUMERIC NOT NULL,   -- upper bound of normal range
    normal_text VARCHAR(100) NOT NULL  -- optional free-text (e.g., "Male: 13-17, Female: 12-15")
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tests_service_type ON tests(service_type_id);
CREATE INDEX IF NOT EXISTS idx_tests_name ON tests(test_name);
CREATE INDEX IF NOT EXISTS idx_tests_unit ON tests(unit);
