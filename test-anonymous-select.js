import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kvqqyiykvyvjnkwczcwu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2cXF5aXlrdnl2am5rd2N6Y3d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NDMxMTksImV4cCI6MjA5NzMxOTExOX0.jwwwtSTLaVJaFs8ECA58aOn1VR1KUCb5UKSwm-odDdY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase.from('pets').select('*').limit(1);
  console.log("Anonymous select pets:", error ? error.message : `Success, row count: ${data.length}`);
  
  const { data: apps, error: appErr } = await supabase.from('adoption_applications').select('*').limit(1);
  console.log("Anonymous select adoption_applications:", appErr ? appErr.message : `Success, row count: ${apps.length}`);

  const { data: adoptions, error: adoptErr } = await supabase.from('adoptions').select('*').limit(1);
  console.log("Anonymous select adoptions:", adoptErr ? adoptErr.message : `Success, row count: ${adoptions.length}`);
}

run();
