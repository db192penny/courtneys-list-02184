-- Update the user's address to the correct one
UPDATE public.users 
SET 
  address = '17443 Rosella Rd, Boca Raton, FL 33496, USA',
  formatted_address = '17443 Rosella Rd, Boca Raton, FL 33496, USA',
  street_name = 'rosella rd'
WHERE email = 'davebirnbaum@gmail.com';