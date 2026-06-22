const supabaseUrl = 'https://kvqqyiykvyvjnkwczcwu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2cXF5aXlrdnl2am5rd2N6Y3d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NDMxMTksImV4cCI6MjA5NzMxOTExOX0.jwwwtSTLaVJaFs8ECA58aOn1VR1KUCb5UKSwm-odDdY';

async function inspectTable(tableName) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${tableName}`, {
    method: 'OPTIONS',
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': 'Bearer ' + supabaseAnonKey
    }
  });
  const data = await res.json();
  console.log(`== ${tableName} OPTIONS ==`);
  console.log(JSON.stringify(data, null, 2));
}

async function run() {
  await inspectTable('transport_requests');
  await inspectTable('security_deposits');
  await inspectTable('payment_proofs');
  await inspectTable('transport_fee_tiers');
}

run();
