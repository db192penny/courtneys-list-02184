-- Add Amy Rose's missing address mapping to household_hoa table
INSERT INTO public.household_hoa (
  household_address,
  normalized_address, 
  hoa_name,
  created_by
) VALUES (
  '9035 Dulcetto Ct, Boca Raton, FL 33496, USA',
  public.normalize_address('9035 Dulcetto Ct, Boca Raton, FL 33496, USA'),
  'Boca Bridges',
  '00000000-0000-0000-0000-000000000000'  -- system user for admin fixes
) ON CONFLICT (normalized_address) DO NOTHING;