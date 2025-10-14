-- Add expiry_date column to medicines table
ALTER TABLE public.medicines 
ADD COLUMN expiry_date DATE;

-- Update existing medicines with sample expiry dates
UPDATE public.medicines SET expiry_date = '2024-12-31' WHERE name = 'Paracetamol';
UPDATE public.medicines SET expiry_date = '2024-06-30' WHERE name = 'Amoxicillin';
UPDATE public.medicines SET expiry_date = '2024-08-15' WHERE name = 'Ibuprofen';
UPDATE public.medicines SET expiry_date = '2025-03-20' WHERE name = 'Aspirin';
UPDATE public.medicines SET expiry_date = '2024-11-10' WHERE name = 'Omeprazole';
UPDATE public.medicines SET expiry_date = '2024-09-25' WHERE name = 'Cetirizine';
UPDATE public.medicines SET expiry_date = '2024-07-15' WHERE name = 'Metformin';
UPDATE public.medicines SET expiry_date = '2025-01-05' WHERE name = 'Lisinopril'; 