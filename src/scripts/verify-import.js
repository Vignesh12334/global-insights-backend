import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_PROJECT_URL,
  process.env.SUPABASE_API_KEY
);

async function verifyImport() {
  try {
    // Check reference tables
    const tables = ['sectors', 'regions', 'countries', 'topics', 'pestle', 'sources'];
    
    console.log('Checking reference tables:');
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('count');
      
      if (error) throw error;
      console.log(`${table}: ${data[0].count} records`);
    }

    // Check insights table
    const { data: insights, error: insightsError } = await supabase
      .from('insights')
      .select(`
        *,
        sector:sectors(name),
        region:regions(name),
        country:countries(name),
        topic:topics(name),
        pestle:pestle(name),
        source:sources(name)
      `)
      .limit(1);

    if (insightsError) throw insightsError;

    console.log('\nSample insight with relations:');
    console.log(JSON.stringify(insights[0], null, 2));

    // Get total insights count
    const { data: totalCount, error: countError } = await supabase
      .from('insights')
      .select('count');

    if (countError) throw countError;
    console.log(`\nTotal insights: ${totalCount[0].count}`);

  } catch (error) {
    console.error('Error verifying import:', error);
  }
}

verifyImport();
