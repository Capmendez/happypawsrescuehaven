import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kvqqyiykvyvjnkwczcwu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2cXF5aXlrdnl2am5rd2N6Y3d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NDMxMTksImV4cCI6MjA5NzMxOTExOX0.jwwwtSTLaVJaFs8ECA58aOn1VR1KUCb5UKSwm-odDdY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const mockUpdate = {
    transport_request_id: 'be88b06d-4553-4e1e-81f2-9963f89c6726',
    status: 'SHIPPED',
    location_description: 'Houston Hub, TX',
    note: 'The pet is now en route on transport.',
    posted_by: '651c56d0-f054-4a26-a1e4-d921075b084c'
  };

  const { data, error } = await supabase
    .from('shipment_status_updates')
    .insert([mockUpdate])
    .select();

  if (error) {
    console.error('Insert failed:', error);
  } else {
    console.log('Insert succeeded! Inserted row:', data);

    // Delete it to keep the DB clean
    const { error: deleteError } = await supabase
      .from('shipment_status_updates')
      .delete()
      .eq('id', data[0].id);

    if (deleteError) {
      console.error('Delete failed:', deleteError);
    } else {
      console.log('Deleted successfully.');
    }
  }
}

run();
