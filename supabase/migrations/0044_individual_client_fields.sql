-- Mirrors 0043's organization-only fields with a few basics that only make
-- sense for an individual client: their occupation, PAN (routinely needed
-- for vakalatnama/POA and financial matters) and date of birth. Aadhaar or
-- other sensitive ID numbers are deliberately not collected here.
alter table public.clients
  add column occupation text,
  add column pan_number text,
  add column date_of_birth date;
