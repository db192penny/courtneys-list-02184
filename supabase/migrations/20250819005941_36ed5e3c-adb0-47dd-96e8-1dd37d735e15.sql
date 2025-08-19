-- Fix all unmapped Boca Bridges addresses
INSERT INTO public.household_hoa (household_address, normalized_address, hoa_name, created_by)
VALUES 
  ('17449 Rosella Rd, Boca Raton, FL 33496, USA', '17449 rosella rd, boca raton, fl 33496, usa', 'Boca Bridges', 
   (SELECT id FROM public.users WHERE email = 'lauren@lcsm.com')),
  ('9276 Biaggio Rd, Boca Raton, FL 33496, USA', '9276 biaggio rd, boca raton, fl 33496, usa', 'Boca Bridges', 
   (SELECT id FROM public.users WHERE email = 'tanyaajay18@gmail.com')),
  ('9270 Biaggio Rd, Boca Raton, FL 33496, USA', '9270 biaggio rd, boca raton, fl 33496, usa', 'Boca Bridges', 
   (SELECT id FROM public.users WHERE email = 'gmichos78@yahoo.com')),
  ('9570 Vescovato Way, Boca Raton, FL 33496, USA', '9570 vescovato way, boca raton, fl 33496, usa', 'Boca Bridges', 
   (SELECT id FROM public.users WHERE email = 'mitchell.altro@gmail.com')),
  ('9051 Chauvet Wy, Boca Raton, FL 33496, USA', '9051 chauvet wy, boca raton, fl 33496, usa', 'Boca Bridges', 
   (SELECT id FROM public.users WHERE email = 'mkongara@gmail.com')),
  ('17454 Rosella Rd, Boca Raton, FL 33496, USA', '17454 rosella rd, boca raton, fl 33496, usa', 'Boca Bridges', 
   (SELECT id FROM public.users WHERE email = 'rgarberness@gmail.com')),
  ('17338 Ristretto Trl, Boca Raton, FL 33496, USA', '17338 ristretto trl, boca raton, fl 33496, usa', 'Boca Bridges', 
   (SELECT id FROM public.users WHERE email = 'kraigtuber@gmail.com')),
  ('9044 Fiano Pl, Boca Raton, FL 33496, USA', '9044 fiano pl, boca raton, fl 33496, usa', 'Boca Bridges', 
   (SELECT id FROM public.users WHERE email = 'bcohen@icm.com'));