-- Create storage buckets for payment QR codes and receipts
-- Run in Supabase SQL Editor with service role

insert into storage.buckets (id, name, public)
values
  ('payment-qr-codes', 'payment-qr-codes', true),
  ('payment-receipts', 'payment-receipts', true)
on conflict (id) do nothing;

-- Optional: basic read access for public buckets
-- Adjust policies as needed for tighter control
create policy "Public read payment qr codes"
  on storage.objects for select
  using (bucket_id = 'payment-qr-codes');

create policy "Public read payment receipts"
  on storage.objects for select
  using (bucket_id = 'payment-receipts');

-- Tenant upload for receipts
create policy "Tenant upload receipts"
  on storage.objects for insert
  with check (bucket_id = 'payment-receipts' and auth.role() = 'authenticated');

-- Landlord upload for QR codes
create policy "Landlord upload qr codes"
  on storage.objects for insert
  with check (bucket_id = 'payment-qr-codes' and auth.role() = 'authenticated');
