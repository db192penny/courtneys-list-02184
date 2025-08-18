-- Fix David's profile data (db@fivefourventures.com)
UPDATE public.users 
SET 
  name = 'David Birnbaum',
  address = '17443 Rosella Rd, Boca Raton, FL 33496, USA',
  street_name = 'rosella rd, boca raton, fl, usa',
  signup_source = 'community:boca-bridges'
WHERE email = 'db@fivefourventures.com' 
  AND name = 'Unknown User' 
  AND address = 'Address Not Provided'
  AND signup_source = 'fallback_recovery';