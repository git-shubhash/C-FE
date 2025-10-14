-- Clean up sample data from existing tables
DELETE FROM prescriptions;
DELETE FROM bills;
DELETE FROM medicines;
DELETE FROM appointments;
DELETE FROM users;

-- Reset sequences
ALTER SEQUENCE medicines_id_seq RESTART WITH 1;
ALTER SEQUENCE prescriptions_id_seq RESTART WITH 1;

-- Create services tables if they don't exist
CREATE TABLE IF NOT EXISTS sub_departments (
    sub_department_id SERIAL PRIMARY KEY,
    sub_department_name VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS service_types (
    service_type_id SERIAL PRIMARY KEY,
    sub_department_id INT NOT NULL REFERENCES sub_departments(sub_department_id) ON DELETE CASCADE,
    service_type_name VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS tests (
    test_id SERIAL PRIMARY KEY,
    service_type_id INT NOT NULL REFERENCES service_types(service_type_id) ON DELETE CASCADE,
    test_name VARCHAR(100) NOT NULL,
    unit VARCHAR(50),
    normal_value VARCHAR(100)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_service_types_department ON service_types(sub_department_id);
CREATE INDEX IF NOT EXISTS idx_tests_service_type ON tests(service_type_id);
CREATE INDEX IF NOT EXISTS idx_sub_departments_name ON sub_departments(sub_department_name);
CREATE INDEX IF NOT EXISTS idx_service_types_name ON service_types(service_type_name);
CREATE INDEX IF NOT EXISTS idx_tests_name ON tests(test_name);
