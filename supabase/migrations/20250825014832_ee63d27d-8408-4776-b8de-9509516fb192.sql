-- Create HOA mappings for the 4 users to Boca Bridges
INSERT INTO public.household_hoa (
  household_address,
  normalized_address,
  hoa_name,
  created_by
) VALUES 
  (
    '9070 Chauvet Wy',
    public.normalize_address('9070 Chauvet Wy'),
    'Boca Bridges',
    (SELECT id FROM public.users WHERE email = 'mrosoff@verizon.net' LIMIT 1)
  ),
  (
    '17136 Ludovica Ln',
    public.normalize_address('17136 Ludovica Ln'),
    'Boca Bridges',
    (SELECT id FROM public.users WHERE email = 'cjpeyser@gmail.com' LIMIT 1)
  )
ON CONFLICT (normalized_address) DO NOTHING;