import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kvqqyiykvyvjnkwczcwu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2cXF5aXlrdnl2am5rd2N6Y3d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NDMxMTksImV4cCI6MjA5NzMxOTExOX0.jwwwtSTLaVJaFs8ECA58aOn1VR1KUCb5UKSwm-odDdY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("Testing write to transport_fee_tiers...");
  const tempTier = {
    min_distance_miles: 9999,
    max_distance_miles: 10000,
    fee_amount: 999,
    currency: 'USD',
    is_active: false
  };

  const { data, error } = await supabase
    .from('transport_fee_tiers')
    .insert([tempTier])
    .select();

  if (error) {
    console.error("Insert failed:", error.message);
  } else {
    console.log("Insert success!", data);
    const id = data[0].id;
    console.log("Cleaning up, deleting tier ID:", id);
    const { error: deleteError } = await supabase
      .from('transport_fee_tiers')
      .delete()
      .eq('id', id);
    if (deleteError) {
      console.error("Delete failed:", deleteError.message);
    } else {
      console.log("Delete success!");
    }
  }
}

run();
