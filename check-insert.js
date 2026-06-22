import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kvqqyiykvyvjnkwczcwu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2cXF5aXlrdnl2am5rd2N6Y3d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NDMxMTksImV4cCI6MjA5NzMxOTExOX0.jwwwtSTLaVJaFs8ECA58aOn1VR1KUCb5UKSwm-odDdY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectColumnsByInsert(tableName) {
  // Try inserting a dummy row with an invalid UUID for pet_id or something
  // to see if we get the column names in the error, or if we insert a row
  // with a non-existent column, Postgres will tell us the column does not exist.
  // Alternatively, if we insert a valid-looking structure or just {}
  const { data, error } = await supabase.from(tableName).insert([{}]).select();
  if (error) {
    console.log(`== ${tableName} INSERT ERROR ==`);
    console.log(error);
  } else {
    console.log(`== ${tableName} INSERT SUCCESS ==`);
    console.log(data);
    // Delete the dummy row we just inserted
    if (data && data.length > 0) {
      const { error: delError } = await supabase.from(tableName).delete().eq('id', data[0].id);
      console.log(`Deleted dummy row:`, delError ? delError.message : 'success');
    }
  }
}

async function run() {
  await inspectColumnsByInsert('transport_requests');
  await inspectColumnsByInsert('security_deposits');
}

run();
