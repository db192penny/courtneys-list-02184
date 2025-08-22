-- Manually create the missing user profile for davebirnbaum@gmail.com
SELECT public.fix_specific_orphaned_user('davebirnbaum@gmail.com', 'Dave Birnbaum', '1234 Test Street, Boca Raton, FL 33433');