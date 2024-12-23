import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.SUPABASE_PROJECT_URL || !process.env.SUPABASE_API_KEY) {
  throw new Error('Missing Supabase credentials in environment variables');
}

export const supabase = createClient(
  process.env.SUPABASE_PROJECT_URL,
  process.env.SUPABASE_API_KEY
);

// Test the connection
supabase.from('test').select('*').limit(1).single()
  .then(() => console.log('Successfully connected to Supabase'))
  .catch(error => console.error('Error connecting to Supabase:', error.message));
