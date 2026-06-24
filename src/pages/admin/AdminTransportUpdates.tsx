import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { TransportRequest, ShipmentStatusUpdate, ShipmentStatus } from '../../lib/types';
import Container from '../../components/ui/Container';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import Badge from '../../components/ui/Badge';
import { 
  Search, 
  MapPin, 
  Truck, 
  Loader2, 
  Check, 
  ShieldAlert, 
  History
} from 'lucide-react';

export const AdminTransportUpdates: React.FC = () => {
  const [requests, setRequests] = useState<TransportRequest[]>([]);
  const [updates, setUpdates] = useState<ShipmentStatusUpdate[]>([]);
  const [staffUsers, setStaffUsers] = useState<Record<string, string>>({}); // user_id -> full_name
  const [selectedRequest, setSelectedRequest] = useState<TransportRequest | null>(null);
  
  // Loading & error states
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Search query
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form State
  const [formStatus, setFormStatus] = useState<ShipmentStatus>('PENDING');
  const [formLocation, setFormLocation] = useState('');
  const [formNote, setFormNote] = useState('');
  
  // Toast notifications
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'warning' | 'error';
  } | null>(null);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Fetch transport requests and staff list
  const fetchInitialData = async () => {
    try {
      setLoadingRequests(true);
      setErrorMsg(null);

      // 1. Fetch transport requests where tracking_id is active / non-null
      const { data: reqData, error: reqError } = await supabase
        .from('transport_requests')
        .select('*, pets(*), adopters(*)')
        .not('tracking_id', 'is', null)
        .order('created_at', { ascending: false });

      if (reqError) throw reqError;
      setRequests((reqData || []) as unknown as TransportRequest[]);

      // 2. Fetch staff users to map posted_by UUID to names
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('user_id, full_name');

      if (!staffError && staffData) {
        const staffMap: Record<string, string> = {};
        staffData.forEach(s => {
          staffMap[s.user_id] = s.full_name;
        });
        setStaffUsers(staffMap);
      }
    } catch (err: any) {
      console.error('Error fetching admin transport data:', err);
      setErrorMsg(err.message || 'Failed to sync route requests registry.');
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Fetch timeline updates for the selected request
  const fetchTimeline = async (reqId: string) => {
    try {
      setLoadingTimeline(true);
      const { data, error } = await supabase
        .from('shipment_status_updates')
        .select('*')
        .eq('transport_request_id', reqId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUpdates((data || []) as ShipmentStatusUpdate[]);
    } catch (err: any) {
      console.error('Error fetching shipment updates:', err);
      setNotification({
        message: 'Could not fetch history timeline for this shipment.',
        type: 'error'
      });
    } finally {
      setLoadingTimeline(false);
    }
  };

  // Trigger loading timeline when selection changes
  useEffect(() => {
    if (selectedRequest) {
      fetchTimeline(selectedRequest.id);
      // Pre-fill next logical status based on most recent update status
      const latestUpdate = updates.find(u => u.transport_request_id === selectedRequest.id);
      if (latestUpdate) {
        setFormStatus(latestUpdate.status);
      } else {
        setFormStatus('PENDING');
      }
      setFormLocation('');
      setFormNote('');
    } else {
      setUpdates([]);
    }
  }, [selectedRequest]);

  // Handle posting a new update
  const handleSubmitUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    try {
      setSubmitting(true);
      setErrorMsg(null);

      // Get logged in staff member
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Authorized staff credentials expired. Please login again.');
      }

      // Insert new update log entry
      const { error: insertError } = await supabase
        .from('shipment_status_updates')
        .insert([{
          transport_request_id: selectedRequest.id,
          status: formStatus,
          location_description: formLocation.trim() || null,
          note: formNote.trim() || null,
          posted_by: user.id
        }]);

      if (insertError) throw insertError;

      // Special transition logic: If staff posts DELIVERED, synchronize transport_requests status
      if (formStatus === 'DELIVERED') {
        const { error: updateReqError } = await supabase
          .from('transport_requests')
          .update({ status: 'DELIVERED' })
          .eq('id', selectedRequest.id);

        if (updateReqError) {
          console.error('Failed to sync transport request status to DELIVERED:', updateReqError);
          setNotification({
            message: 'Status update posted, but failed to sync transport request status to DELIVERED.',
            type: 'warning'
          });
        } else {
          // Update selectedRequest local state status
          setSelectedRequest(prev => prev ? { ...prev, status: 'DELIVERED' } : null);
        }
      }

      setNotification({
        message: `Successfully posted status update: "${formStatus.replace(/_/g, ' ')}"`,
        type: 'success'
      });

      // Clear fields
      setFormLocation('');
      setFormNote('');

      // Refresh data
      await fetchTimeline(selectedRequest.id);
      await fetchInitialData();
    } catch (err: any) {
      console.error('Error posting shipment update:', err);
      setNotification({
        message: err.message || 'Failed to post shipment status update.',
        type: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Filter requests based on search query
  const filteredRequests = requests.filter(req => {
    const petName = req.pets?.name?.toLowerCase() || '';
    const adopterName = req.adopters?.full_name?.toLowerCase() || '';
    const trackingId = req.tracking_id?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return petName.includes(query) || adopterName.includes(query) || trackingId.includes(query);
  });



  // To do this simply, let's load all updates on initial load too!
  const [allLatestUpdates, setAllLatestUpdates] = useState<Record<string, ShipmentStatusUpdate>>({});

  const fetchAllLatestUpdates = async () => {
    try {
      const { data, error } = await supabase
        .from('shipment_status_updates')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const latestMap: Record<string, ShipmentStatusUpdate> = {};
        data.forEach((u: ShipmentStatusUpdate) => {
          if (!latestMap[u.transport_request_id]) {
            latestMap[u.transport_request_id] = u;
          }
        });
        setAllLatestUpdates(latestMap);
      }
    } catch (e) {
      console.error('Error fetching all updates:', e);
    }
  };

  useEffect(() => {
    fetchAllLatestUpdates();
  }, [requests]);

  const getStatusBadgeStyle = (status: string) => {
    const isHoldOrCancelled = ['ON_HOLD', 'CANCELLED'].includes(status);
    const isDelivered = status === 'DELIVERED';
    
    if (isHoldOrCancelled) {
      return 'bg-hprh-clay/10 border-hprh-clay/30 text-hprh-clay';
    }
    if (isDelivered) {
      return 'bg-hprh-gold/15 border-hprh-gold/30 text-hprh-gold/90';
    }
    return 'bg-hprh-sage/10 border-hprh-sage/30 text-hprh-sage';
  };

  return (
    <div className="py-12 bg-hprh-paper text-hprh-pine font-sans min-h-screen">
      <Container className="space-y-8">
        
        {/* Page Header */}
        <div className="border-b border-hprh-pine/10 pb-5">
          <span className="font-mono text-xs uppercase tracking-widest text-hprh-sage font-bold block mb-1">
            Transit Logs Management
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-hprh-pine">
            Shipment Transport Updates
          </h1>
          <p className="text-xs text-hprh-pine/50 mt-1">
            Log physical tracking and shipment events for active pet transports en route to adopters.
          </p>
        </div>

        {errorMsg && (
          <div className="bg-hprh-clay/10 border border-hprh-clay/20 text-hprh-pine p-4 rounded text-xs flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-hprh-clay flex-shrink-0" />
            <div className="space-y-1">
              <span className="font-mono uppercase font-bold text-hprh-clay block">Registry Sync Failure</span>
              <p className="leading-relaxed">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Master-Detail Split Screen Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* LEFT COLUMN: Shipments List Sidebar */}
          <div className="space-y-4 lg:col-span-1">
            <div className="bg-hprh-paper-dark border border-hprh-pine/15 rounded p-4 shadow-sm space-y-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-hprh-sage"></div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-hprh-pine/50 font-bold block">
                Active Shipments Search
              </span>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Filter by Pet, Adopter, ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-hprh-paper border-2 border-hprh-pine/15 focus:border-hprh-sage focus:ring-1 focus:ring-hprh-sage/20 rounded py-2 px-3 pl-8 text-xs font-sans placeholder-hprh-pine/40 text-hprh-pine outline-none transition-all"
                />
                <Search className="w-3.5 h-3.5 text-hprh-pine/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* List Group */}
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {loadingRequests ? (
                <div className="text-center py-10 space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-hprh-sage mx-auto" />
                  <span className="font-mono text-[9px] uppercase text-hprh-pine/40">Loading Registry...</span>
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-hprh-pine/15 rounded bg-hprh-paper-dark/30">
                  <span className="text-xs text-hprh-pine/45 font-sans italic block">No active shipments found.</span>
                </div>
              ) : (
                filteredRequests.map(req => {
                  const isSelected = selectedRequest?.id === req.id;
                  const latestUpdate = allLatestUpdates[req.id];
                  const displayStatus = latestUpdate ? latestUpdate.status : 'PREPARING';
                  const displayLocation = latestUpdate?.location_description || '';

                  return (
                    <div
                      key={req.id}
                      onClick={() => setSelectedRequest(req)}
                      className={`p-4 border rounded shadow-sm text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-hprh-pine text-hprh-paper border-hprh-pine scale-[1.01]'
                          : 'bg-hprh-paper-dark border-hprh-pine/15 hover:border-hprh-pine/35 text-hprh-pine'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <span className={`text-[8px] font-mono uppercase tracking-wider block ${
                            isSelected ? 'text-hprh-paper/50' : 'text-hprh-pine/40'
                          }`}>
                            {req.tracking_id}
                          </span>
                          <h4 className="font-display font-extrabold text-sm leading-tight">
                            {req.pets?.name || 'Deleted Case'}
                          </h4>
                          <span className={`text-[10px] font-sans block ${
                            isSelected ? 'text-hprh-paper/70' : 'text-hprh-pine/60'
                          }`}>
                            Adopter: {req.adopters?.full_name || 'Anonymous'}
                          </span>
                        </div>
                        
                        <div className="text-right flex flex-col items-end gap-1.5">
                          {isSelected ? (
                            <span className="text-[8px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 border rounded-sm bg-hprh-paper/10 border-hprh-paper/20 text-hprh-paper">
                              {displayStatus.replace(/_/g, ' ')}
                            </span>
                          ) : (
                            <Badge status={displayStatus} className="text-[8px] px-1.5 py-0.2" />
                          )}
                          {displayLocation && (
                            <span className={`text-[8px] font-mono font-bold block truncate max-w-[80px] ${
                              isSelected ? 'text-hprh-paper/50' : 'text-hprh-pine/40'
                            }`}>
                              @ {displayLocation}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Shipment Detail, Timeline & Posting Form */}
          <div className="lg:col-span-2 space-y-6">
            {!selectedRequest ? (
              <div className="bg-hprh-paper-dark border border-hprh-pine/15 rounded p-12 text-center shadow-sm space-y-3 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-hprh-sage"></div>
                <Truck className="w-10 h-10 text-hprh-pine/20 mx-auto" />
                <h3 className="font-display text-lg font-bold text-hprh-pine/70">No Shipment Selected</h3>
                <p className="text-xs text-hprh-pine/45 max-w-sm mx-auto leading-relaxed">
                  Select a passenger shipment request from the list on the left to review its transit route history log and record new events.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* A. Selected Passenger Dossier Header */}
                <div className="bg-hprh-paper-dark border border-hprh-pine/15 rounded p-5 sm:p-6 shadow-sm space-y-4 text-left relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-hprh-sage"></div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-dashed border-hprh-pine/15 pb-4 gap-3">
                    <div>
                      <span className="font-mono text-[9px] uppercase tracking-widest text-hprh-pine/40 font-bold block mb-1">
                        Active Transit Case
                      </span>
                      <h2 className="font-display text-2xl font-extrabold text-hprh-pine">
                        Passenger: {selectedRequest.pets?.name || 'Deleted Case'}
                      </h2>
                      <span className="font-mono text-xs font-bold text-hprh-sage block">
                        Tracking ID: {selectedRequest.tracking_id}
                      </span>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="block text-[8px] font-mono uppercase tracking-widest text-hprh-pine/40 mb-1">Workflow Status</span>
                      <Badge status={selectedRequest.status} className="text-[10px] px-2.5 py-0.5" />
                    </div>
                  </div>

                  {/* Route details */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-sans text-hprh-pine/80">
                    <div>
                      <span className="block font-mono text-[8px] uppercase text-hprh-pine/40 font-bold">Adopter Client</span>
                      <p className="font-semibold">{selectedRequest.adopters?.full_name || 'Anonymous'}</p>
                      <p className="text-hprh-pine/50 text-[10px] truncate">{selectedRequest.adopters?.email}</p>
                    </div>

                    <div>
                      <span className="block font-mono text-[8px] uppercase text-hprh-pine/40 font-bold">Destination Layout</span>
                      <p className="font-semibold truncate" title={selectedRequest.destination_address || 'Self pickup'}>
                        {selectedRequest.pickup_method === 'self_pickup' ? 'Self Pickup at Haven' : selectedRequest.destination_address || 'No Address'}
                      </p>
                    </div>

                    <div>
                      <span className="block font-mono text-[8px] uppercase text-hprh-pine/40 font-bold">Scheduled Distance</span>
                      <p className="font-semibold">
                        {selectedRequest.pickup_method === 'self_pickup' ? '0 miles' : selectedRequest.distance_miles ? `${selectedRequest.distance_miles} miles` : 'Pending quote'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* B. Two-Column Workspace (Timeline log + Posting form) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  
                  {/* Timeline History log */}
                  <div className="bg-hprh-paper-dark border border-hprh-pine/15 rounded p-5 shadow-sm space-y-4 text-left relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-hprh-sage"></div>
                    <div className="flex items-center gap-1.5 border-b border-hprh-pine/10 pb-2">
                      <History className="w-4 h-4 text-hprh-sage" />
                      <h3 className="font-mono text-xs uppercase tracking-widest font-bold text-hprh-sage">
                        Route History Timeline
                      </h3>
                    </div>

                    {loadingTimeline ? (
                      <div className="text-center py-10 space-y-2">
                        <Loader2 className="w-5 h-5 animate-spin text-hprh-sage mx-auto" />
                        <span className="font-mono text-[8px] uppercase text-hprh-pine/40">Syncing history...</span>
                      </div>
                    ) : updates.length === 0 ? (
                      <div className="py-12 text-center text-xs text-hprh-pine/45 font-sans italic border-2 border-dashed border-hprh-pine/10 rounded">
                        No shipment tracking status events logged yet.
                      </div>
                    ) : (
                      <div className="relative pl-5 space-y-5 border-l border-dashed border-hprh-pine/20 ml-1 py-1">
                        {updates.map(update => {
                          const d = new Date(update.created_at);
                          const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                          const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                          const warmDate = `${dateStr} @ ${timeStr}`;

                          return (
                            <div key={update.id} className="relative text-xs">
                              {/* Dot bullet */}
                              <div className={`absolute -left-[26px] top-1 w-2.5 h-2.5 rounded-full border border-current ${
                                getStatusBadgeStyle(update.status)
                              }`}>
                                <div className="w-1 h-1 rounded-full bg-current m-auto mt-[2px]" />
                              </div>

                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <Badge status={update.status} className="text-[8px] px-1.5 py-0.2" />
                                  <span className="text-[9px] font-mono text-hprh-pine/45">{warmDate}</span>
                                </div>

                                {update.location_description && (
                                  <p className="font-semibold text-hprh-pine text-[11px] font-sans">
                                    📍 {update.location_description}
                                  </p>
                                )}

                                {update.note && (
                                  <p className="text-[11px] text-hprh-pine/70 leading-relaxed font-sans bg-hprh-paper/40 p-2 rounded border border-hprh-pine/5">
                                    {update.note}
                                  </p>
                                )}

                                <p className="text-[8px] font-mono text-hprh-pine/40 uppercase">
                                  Logged by: {staffUsers[update.posted_by] || 'System Staff'}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Posting form */}
                  <div className="bg-hprh-paper-dark border border-hprh-pine/15 rounded p-5 shadow-sm space-y-4 text-left relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-hprh-clay"></div>
                    <div className="flex items-center gap-1.5 border-b border-hprh-pine/10 pb-2">
                      <MapPin className="w-4 h-4 text-hprh-clay" />
                      <h3 className="font-mono text-xs uppercase tracking-widest font-bold text-hprh-clay">
                        Post Transit update
                      </h3>
                    </div>

                    <form onSubmit={handleSubmitUpdate} className="space-y-4">
                      <Select
                        label="Select Status *"
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as ShipmentStatus)}
                        options={[
                          { value: 'PENDING', label: 'PENDING (Preparing journey)' },
                          { value: 'SHIPPED', label: 'SHIPPED (Departed Haven)' },
                          { value: 'EN_ROUTE', label: 'EN ROUTE (Passenger in transit)' },
                          { value: 'ARRIVED_AT_HUB', label: 'ARRIVED AT HUB (At regional facility)' },
                          { value: 'ON_HOLD', label: 'ON HOLD (Temporary transit delay)' },
                          { value: 'OUT_FOR_DELIVERY', label: 'OUT FOR DELIVERY (Local route dispatch)' },
                          { value: 'DELIVERED', label: 'DELIVERED (Arrived at destination layout)' },
                          { value: 'CANCELLED', label: 'CANCELLED (Transport aborted)' }
                        ]}
                        required
                      />

                      <Input
                        label="Location Description"
                        placeholder="e.g. Memphis Hub, TN"
                        value={formLocation}
                        onChange={(e) => setFormLocation(e.target.value)}
                        helperText="Provide city/state or facility name (optional)."
                      />

                      <div className="w-full flex flex-col gap-1">
                        <Textarea
                          label="Dossier Statement / Notes"
                          placeholder="e.g. Pet rest-stop completed, in excellent spirit..."
                          value={formNote}
                          onChange={(e) => setFormNote(e.target.value)}
                        />
                        <span className="text-[10px] text-hprh-pine/50 font-sans block">
                          Provide updates on pet status and details (optional).
                        </span>
                      </div>

                      <div className="pt-2">
                        <Button
                          type="submit"
                          variant="secondary"
                          disabled={submitting}
                          className="w-full font-bold uppercase tracking-wider py-3 flex items-center justify-center gap-1.5"
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Filing Event entry...
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              Commit Event Log
                            </>
                          )}
                        </Button>
                      </div>
                    </form>

                  </div>

                </div>

              </div>
            )}
          </div>

        </div>

      </Container>

      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className={`p-4 rounded-lg shadow-lg border text-xs flex items-start gap-3 relative ${
            notification.type === 'success' 
              ? 'bg-hprh-sage/10 border-hprh-sage/30 text-hprh-pine' 
              : notification.type === 'warning'
              ? 'bg-hprh-gold/10 border-hprh-gold/30 text-hprh-pine'
              : 'bg-hprh-clay/10 border-hprh-clay/30 text-hprh-pine'
          }`}>
            <Truck className={`w-5 h-5 flex-shrink-0 ${
              notification.type === 'success' ? 'text-hprh-sage' : notification.type === 'warning' ? 'text-hprh-gold' : 'text-hprh-clay'
            }`} />
            <div className="flex-grow space-y-1">
              <span className="font-mono uppercase font-bold block">
                {notification.type === 'success' ? 'Timeline Updated' : notification.type === 'warning' ? 'Timeline Warning' : 'Database Error'}
              </span>
              <p className="leading-relaxed">{notification.message}</p>
            </div>
            <button onClick={() => setNotification(null)} className="text-current/60 hover:text-current font-bold font-mono text-[9px] uppercase self-start">dismiss</button>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminTransportUpdates;
