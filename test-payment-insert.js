import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kvqqyiykvyvjnkwczcwu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2cXF5aXlrdnl2am5rd2N6Y3d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NDMxMTksImV4cCI6MjA5NzMxOTExOX0.jwwwtSTLaVJaFs8ECA58aOn1VR1KUCb5UKSwm-odDdY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const testData = {
    method_type: 'zelle',
    handle: 'finance@happypawsrescue.org',
    display_label: 'Pay via Zelle',
    account_name: 'Happy Paws Rescue Haven Inc.',
    currency: 'USD',
    is_active: false
  };

  const { data, error } = await supabase.from('bank_accounts').insert([testData]).select();
  if (error) {
    console.error("Insert Zelle failed:", error.message, error.details);
  } else {
    console.log("Insert Zelle succeeded!", data);
    // Delete the inserted row
    const { error: delError } = await supabase.from('bank_accounts').delete().eq('id', data[0].id);
    console.log("Delete succeeded:", delError ? delError.message : 'yes');
  }
}

run();
