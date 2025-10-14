-- Create radiology_prescriptions table
create table public.radiology_prescriptions (
  appointment_id uuid not null,
  service_id uuid not null,
  test_conducted_at timestamp with time zone,
  prescription_id uuid not null default extensions.uuid_generate_v4 (),
  status character varying not null default 'pending'::character varying,
  payment_status boolean default false,
  test_conducted boolean default false,
  constraint radiology_prescriptions_pkey primary key (prescription_id),
  constraint radiology_prescriptions_service_fkey foreign KEY (service_id) references radiology_services (service_id),
  constraint radiology_prescriptions_appointment_fkey foreign KEY (appointment_id) references appointments (appointment_id)
) TABLESPACE pg_default;

-- Create indexes for better performance
create index idx_radiology_prescriptions_appointment_id on public.radiology_prescriptions(appointment_id);
create index idx_radiology_prescriptions_service_id on public.radiology_prescriptions(service_id);
create index idx_radiology_prescriptions_status on public.radiology_prescriptions(status);
create index idx_radiology_prescriptions_payment_status on public.radiology_prescriptions(payment_status);
create index idx_radiology_prescriptions_test_conducted on public.radiology_prescriptions(test_conducted);
