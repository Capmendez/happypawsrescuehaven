import React, { useState } from 'react';
import supabase from '../../lib/supabase';
import Container from '../../components/ui/Container';
import { Search, AlertTriangle, Loader2, Footprints } from 'lucide-react';
import type { ShipmentStatusUpdate } from '../../lib/types';

export const Transport: React.FC = () => {
  const [trackingId, setTrackingId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shipment, setShipment] = useState<any>(null);
  const [updates, setUpdates] = useState<ShipmentStatusUpdate[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = trackingId.trim().toUpperCase();
    if (!cleanId) {
      setError('Please enter a tracking ID.');
      setShipment(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setShipment(null);

      // Query transport_requests joining pets
      const { data, error: dbError } = await supabase
        .from('transport_requests')
        .select('*, pets(*)')
        .eq('tracking_id', cleanId)
        .maybeSingle();
      if (dbError) throw dbError;

      // Keep it secure: if no match found or status is not at or after TRACKING_ACTIVE, show generic not-found
      const activeStatuses = ['TRACKING_ACTIVE', 'DELIVERED'];
      if (!data || !activeStatuses.includes(data.status)) {
        setError("We couldn't find a shipment with that tracking ID. Please check the ID from your confirmation email and try again.");
        return;
      }

      // Query shipment_status_updates
      const { data: updatesData, error: updatesError } = await supabase
        .from('shipment_status_updates')
        .select('*')
        .eq('transport_request_id', data.id)
        .order('created_at', { ascending: false });

      if (updatesError) throw updatesError;

      setUpdates(updatesData || []);
      setShipment(data);
    } catch (err: any) {
      console.error('Error fetching tracking info:', err);
      setError("We couldn't find a shipment with that tracking ID. Please check the ID from your confirmation email and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-12 md:py-20 bg-hprh-paper min-h-screen text-hprh-pine font-sans flex flex-col justify-start">
      <Container className="max-w-2xl space-y-8">
        
        {/* Header Block */}
        <div className="text-center space-y-3">
          <span className="font-mono text-xs uppercase tracking-widest text-hprh-sage font-bold bg-hprh-sage/5 border border-hprh-sage/20 px-3 py-1 rounded inline-block rotate-[1deg]">
            Logistics Coordination Gateway
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold font-display text-hprh-pine mt-2">
            Track Your Pet's Journey
          </h1>
          <p className="text-xs sm:text-sm text-hprh-pine/60 max-w-md mx-auto leading-relaxed">
            Enter the unique tracking ID provided in your transit confirmation dossier to audit your passenger's journey status.
          </p>
        </div>

        {/* Input Box Card */}
        <div
          className="bg-hprh-paper-dark border-2 border-hprh-pine/20 rounded shadow-md p-6 max-w-md mx-auto relative overflow-hidden"
          style={{
            backgroundImage: 'radial-gradient(#1f2a1e05 1px, transparent 0)',
            backgroundSize: '16px 16px',
          }}
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-hprh-clay/40"></div>
          
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-[10px] font-mono uppercase tracking-widest text-hprh-pine/70 font-bold select-none">
                Pet Tracking ID Dossier
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value)}
                  placeholder="e.g. TR-2026-9938"
                  className="w-full bg-hprh-paper border-2 border-hprh-pine/15 focus:border-hprh-sage focus:ring-1 focus:ring-hprh-sage/20 rounded py-2.5 px-4 pr-10 text-xs font-mono font-bold placeholder-hprh-pine/30 text-hprh-pine uppercase outline-none transition-all"
                  required
                />
                <Search className="w-4 h-4 text-hprh-pine/40 absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-hprh-sage hover:bg-hprh-sage/95 text-hprh-paper disabled:bg-hprh-sage/50 text-xs font-mono font-bold py-3 px-6 rounded uppercase tracking-wider transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Accessing Registry...
                </>
              ) : (
                'Audit Journey Status'
              )}
            </button>
          </form>

          {error && (
            <div className="bg-hprh-clay/10 border border-hprh-clay/20 text-hprh-pine p-4 rounded text-xs text-left flex items-start gap-3 mt-4 animate-in fade-in duration-200">
              <AlertTriangle className="w-5 h-5 text-hprh-clay flex-shrink-0" />
              <div className="space-y-1">
                <span className="font-mono uppercase font-bold text-hprh-clay block">Docket Search Alert</span>
                <p className="leading-relaxed font-sans">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Tracking Details Display */}
        {shipment && (
          <div className="bg-hprh-paper-dark border-2 border-hprh-pine/20 rounded shadow-md p-6 sm:p-8 space-y-6 text-left animate-in fade-in duration-300 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-hprh-sage"></div>

            {/* Docket Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-dashed border-hprh-pine/20 pb-5 gap-4">
              <div>
                <span className="font-mono text-[9px] uppercase tracking-widest text-hprh-pine/40 font-bold block mb-1">
                  Verified Route Registry
                </span>
                <h2 className="font-mono text-lg sm:text-xl font-bold text-hprh-pine uppercase tracking-wide">
                  {shipment.tracking_id}
                </h2>
              </div>
              <div>
                {shipment.status === 'DELIVERED' ? (
                  <span className="bg-hprh-sage/10 border border-hprh-sage/30 text-hprh-sage text-[10px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded select-none">
                    Delivered
                  </span>
                ) : (
                  <span className="bg-hprh-gold/10 border border-hprh-gold/30 text-hprh-gold/80 text-[10px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded select-none animate-pulse">
                    In Transit
                  </span>
                )}
              </div>
            </div>

            {/* Passenger Pet Profile */}
            {shipment.pets && (
              <div className="flex items-center gap-4 bg-hprh-paper/50 border border-hprh-pine/10 p-4 rounded shadow-sm">
                <div className="w-16 h-16 bg-white border border-hprh-pine/10 rounded overflow-hidden flex-shrink-0 flex items-center justify-center p-0.5">
                  {shipment.pets.photo_url || (shipment.pets.photos && shipment.pets.photos.length > 0) ? (
                    <img
                      src={shipment.pets.photo_url || shipment.pets.photos[0]}
                      alt={shipment.pets.name}
                      className="w-full h-full object-cover rounded-sm"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-hprh-pine/5 text-hprh-pine/30 font-mono text-[10px]">
                      No Photo
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <span className="font-mono text-[8px] uppercase tracking-widest text-hprh-pine/40 font-bold block">
                    Travel Passenger
                  </span>
                  <span className="font-display text-xl font-extrabold text-hprh-pine block">
                    {shipment.pets.name}
                  </span>
                  <span className="text-[10px] text-hprh-pine/60 block font-sans">
                    {shipment.pets.breed || 'Mixed Breed'} • {shipment.pets.age || 'Unknown Age'}
                  </span>
                </div>
              </div>
            )}

            {/* Progress Stepper / Real Shipment Timeline */}
            <div className="space-y-6 pt-2">
              <h3 className="font-mono text-xs uppercase tracking-widest font-bold text-hprh-sage border-b border-hprh-sage/20 pb-1">
                Shipment Tracking Timeline
              </h3>

              {updates.length === 0 ? (
                <div className="bg-hprh-paper border border-hprh-pine/10 p-4 rounded text-xs text-hprh-pine/70 italic font-sans">
                  Your pet's journey is being prepared. Check back soon for updates!
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 border-l-2 border-dashed border-hprh-pine/15 py-1 ml-2">
                  {updates.map((update: ShipmentStatusUpdate) => {
                    const isDelivered = update.status === 'DELIVERED';
                    const isHoldOrCancelled = ['ON_HOLD', 'CANCELLED'].includes(update.status);
                    
                    let badgeColor = 'bg-hprh-sage border-hprh-sage text-hprh-paper';
                    let labelBg = 'bg-hprh-sage/10 text-hprh-sage border-hprh-sage/20';

                    if (isHoldOrCancelled) {
                      badgeColor = 'bg-hprh-clay border-hprh-clay text-hprh-paper';
                      labelBg = 'bg-hprh-clay/10 text-hprh-clay border-hprh-clay/20';
                    } else if (isDelivered) {
                      badgeColor = 'bg-hprh-gold border-hprh-gold text-hprh-pine';
                      labelBg = 'bg-hprh-gold/15 text-hprh-gold/90 border-hprh-gold/30';
                    }

                    // Warm timestamp formatting (e.g. "June 22, 2026 at 3:40 PM")
                    const d = new Date(update.created_at);
                    const dateStr = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                    const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                    const warmDate = `${dateStr} at ${timeStr}`;

                    return (
                      <div key={update.id} className="relative">
                        {/* Node Bullet */}
                        <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${badgeColor}`}>
                          <div className="w-1.5 h-1.5 rounded-full bg-current" />
                        </div>

                        {/* Text descriptions */}
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 border rounded-sm ${labelBg}`}>
                              {update.status.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[10px] text-hprh-pine/50 font-mono">
                              {warmDate}
                            </span>
                          </div>
                          
                          {update.location_description && (
                            <div className="text-xs font-bold text-hprh-pine font-sans">
                              <span className="font-mono text-[9px] uppercase tracking-wider text-hprh-pine/40 font-normal mr-1">Location:</span>
                              {update.location_description}
                            </div>
                          )}

                          {update.note && (
                            <p className="text-xs text-hprh-pine/70 leading-relaxed font-sans bg-hprh-paper/40 border border-hprh-pine/5 p-3 rounded">
                              {update.note}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Delivery Celebration Banner */}
            {shipment.status === 'DELIVERED' && (
              <div className="bg-hprh-sage/10 border border-hprh-sage/20 p-4 rounded text-xs flex items-start gap-3 mt-4 animate-in slide-in-from-bottom-2 duration-300">
                <div className="p-2 bg-hprh-sage/20 text-hprh-sage rounded-full flex-shrink-0 animate-bounce">
                  <Footprints className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <span className="font-mono uppercase font-bold text-hprh-pine block">Dossier Finalized</span>
                  <p className="leading-relaxed font-sans text-hprh-pine/80">
                    Safe arrival confirmed! your pet companion has been successfully delivered to the destination layout.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </Container>
    </div>
  );
};

export default Transport;
