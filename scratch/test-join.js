import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kvqqyiykvyvjnkwczcwu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2cXF5aXlrdnl2am5rd2N6Y3d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NDMxMTksImV4cCI6MjA5NzMxOTExOX0.jwwwtSTLaVJaFs8ECA58aOn1VR1KUCb5UKSwm-odDdY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  // Let's test a select query with a join on staff.
  // We'll see if PostgREST returns a syntax/bad-request error or a clean empty array.
  const { data, error } = await supabase
    .from('shipment_status_updates')
    .select('*, staff:posted_by(full_name)')
    .limit(1);

  if (error) {
    console.error('Join error with staff:posted_by(full_name):', error);
  } else {
    console.log('Join succeeded!', data);
  }

  // Let's also test staff:posted_by(*)
  const { data: data2, error: error2 } = await supabase
    .from('shipment_status_updates')
    .select('*, staff!inner(full_name)')
    .limit(1);

  if (error2) {
    console.error('Join inner error:', error2.message);
  } else {
    console.log('Inner join succeeded!', data2);
  }
}

run();
