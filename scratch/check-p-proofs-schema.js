const supabaseUrl = 'https://kvqqyiykvyvjnkwczcwu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2cXF5aXlrdnl2am5rd2N6Y3d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NDMxMTksImV4cCI6MjA5NzMxOTExOX0.jwwwtSTLaVJaFs8ECA58aOn1VR1KUCb5UKSwm-odDdY';

async function run() {
  const res = await fetch(supabaseUrl + '/rest/v1/payment_proofs?limit=1', {
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': 'Bearer ' + supabaseAnonKey,
      'Prefer': 'count=exact'
    }
  });
  console.log("payment_proofs headers:", [...res.headers.entries()]);
  const data = await res.json();
  console.log("payment_proofs sample:", data);
}

run();
