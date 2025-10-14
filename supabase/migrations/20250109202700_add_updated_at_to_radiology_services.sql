-- Add missing columns to radiology_services table
ALTER TABLE public.radiology_services 
ADD COLUMN IF NOT EXISTS created_at timestamp with time zone NOT NULL DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

-- Create trigger to automatically update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for radiology_services table
DROP TRIGGER IF EXISTS update_radiology_services_updated_at ON public.radiology_services;
CREATE TRIGGER update_radiology_services_updated_at
    BEFORE UPDATE ON public.radiology_services
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
