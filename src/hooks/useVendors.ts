import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useVendors = (category?: string, searchQuery?: string, communitySlug?: string) => {
  return useQuery({
    queryKey: ['vendors', category, searchQuery, communitySlug],
    queryFn: async () => {
      let query = supabase
        .from('vendors')
        .select(`
          *,
          category:categories(name, slug),
          reviews(rating)
        `);

      // Add community filter based on URL slug
      if (communitySlug) {
        // Map URL slugs to database community names
        const communityName = communitySlug === 'boca-bridges' ? 'Boca Bridges' : 
                             communitySlug === 'the-bridges' ? 'The Bridges' : 
                             communitySlug === 'the-oaks' ? 'The Oaks' : 
                             'Boca Bridges';
        
        query = query.eq('community', communityName);
      }

      // Keep existing category filter
      if (category && category !== 'all') {
        query = query.eq('category.slug', category);
      }

      // Keep existing search filter
      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    },
    enabled: true,
  });
};
