import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kvqqyiykvyvjnkwczcwu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2cXF5aXlrdnl2am5rd2N6Y3d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NDMxMTksImV4cCI6MjA5NzMxOTExOX0.jwwwtSTLaVJaFs8ECA58aOn1VR1KUCb5UKSwm-odDdY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  try {
    const { data, error } = await supabase.storage.createBucket('pet-photos', {
      public: true,
      allowedMimeTypes: ['image/*'],
      fileSizeLimit: 5242880
    });
    if (error) {
      console.error('Error creating bucket:', error);
    } else {
      console.log('Bucket created successfully:', data);
    }
  } catch (e) {
    console.error(e);
  }
}

check();
