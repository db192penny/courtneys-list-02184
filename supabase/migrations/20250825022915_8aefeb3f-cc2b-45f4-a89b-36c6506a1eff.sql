-- Add mapping_source column to household_hoa table for tracking
ALTER TABLE public.household_hoa ADD COLUMN IF NOT EXISTS mapping_source text DEFAULT 'user_created';

-- Create HOA mappings for all 4 users to Boca Bridges using full addresses
INSERT INTO public.household_hoa (
  household_address,
  normalized_address,
  hoa_name,
  created_by,
  mapping_source
) VALUES 
  (
    '9070 Chauvet Wy, Boca Raton, FL 33496, USA',
    public.normalize_address('9070 Chauvet Wy, Boca Raton, FL 33496, USA'),
    'Boca Bridges',
    (SELECT id FROM public.users WHERE email = 'mrosoff@verizon.net' LIMIT 1),
    'manual_admin'
  ),
  (
    '9070 Chauvet Wy, Boca Raton, FL 33496, USA',
    public.normalize_address('9070 Chauvet Wy, Boca Raton, FL 33496, USA'),
    'Boca Bridges',
    (SELECT id FROM public.users WHERE email = 'dbrumback@aol.com' LIMIT 1),
    'manual_admin'
  ),
  (
    '17136 Ludovica Ln, Boca Raton, FL 33496, USA',
    public.normalize_address('17136 Ludovica Ln, Boca Raton, FL 33496, USA'),
    'Boca Bridges',
    (SELECT id FROM public.users WHERE email = 'cjpeyser@gmail.com' LIMIT 1),
    'manual_admin'
  ),
  (
    '17136 Ludovica Ln, Boca Raton, FL 33496, USA',
    public.normalize_address('17136 Ludovica Ln, Boca Raton, FL 33496, USA'),
    'Boca Bridges',
    (SELECT id FROM public.users WHERE email = 'judi.peyser@gmail.com' LIMIT 1),
    'manual_admin'
  )
ON CONFLICT (normalized_address) DO UPDATE SET
  mapping_source = EXCLUDED.mapping_source,
  created_by = EXCLUDED.created_by;