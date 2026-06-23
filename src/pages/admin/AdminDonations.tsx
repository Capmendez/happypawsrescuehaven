import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { Donation } from '../../lib/types';
import Container from '../../components/ui/Container';
import { 
  ChevronDown, 
  ChevronUp, 
  Check, 
  X, 
  Mail, 
  FileText, 
  User, 
  Building2, 
  ExternalLink,
  Loader2,
  AlertCircle,
  Heart
} from 'lucide-react';

export const AdminDonations: React.FC = () => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDonationId, setExpandedDonationId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'PENDING_REVIEW' | 'CONFIRMED' | 'REJECTED' | 'ALL'>('PENDING_REVIEW');
  
  // Signed URLs cache for proof images
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loadingUrl, setLoadingUrl] = useState<Record<string, boolean>>({});

  // Review action states
  const [actioningId, setActioningId] = useState<string | null>(null);

  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'warning' | 'error';
  } | null>(null);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const fetchDonations = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: dbError } = await supabase
        .from('donations')
        .select('*, bank_accounts:bank_account_id(*)')
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;
      setDonations((data || []) as unknown as Donation[]);
    } catch (err: any) {
      console.error('Error fetching donations:', err);
      setError(err.message || 'Failed to retrieve donations registry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonations();
  }, []);

  const getSignedUrl = async (donationId: string, path: string) => {
    if (signedUrls[donationId]) return; // already loaded

    try {
      setLoadingUrl(prev => ({ ...prev, [donationId]: true }));
      
      const { data, error: storageError } = await supabase.storage
        .from('payment-proofs')
        .createSignedUrl(path, 3600); // 1 hour token

      if (storageError) throw storageError;

      if (data?.signedUrl) {
        setSignedUrls(prev => ({ ...prev, [donationId]: data.signedUrl }));
      }
    } catch (err: any) {
      console.error('Error generating signed URL for donation:', err);
    } finally {
      setLoadingUrl(prev => ({ ...prev, [donationId]: false }));
    }
  };

  const toggleExpand = (donation: Donation) => {
    if (expandedDonationId === donation.id) {
      setExpandedDonationId(null);
    } else {
      setExpandedDonationId(donation.id);
      if (donation.proof_image_url) {
        getSignedUrl(donation.id, donation.proof_image_url);
      }
    }
  };

  const handleUpdateStatus = async (donation: Donation, nextStatus: 'CONFIRMED' | 'REJECTED') => {
    try {
      setActioningId(donation.id);
      
      // Get current staff user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Unauthorized or staff session expired.');

      const { error: updateError } = await supabase
        .from('donations')
        .update({
          status: nextStatus,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', donation.id);

      if (updateError) throw updateError;

      if (nextStatus === 'CONFIRMED') {
        try {
          const { error: emailError } = await supabase.functions.invoke('send-approval-email', {
            body: {
              type: 'donation_confirmed',
              adopterEmail: donation.donor_email,
              adopterName: donation.donor_name,
              donationAmount: donation.amount.toFixed(2),
            }
          });

          if (emailError) {
            console.error('Failed to send donation confirmation email:', emailError);
            setNotification({
              message: `Donation from "${donation.donor_name}" confirmed. Note: confirmation email failed to send.`,
              type: 'warning'
            });
          } else {
            setNotification({
              message: `Donation from "${donation.donor_name}" confirmed and thank-you email sent.`,
              type: 'success'
            });
          }
        } catch (emailErr) {
          console.error('Email trigger error:', emailErr);
          setNotification({
            message: `Donation from "${donation.donor_name}" confirmed.`,
            type: 'success'
          });
        }
      } else {
        setNotification({
          message: `Donation proof from "${donation.donor_name}" successfully set to ${nextStatus}.`,
          type: 'warning'
        });
      }

      fetchDonations();
    } catch (err: any) {
      console.error('Error triaging donation:', err);
      setNotification({
        message: `Failed to update status: ${err.message || 'Database error occurred.'}`,
        type: 'error'
      });
    } finally {
      setActioningId(null);
    }
  };

  // Filter donations based on tab selection
  const filteredDonations = donations.filter(d => {
    return activeTab === 'ALL' || d.status === activeTab;
  });

  if (loading && donations.length === 0) {
    return (
      <div className="py-20 bg-hprh-paper min-h-[60vh] flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 border-4 border-hprh-sage border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="font-mono text-xs uppercase tracking-widest text-hprh-pine/50">Loading Donations List...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 bg-hprh-paper text-hprh-pine font-sans min-h-screen">
      <Container className="space-y-8">
        
        {/* Page Header */}
        <div className="border-b-2 border-dashed border-hprh-pine/20 pb-5">
          <span className="font-mono text-xs uppercase tracking-widest text-hprh-sage font-bold block mb-1">
            Philanthropy Ledger
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-hprh-pine">
            Rescue Donations Ledger
          </h1>
          <p className="text-xs text-hprh-pine/50 mt-1">
            Reconcile direct bank wire and app transfers submitted by rescue supporters.
          </p>
        </div>

        {error && (
          <div className="bg-hprh-clay/10 border border-hprh-clay/20 text-hprh-pine p-4 rounded text-xs flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-hprh-clay flex-shrink-0" />
            <div className="space-y-1">
              <span className="font-mono uppercase font-bold text-hprh-clay block">Sync Error</span>
              <p className="leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-hprh-pine/10 font-mono text-[10px] sm:text-xs font-bold uppercase tracking-wider select-none">
          {(['PENDING_REVIEW', 'CONFIRMED', 'REJECTED', 'ALL'] as const).map((tab) => {
            const isActive = activeTab === tab;
            const count = donations.filter(d => tab === 'ALL' || d.status === tab).length;
            
            let label: string = tab;
            if (tab === 'PENDING_REVIEW') label = 'Pending Audit';
            if (tab === 'CONFIRMED') label = 'Confirmed';
            if (tab === 'REJECTED') label = 'Rejected';
            if (tab === 'ALL') label = 'All Donations';

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2.5 px-4 border-b-2 transition-all -mb-px flex items-center gap-1.5 ${
                  isActive 
                    ? 'border-hprh-sage text-hprh-sage font-extrabold bg-hprh-sage/5 rounded-t-sm' 
                    : 'border-transparent text-hprh-pine/50 hover:text-hprh-pine/80'
                }`}
              >
                <span>{label}</span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] ${
                  isActive ? 'bg-hprh-sage text-hprh-paper' : 'bg-hprh-pine/5 text-hprh-pine/60'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Donations List Container */}
        {filteredDonations.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-hprh-pine/15 bg-hprh-paper-dark/30 rounded-lg space-y-3">
            <h3 className="font-display text-xl font-bold text-hprh-pine/70">No Donations Logged</h3>
            <p className="text-xs text-hprh-pine/50 max-w-sm mx-auto leading-relaxed">
              There are no donation transfer receipts matching your active tab.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDonations.map((donation) => {
              const isExpanded = expandedDonationId === donation.id;
              
              const dateSubmitted = new Date(donation.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div
                  key={donation.id}
                  className={`bg-hprh-paper-dark border rounded transition-all duration-200 overflow-hidden shadow-sm ${
                    isExpanded 
                      ? 'border-hprh-sage/50 ring-1 ring-hprh-sage/10' 
                      : 'border-hprh-pine/15 hover:border-hprh-pine/30'
                  }`}
                >
                  {/* Row Summary Header */}
                  <div
                    onClick={() => toggleExpand(donation)}
                    className="flex flex-col md:flex-row md:items-center justify-between p-4 sm:p-5 gap-4 cursor-pointer select-none"
                  >
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 flex-grow">
                      <div>
                        <span className="block text-[8px] font-mono uppercase tracking-widest text-hprh-pine/40">Donor Coordinates</span>
                        <span className="text-sm font-bold text-hprh-pine block truncate">{donation.donor_name}</span>
                        <span className="text-[10px] text-hprh-pine/50 block truncate">{donation.donor_email}</span>
                      </div>
                      
                      <div>
                        <span className="block text-[8px] font-mono uppercase tracking-widest text-hprh-pine/40">Contribution Amount</span>
                        <span className="text-sm font-mono font-bold text-hprh-clay block mt-0.5">
                          {donation.amount.toLocaleString('en-US', { style: 'currency', currency: donation.currency })}
                        </span>
                      </div>

                      <div>
                        <span className="block text-[8px] font-mono uppercase tracking-widest text-hprh-pine/40">Payment Account</span>
                        <span className="text-xs font-semibold text-hprh-pine/80 block truncate mt-0.5">
                          {donation.bank_accounts?.display_label || donation.bank_accounts?.bank_name || 'Direct Transfer'}
                        </span>
                      </div>

                      <div>
                        <span className="block text-[8px] font-mono uppercase tracking-widest text-hprh-pine/40">Submitted At</span>
                        <span className="text-xs font-mono font-medium text-hprh-pine/70 block mt-0.5">{dateSubmitted}</span>
                      </div>

                      <div className="flex items-center md:justify-start">
                        {donation.status === 'PENDING_REVIEW' ? (
                          <span className="inline-block font-display text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 border border-hprh-gold/50 bg-hprh-gold/5 text-hprh-gold rounded rotate-[1deg]">
                            Pending Audit
                          </span>
                        ) : donation.status === 'CONFIRMED' ? (
                          <span className="inline-block font-display text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 border border-hprh-sage/50 bg-hprh-sage/5 text-hprh-sage rounded rotate-[-1deg]">
                            Confirmed
                          </span>
                        ) : (
                          <span className="inline-block font-display text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 border border-hprh-clay/50 bg-hprh-clay/5 text-hprh-clay rounded rotate-[1.5deg]">
                            Rejected
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-center">
                      {isExpanded ? (
                        <ChevronUp className="w-4.5 h-4.5 text-hprh-pine/40" />
                      ) : (
                        <ChevronDown className="w-4.5 h-4.5 text-hprh-pine/40" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Row Detail */}
                  {isExpanded && (
                    <div className="border-t border-dashed border-hprh-pine/15 bg-white/40 p-4 sm:p-6 space-y-6">
                      
                      {/* Grid Sections */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Left Details Panel */}
                        <div className="space-y-4">
                          <div className="space-y-3 font-sans text-xs">
                            <h4 className="font-mono text-[10px] uppercase tracking-widest text-hprh-sage font-bold border-b border-hprh-sage/20 pb-1.5">
                              Philanthropy Coordinates
                            </h4>
                            
                            <div className="space-y-2.5 pl-1">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-hprh-sage flex-shrink-0" />
                                <span className="font-semibold w-24">Donor Name:</span>
                                <span className="font-mono">{donation.donor_name}</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-hprh-sage flex-shrink-0" />
                                <span className="font-semibold w-24">Email:</span>
                                <span className="font-mono">{donation.donor_email}</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-hprh-sage flex-shrink-0" />
                                <span className="font-semibold w-24">Payment Account:</span>
                                <span className="font-mono bg-hprh-pine/5 px-2 py-0.5 rounded text-[10px] border border-hprh-pine/10">
                                  {donation.bank_accounts?.bank_name} {donation.bank_accounts?.account_number ? `(...${donation.bank_accounts.account_number.slice(-4)})` : donation.bank_accounts?.handle ? `(${donation.bank_accounts.handle})` : ''}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Message Box */}
                          {donation.message && (
                            <div className="border border-hprh-pine/15 bg-hprh-paper-dark/30 rounded p-4 relative font-sans text-xs">
                              <div className="absolute left-0 top-0 w-1 h-full bg-hprh-sage/40 rounded-l"></div>
                              <h5 className="font-mono text-[9px] uppercase tracking-widest font-extrabold text-hprh-pine/50 mb-1.5">
                                Donor Dedication / Note
                              </h5>
                              <p className="leading-relaxed text-hprh-pine/80 italic">
                                "{donation.message}"
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Right Proof Preview Panel */}
                        <div className="space-y-3">
                          <h4 className="font-mono text-[10px] uppercase tracking-widest text-hprh-sage font-bold border-b border-hprh-sage/20 pb-1.5">
                            Transaction Receipt Document
                          </h4>

                          <div className="border border-hprh-pine/15 bg-white rounded-md overflow-hidden flex flex-col items-center justify-center p-3 relative h-72 shadow-sm">
                            {donation.proof_image_url ? (
                              loadingUrl[donation.id] ? (
                                <div className="text-center space-y-2">
                                  <Loader2 className="w-8 h-8 animate-spin text-hprh-sage mx-auto" />
                                  <span className="font-mono text-[9px] text-hprh-pine/40 uppercase block">Generating signed url...</span>
                                </div>
                              ) : signedUrls[donation.id] ? (
                                donation.proof_image_url.toLowerCase().endsWith('.pdf') ? (
                                  <div className="text-center space-y-3">
                                    <FileText className="w-16 h-16 text-hprh-sage/60 mx-auto" />
                                    <span className="text-xs font-semibold text-hprh-pine block">PDF Receipt Document</span>
                                    <a 
                                      href={signedUrls[donation.id]} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 bg-hprh-sage text-hprh-paper hover:bg-hprh-sage/95 text-[10px] font-mono font-bold uppercase tracking-wider py-2 px-4 rounded transition-colors"
                                    >
                                      <span>Open Document</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </div>
                                ) : (
                                  <div className="w-full h-full relative group">
                                    <img 
                                      src={signedUrls[donation.id]} 
                                      alt="Payment proof receipt" 
                                      className="w-full h-full object-contain" 
                                    />
                                    <a 
                                      href={signedUrls[donation.id]} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="absolute bottom-2 right-2 bg-hprh-pine/80 text-white rounded p-1.5 hover:bg-hprh-sage transition-colors shadow opacity-0 group-hover:opacity-100 duration-200"
                                      title="Open original in new tab"
                                    >
                                      <ExternalLink className="w-4 h-4" />
                                    </a>
                                  </div>
                                )
                              ) : (
                                <div className="text-center space-y-2 text-hprh-clay">
                                  <AlertCircle className="w-8 h-8 mx-auto" />
                                  <span className="font-mono text-[9px] uppercase">Token Authorization Error</span>
                                </div>
                              )
                            ) : (
                              <div className="text-center space-y-2 text-hprh-pine/40 font-mono text-[10px]">
                                <FileText className="w-8 h-8 mx-auto opacity-40 mb-1" />
                                <span>No receipt file uploaded</span>
                              </div>
                            )}
                          </div>
                        </div>

                      </div>

                      {/* Action triggers for PENDING_REVIEW */}
                      {donation.status === 'PENDING_REVIEW' && (
                        <div className="border-t border-dashed border-hprh-pine/15 pt-4 flex items-center justify-between">
                          <span className="text-[10px] font-mono text-hprh-pine/40 uppercase font-semibold">Triage Action:</span>
                          
                          <div className="inline-flex gap-2">
                            <button
                              onClick={() => handleUpdateStatus(donation, 'REJECTED')}
                              disabled={actioningId !== null}
                              className="bg-hprh-clay text-hprh-paper hover:bg-hprh-clay/95 text-[10px] font-mono font-bold uppercase tracking-wider py-2.5 px-6 rounded inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject Donation</span>
                            </button>

                            <button
                              onClick={() => handleUpdateStatus(donation, 'CONFIRMED')}
                              disabled={actioningId !== null}
                              className="bg-hprh-sage text-hprh-paper hover:bg-hprh-sage/95 text-[10px] font-mono font-bold uppercase tracking-wider py-2.5 px-6 rounded inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Confirm Donation</span>
                            </button>
                          </div>
                        </div>
                      )}

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </Container>

      {/* Floating Notification Toast */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className={`p-4 rounded-lg shadow-lg border text-xs flex items-start gap-3 relative ${
            notification.type === 'success' 
              ? 'bg-hprh-sage/10 border-hprh-sage/30 text-hprh-pine' 
              : notification.type === 'warning'
              ? 'bg-hprh-gold/10 border-hprh-gold/30 text-hprh-pine'
              : 'bg-hprh-clay/10 border-hprh-clay/30 text-hprh-pine'
          }`}>
            <Heart className={`w-5 h-5 flex-shrink-0 ${
              notification.type === 'success' ? 'text-hprh-sage' : notification.type === 'warning' ? 'text-hprh-gold' : 'text-hprh-clay'
            }`} />
            <div className="flex-grow space-y-1">
              <span className="font-mono uppercase font-bold block">
                {notification.type === 'success' ? 'Ledger Confirmed' : notification.type === 'warning' ? 'Ledger Alert' : 'Ledger Failure'}
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

export default AdminDonations;
