import fs from 'fs';
import { parse } from 'csv-parse';
import { createClient } from '@supabase/supabase-js';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { supabase } from '../db';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

console.error('Script started...');

// Verify environment variables
if (!process.env.SUPABASE_PROJECT_URL || !process.env.SUPABASE_API_KEY) {
  console.error('Error: Missing Supabase environment variables');
  process.exit(1);
}

console.error('Environment variables loaded:', {
  url: process.env.SUPABASE_PROJECT_URL,
  key: process.env.SUPABASE_API_KEY.substring(0, 10) + '...'
});

async function insertUniqueValues(tableName, values) {
  const uniqueValues = [...new Set(values)].filter(Boolean);
  const records = uniqueValues.map(name => ({ name }));
  
  if (records.length === 0) return {};

  const { data, error } = await supabase
    .from(tableName)
    .upsert(records, { onConflict: 'name' })
    .select('id, name');

  if (error) {
    console.error(`Error inserting ${tableName}:`, error);
    return {};
  }

  return data.reduce((acc, item) => {
    acc[item.name.toLowerCase()] = item.id;
    return acc;
  }, {});
}

async function processCSV() {
  try {
    console.error('Starting CSV import process...');
    
    // Test Supabase connection
    const { data: testData, error: testError } = await supabase.from('sectors').select('count').limit(1);
    if (testError) {
      throw new Error(`Supabase connection failed: ${testError.message}`);
    }
    console.error('Supabase connection successful');

    const records = [];
    const sectors = new Set();
    const regions = new Set();
    const countries = new Set();
    const topics = new Set();
    const pestles = new Set();
    const sources = new Set();

    // Read and parse CSV
    await new Promise((resolve, reject) => {
      const stream = fs.createReadStream('src/economic-data.csv');
      
      stream.on('error', (error) => {
        console.error('Error reading CSV file:', error);
        reject(error);
      });

      stream
        .pipe(parse({ columns: true, skip_empty_lines: true }))
        .on('data', (record) => {
          records.push(record);
          if (record.sector) sectors.add(record.sector.trim());
          if (record.region) regions.add(record.region.trim());
          if (record.country) countries.add(record.country.trim());
          if (record.topic) topics.add(record.topic.trim());
          if (record.pestle) pestles.add(record.pestle.trim());
          if (record.source) sources.add(record.source.trim());
        })
        .on('end', resolve)
        .on('error', reject);
    });

    console.error('CSV parsing completed. Inserting reference data...');

    // Insert reference data and get ID mappings
    const [sectorIds, regionIds, countryIds, topicIds, pestleIds, sourceIds] = await Promise.all([
      insertUniqueValues('sectors', sectors),
      insertUniqueValues('regions', regions),
      insertUniqueValues('countries', countries),
      insertUniqueValues('topics', topics),
      insertUniqueValues('pestle', pestles),
      insertUniqueValues('sources', sources),
    ]);

    console.error('Reference data inserted. Processing insights...');

    // Process records in chunks to avoid overwhelming the database
    const chunkSize = 50;
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize).map(record => ({
        end_year: record.end_year ? parseInt(record.end_year) : null,
        intensity: record.intensity ? parseInt(record.intensity) : null,
        impact: record.impact ? parseInt(record.impact) : null,
        likelihood: record.likelihood ? parseInt(record.likelihood) : null,
        start_year: record.start_year ? parseInt(record.start_year) : null,
        added: record.added || null,
        published: record.published || null,
        url: record.url || null,
        insight: record.insight || null,
        title: record.title || null,
        sector_id: record.sector ? sectorIds[record.sector.toLowerCase()] : null,
        region_id: record.region ? regionIds[record.region.toLowerCase()] : null,
        country_id: record.country ? countryIds[record.country.toLowerCase()] : null,
        topic_id: record.topic ? topicIds[record.topic.toLowerCase()] : null,
        pestle_id: record.pestle ? pestleIds[record.pestle.toLowerCase()] : null,
        source_id: record.source ? sourceIds[record.source.toLowerCase()] : null,
        relevance: record.relevance ? parseInt(record.relevance) : null
      }));

      const { error } = await supabase
        .from('insights')
        .insert(chunk);

      if (error) {
        console.error('Error inserting insights:', error);
        continue;
      }

      console.error(`Processed ${i + chunk.length} of ${records.length} records`);
    }

    console.error('Data import completed successfully!');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the import
processCSV();
