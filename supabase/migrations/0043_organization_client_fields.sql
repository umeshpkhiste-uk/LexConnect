-- Organization clients need a few fields an individual client doesn't:
-- who to contact there, their GST number (for invoicing) and a company/
-- registration number. All nullable and simply unused for individual
-- clients rather than modelled as a separate table — spec §32 prefers
-- one relational shape over splitting near-identical records in two.
alter table public.clients
  add column contact_person_name text,
  add column contact_person_designation text,
  add column gstin text,
  add column registration_number text;
