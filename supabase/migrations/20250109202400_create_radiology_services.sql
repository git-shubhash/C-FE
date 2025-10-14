-- Create radiology_services table
create table public.radiology_services (
  service_id uuid not null default extensions.uuid_generate_v4 (),
  name character varying not null,
  description text,
  price numeric,
  constraint radiology_services_pkey primary key (service_id)
) TABLESPACE pg_default;

-- Insert some sample radiology services
insert into public.radiology_services (name, description, price) values
  ('Chest X-Ray', 'Standard chest X-ray examination', 150.00),
  ('Abdominal X-Ray', 'Abdominal X-ray examination', 180.00),
  ('MRI Scan - Brain', 'Magnetic Resonance Imaging of the brain', 800.00),
  ('MRI Scan - Spine', 'Magnetic Resonance Imaging of the spine', 900.00),
  ('CT Scan - Chest', 'Computed Tomography of the chest', 600.00),
  ('CT Scan - Abdomen', 'Computed Tomography of the abdomen', 650.00),
  ('Ultrasound - Abdomen', 'Abdominal ultrasound examination', 300.00),
  ('Ultrasound - Pelvis', 'Pelvic ultrasound examination', 350.00);
