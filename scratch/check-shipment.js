const supabaseUrl = 'https://kvqqyiykvyvjnkwczcwu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2cXF5aXlrdnl2am5rd2N6Y3d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NDMxMTksImV4cCI6MjA5NzMxOTExOX0.jwwwtSTLaVJaFs8ECA58aOn1VR1KUCb5UKSwm-odDdY';

async function run() {
  const res = await fetch(supabaseUrl + '/rest/v1/', {
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': 'Bearer ' + supabaseAnonKey,
      'Accept': 'application/openapi+json'
    }
  });
  const data = await res.json();
  console.log("Top-level keys:", Object.keys(data));
  if (data.definitions) {
    console.log("Found definitions. Keys:", Object.keys(data.definitions).filter(k => k.includes('shipment') || k.includes('transport')));
    if (data.definitions.shipment_status_updates) {
      console.log("== shipment_status_updates definitions ==");
      console.log(JSON.stringify(data.definitions.shipment_status_updates, null, 2));
    }
  } else if (data.components?.schemas) {
    console.log("Found components.schemas. Keys:", Object.keys(data.components.schemas).filter(k => k.includes('shipment') || k.includes('transport')));
  } else {
    console.log("Root content preview:", JSON.stringify(data).substring(0, 1000));
  }
}

run();
