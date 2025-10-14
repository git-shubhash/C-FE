-- Insert sample radiology prescriptions data
-- Note: This assumes you have appointments and radiology_services already populated

-- Insert sample radiology prescriptions
INSERT INTO public.radiology_prescriptions (
  appointment_id,
  service_id,
  status,
  payment_status,
  test_conducted,
  test_conducted_at
) 
SELECT 
  a.appointment_id,
  rs.service_id,
  CASE 
    WHEN random() < 0.3 THEN 'pending'
    WHEN random() < 0.6 THEN 'in_progress'
    WHEN random() < 0.9 THEN 'completed'
    ELSE 'cancelled'
  END as status,
  CASE 
    WHEN random() < 0.7 THEN true
    ELSE false
  END as payment_status,
  CASE 
    WHEN random() < 0.6 THEN true
    ELSE false
  END as test_conducted,
  CASE 
    WHEN random() < 0.6 THEN NOW() - INTERVAL '1 hour' * (random() * 24)::integer
    ELSE NULL
  END as test_conducted_at
FROM appointments a
CROSS JOIN radiology_services rs
WHERE a.date >= CURRENT_DATE - INTERVAL '30 days'
  AND random() < 0.3  -- Only insert for 30% of combinations to avoid too many records
LIMIT 50;

-- Update some records to have more realistic status combinations
UPDATE public.radiology_prescriptions 
SET 
  status = CASE 
    WHEN test_conducted = true THEN 
      CASE 
        WHEN random() < 0.8 THEN 'completed'
        ELSE 'in_progress'
      END
    WHEN payment_status = false THEN 'pending'
    ELSE 'in_progress'
  END
WHERE test_conducted IS NOT NULL;

-- Ensure completed tests have test_conducted = true
UPDATE public.radiology_prescriptions 
SET test_conducted = true, test_conducted_at = NOW() - INTERVAL '1 hour' * (random() * 24)::integer
WHERE status = 'completed' AND test_conducted = false;

-- Ensure pending tests don't have test_conducted = true
UPDATE public.radiology_prescriptions 
SET test_conducted = false, test_conducted_at = NULL
WHERE status = 'pending' AND test_conducted = true;
