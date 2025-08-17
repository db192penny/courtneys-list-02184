import { supabase } from "@/integrations/supabase/client";

export async function testGoogleAPI() {
  try {
    console.log('Testing Google API via edge function...');
    
    const { data, error } = await supabase.functions.invoke('test-google-api');
    
    if (error) {
      console.error('Error calling test function:', error);
      throw error;
    }
    
    console.log('Google API test results:', data);
    return data;
  } catch (error) {
    console.error('Failed to test Google API:', error);
    throw error;
  }
}

export async function testPlaceDetails(placeId: string) {
  try {
    console.log('Testing place details for:', placeId);
    
    const { data, error } = await supabase.functions.invoke('fetch-google-place-details', {
      body: { place_id: placeId }
    });
    
    if (error) {
      console.error('Error calling fetch-google-place-details:', error);
      throw error;
    }
    
    console.log('Place details test results:', data);
    return data;
  } catch (error) {
    console.error('Failed to test place details:', error);
    throw error;
  }
}

// Test with known working Place IDs
export async function runDiagnosticTests() {
  const tests = [
    {
      name: 'Google API Basic Test',
      test: () => testGoogleAPI()
    },
    {
      name: 'Sydney Google Office Place Details',
      test: () => testPlaceDetails('ChIJN1t_tDeuEmsRUsoyG83frY4')
    },
    {
      name: 'New York Times Square Place Details', 
      test: () => testPlaceDetails('ChIJmQJIxlVYwokRLgeuocVOGVU')
    }
  ];

  const results = [];
  
  for (const { name, test } of tests) {
    try {
      console.log(`\n=== Running ${name} ===`);
      const result = await test();
      results.push({ name, success: true, result });
      console.log(`✅ ${name} passed`);
    } catch (error) {
      results.push({ name, success: false, error: error.message });
      console.log(`❌ ${name} failed:`, error.message);
    }
  }
  
  return results;
}