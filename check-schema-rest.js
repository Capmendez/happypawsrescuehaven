import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kvqqyiykvyvjnkwczcwu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2cXF5aXlrdnl2am5rd2N6Y3d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NDMxMTksImV4cCI6MjA5NzMxOTExOX0.jwwwtSTLaVJaFs8ECA58aOn1VR1KUCb5UKSwm-odDdY';

async function run() {
  const res = await fetch(supabaseUrl + '/rest/v1/', {
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': 'Bearer ' + supabaseAnonKey
    }
  });
  const data = await res.json();
  console.log("Keys in root:", Object.keys(data));
  if (data.components?.schemas) {
    console.log("Found components.schemas. Keys:", Object.keys(data.components.schemas));
    console.log("== transport_requests schema ==");
    console.log(JSON.stringify(data.components.schemas.transport_requests, null, 2));
    console.log("== security_deposits schema ==");
    console.log(JSON.stringify(data.components.schemas.security_deposits, null, 2));
    console.log("== transport_fee_tiers schema ==");
    console.log(JSON.stringify(data.components.schemas.transport_fee_tiers, null, 2));
  } else {
    console.log("Root data snippet:", JSON.stringify(data).substring(0, 500));
  }
}

run();
