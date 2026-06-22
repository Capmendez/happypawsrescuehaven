import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kvqqyiykvyvjnkwczcwu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2cXF5aXlrdnl2am5rd2N6Y3d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NDMxMTksImV4cCI6MjA5NzMxOTExOX0.jwwwtSTLaVJaFs8ECA58aOn1VR1KUCb5UKSwm-odDdY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data: requests, error } = await supabase
    .from('transport_requests')
    .select('*, pets(name), adopters(full_name)')
    .limit(5);

  if (error) {
    console.error('Error fetching transport requests:', error);
    return;
  }

  console.log('Transport requests:', requests);

  if (requests.length > 0) {
    const tr = requests[0];
    console.log(`Using transport request ID: ${tr.id}`);
  }
}

run();
