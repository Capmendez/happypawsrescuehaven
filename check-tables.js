import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kvqqyiykvyvjnkwczcwu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2cXF5aXlrdnl2am5rd2N6Y3d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NDMxMTksImV4cCI6MjA5NzMxOTExOX0.jwwwtSTLaVJaFs8ECA58aOn1VR1KUCb5UKSwm-odDdY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectTable(tableName) {
  // We can query supabase.rpc or query some rows or use REST query parameters.
  // Actually, we can just do a select limit 1 or a mock query to see metadata/errors or query information_schema if enabled,
  // or query the postgrest API structure. Let's do a select limit 1 of the tables.
  const { data, error } = await supabase.from(tableName).select('*').limit(1);
  if (error) {
    console.error(`Error querying ${tableName}:`, error.message);
  } else {
    console.log(`Table ${tableName} success, columns:`, data.length > 0 ? Object.keys(data[0]) : 'no rows, can\'t inspect columns directly');
  }
}

async function run() {
  console.log("Inspecting tables...");
  await inspectTable('bank_accounts');
  await inspectTable('transport_requests');
  await inspectTable('security_deposits');
  await inspectTable('payment_proofs');
  await inspectTable('transport_fee_tiers');
  await inspectTable('app_settings');
}

run();
