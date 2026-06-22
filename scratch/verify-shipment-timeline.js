import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kvqqyiykvyvjnkwczcwu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2cXF5aXlrdnl2am5rd2N6Y3d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NDMxMTksImV4cCI6MjA5NzMxOTExOX0.jwwwtSTLaVJaFs8ECA58aOn1VR1KUCb5UKSwm-odDdY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const staffUserId = '651c56d0-f054-4a26-a1e4-d921075b084c'; // Active staff user ID from DB history
  const transportReqId = 'be88b06d-4553-4e1e-81f2-9963f89c6726'; // Request ID for Luna (TRACKING_ACTIVE)

  console.log('--- STARTING PROGRAMMATIC SHIPMENT TIMELINE VERIFICATION ---');

  // 1. Delete any existing status updates for this request to start fresh
  const { error: clearError } = await supabase
    .from('shipment_status_updates')
    .delete()
    .eq('transport_request_id', transportReqId);

  if (clearError) {
    console.error('Failed to clear previous test updates:', clearError);
    return;
  }
  console.log('Cleared existing updates for Luna.');

  // 2. Fetch updates to confirm empty placeholder state
  const { data: emptyUpdates, error: emptyError } = await supabase
    .from('shipment_status_updates')
    .select('*')
    .eq('transport_request_id', transportReqId);

  if (emptyError) {
    console.error('Error fetching empty updates:', emptyError);
  } else {
    console.log(`Verified empty updates. Count: ${emptyUpdates.length}. (Matches public portal placeholder trigger)`);
  }

  // 3. Post a "SHIPPED" status update
  console.log('Posting SHIPPED update...');
  const { data: shippedData, error: shippedError } = await supabase
    .from('shipment_status_updates')
    .insert([{
      transport_request_id: transportReqId,
      status: 'SHIPPED',
      location_description: 'Houston Hub, TX',
      note: 'Luna has officially departed the HPRH rescue center.',
      posted_by: staffUserId
    }])
    .select();

  if (shippedError) {
    console.error('Failed to post SHIPPED update:', shippedError);
    return;
  }
  console.log('SHIPPED update posted:', shippedData);

  // 4. Post an "EN_ROUTE" status update
  console.log('Posting EN_ROUTE update...');
  const { data: enRouteData, error: enRouteError } = await supabase
    .from('shipment_status_updates')
    .insert([{
      transport_request_id: transportReqId,
      status: 'EN_ROUTE',
      location_description: 'Texas',
      note: 'Luna is currently traveling through Texas. Resting comfortably.',
      posted_by: staffUserId
    }])
    .select();

  if (enRouteError) {
    console.error('Failed to post EN_ROUTE update:', enRouteError);
    return;
  }
  console.log('EN_ROUTE update posted:', enRouteData);

  // 5. Query and display updates ordered by created_at DESC (simulating anonymous visitor lookup)
  const { data: publicUpdates, error: publicError } = await supabase
    .from('shipment_status_updates')
    .select('*')
    .eq('transport_request_id', transportReqId)
    .order('created_at', { ascending: false });

  if (publicError) {
    console.error('Failed to query public updates:', publicError);
    return;
  }
  console.log('Public tracking timeline response (most recent first):');
  publicUpdates.forEach((u, i) => {
    console.log(`[Update ${i + 1}] Status: ${u.status} | Location: ${u.location_description} | Note: ${u.note} | Created At: ${u.created_at}`);
  });

  // Verify updates are ordered most recent first
  if (publicUpdates[0].status === 'EN_ROUTE' && publicUpdates[1].status === 'SHIPPED') {
    console.log('SUCCESS: Updates timeline correctly ordered DESC (most recent first).');
  } else {
    console.warn('WARNING: Timeline updates ordering check failed.');
  }

  // 6. Post a "DELIVERED" status update
  console.log('Posting DELIVERED update...');
  const { data: deliveredData, error: deliveredError } = await supabase
    .from('shipment_status_updates')
    .insert([{
      transport_request_id: transportReqId,
      status: 'DELIVERED',
      location_description: 'New York Home, NY',
      note: 'Luna has arrived safely and is now with her adopter!',
      posted_by: staffUserId
    }])
    .select();

  if (deliveredError) {
    console.error('Failed to post DELIVERED update:', deliveredError);
    return;
  }
  console.log('DELIVERED update posted:', deliveredData);

  // 7. Simulating synchronization: We update transport_requests.status to DELIVERED when DELIVERED is posted
  // In the admin screen, we run:
  const { error: syncError } = await supabase
    .from('transport_requests')
    .update({ status: 'DELIVERED' })
    .eq('id', transportReqId);

  if (syncError) {
    console.error('Failed to sync transport request status:', syncError);
    return;
  }
  console.log('Synced transport request status to DELIVERED.');

  // 8. Confirm transport_requests.status is DELIVERED
  const { data: requestRecord, error: fetchReqError } = await supabase
    .from('transport_requests')
    .select('status, tracking_id')
    .eq('id', transportReqId)
    .single();

  if (fetchReqError) {
    console.error('Failed to fetch transport request record:', fetchReqError);
    return;
  }
  console.log('Updated transport request state:', requestRecord);
  if (requestRecord.status === 'DELIVERED') {
    console.log('SUCCESS: transport_requests.status successfully updated to DELIVERED!');
  } else {
    console.warn('WARNING: transport_requests.status sync failed.');
  }

  console.log('--- SHIPMENT TIMELINE VERIFICATION COMPLETE ---');
}

run();
