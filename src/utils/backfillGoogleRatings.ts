import { supabase } from "@/integrations/supabase/client";

export async function backfillGoogleRatings() {
  try {
    const { data, error } = await supabase.functions.invoke('backfill-google-ratings');
    
    if (error) {
      console.error('Error calling backfill function:', error);
      throw error;
    }
    
    console.log('Backfill results:', data);
    return data;
  } catch (error) {
    console.error('Failed to backfill Google ratings:', error);
    throw error;
  }
}

// Call this function to test the backfill
// Uncomment the line below and it will run when this file is imported
backfillGoogleRatings();