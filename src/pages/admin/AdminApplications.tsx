import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { AdoptionApplication } from '../../lib/types';
import Container from '../../components/ui/Container';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { 
  ChevronDown, 
  ChevronUp, 
  Check, 
  X, 
  Mail, 
  Phone, 
  MapPin, 
  Home, 
  Award, 
  ShieldAlert,
  FileText,
  Loader2
} from 'lucide-react';

export const AdminApplications: React.FC = () => {
  const [applications, setApplications] = useState<AdoptionApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'warning' | 'error';
  } | null>(null);

  const [idSignedUrls, setIdSignedUrls] = useState<Record<string, string>>({});
  const [loadingIdUrl, setLoadingIdUrl] = useState<Record<string, boolean>>({});

  const getIdSignedUrl = async (adopterId: string, path: string) => {
    if (idSignedUrls[adopterId] || loadingIdUrl[adopterId]) return;

    try {
      setLoadingIdUrl(prev => ({ ...prev, [adopterId]: true }));
      const { data, error: signedUrlError } = await supabase.storage
        .from('adopter-ids')
        .createSignedUrl(path, 3600);

      if (signedUrlError) throw signedUrlError;
      if (data?.signedUrl) {
        setIdSignedUrls(prev => ({ ...prev, [adopterId]: data.signedUrl }));
      }
    } catch (err) {
      console.error('Error creating signed URL for adopter ID:', err);
    } finally {
      setLoadingIdUrl(prev => ({ ...prev, [adopterId]: false }));
    }
  };

  const handleIdVerificationToggle = async (adopterId: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;

    try {
      // Optimistic update of local state
      setApplications(prev =>
        prev.map(app => {
          if (app.adopters?.id === adopterId) {
            return {
              ...app,
              adopters: {
                ...app.adopters,
                id_verified: nextStatus,
                id_verified_by: nextStatus ? 'CURRENT_USER' : null,
                id_verified_at: nextStatus ? new Date().toISOString() : null,
              }
            };
          }
          return app;
        })
      );

      let staffUserId: string | null = null;
      if (nextStatus) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) throw new Error('Not authenticated');
        staffUserId = user.id;
      }

      const { error: updateError } = await supabase
        .from('adopters')
        .update({
          id_verified: nextStatus,
          id_verified_by: nextStatus ? staffUserId : null,
          id_verified_at: nextStatus ? new Date().toISOString() : null,
        })
        .eq('id', adopterId);

      if (updateError) throw updateError;

      setNotification({
        message: nextStatus ? 'Adopter ID marked as verified.' : 'Adopter ID verification revoked.',
        type: 'success'
      });
    } catch (err: any) {
      console.error('Failed to toggle ID verification:', err);
      setNotification({
        message: `Failed to toggle ID verification status: ${err.message || 'Error occurred.'}`,
        type: 'error'
      });
      fetchApplications();
    }
  };

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: dbError } = await supabase
        .from('adoption_applications')
        .select('*, pets(*), adopters(*)')
        .order('submitted_at', { ascending: false });

      if (dbError) throw dbError;
      setApplications(data || []);
    } catch (err: any) {
      console.error('Error fetching applications:', err);
      setError(err.message || 'Failed to retrieve adoption applications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleStatusUpdate = async (appId: string, newStatus: 'APPROVED' | 'REJECTED') => {
    const application = applications.find(app => app.id === appId);

    try {
      // Optimistic Update
      setApplications(prev => 
        prev.map(app => app.id === appId ? { ...app, status: newStatus } : app)
      );

      const { error: updateError } = await supabase
        .from('adoption_applications')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', appId);

      if (updateError) throw updateError;

      // If approved, trigger the Edge Function to send email
      if (newStatus === 'APPROVED' && application) {
        try {
          const { error: emailError } = await supabase.functions.invoke('send-approval-email', {
            body: {
              adopterEmail: application.adopters?.email,
              adopterName: application.adopters?.full_name,
              petName: application.pets?.name,
              applicationId: application.id,
            },
          });

          if (emailError) {
            console.error('Failed to send approval email:', emailError);
            setNotification({
              message: 'Application approved, but the notification email failed to send. You may want to contact the adopter directly.',
              type: 'warning'
            });
          } else {
            setNotification({
              message: `Application approved and approval email sent to ${application.adopters?.full_name || 'adopter'}.`,
              type: 'success'
            });
          }
        } catch (emailErr: any) {
          console.error('Failed to send approval email:', emailErr);
          setNotification({
            message: 'Application approved, but the notification email failed to send. You may want to contact the adopter directly.',
            type: 'warning'
          });
        }
      } else {
        setNotification({
          message: `Application status updated to ${newStatus} successfully.`,
          type: 'success'
        });
      }
    } catch (err: any) {
      console.error('Failed status update:', err);
      setNotification({
        message: `Failed to update application status: ${err.message || 'Error occurred.'}`,
        type: 'error'
      });
      fetchApplications();
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedAppId(prev => {
      const next = prev === id ? null : id;
      if (next) {
        const app = applications.find(a => a.id === id);
        if (app?.adopters?.id_document_url && app.adopters.id) {
          getIdSignedUrl(app.adopters.id, app.adopters.id_document_url);
        }
      }
      return next;
    });
  };

  // Filter application list based on active tab
  const filteredApps = applications.filter(app => {
    if (activeTab === 'ALL') return true;
    return app.status === activeTab;
  });

  if (loading && applications.length === 0) {
    return (
      <div className="py-20 bg-hprh-paper min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-hprh-sage" />
        <p className="font-mono text-xs uppercase tracking-widest text-hprh-pine/50">Retrieving Application Queue...</p>
      </div>
    );
  }

  return (
    <div className="py-12 bg-hprh-paper text-hprh-pine font-sans min-h-screen">
      <Container className="space-y-8">
        
        {/* Page Header */}
        <div className="border-b-2 border-dashed border-hprh-pine/20 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-hprh-sage font-bold block mb-1">
              Operation Dossiers
            </span>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-hprh-pine">
              Adoption Applications Queue
            </h1>
            <p className="text-xs text-hprh-pine/50 mt-1">
              Audit and finalize housing questionnaires submitted by prospective pet caretakers.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-hprh-clay/10 border border-hprh-clay/20 text-hprh-pine p-4 rounded text-xs flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-hprh-clay flex-shrink-0" />
            <div className="space-y-1">
              <span className="font-mono uppercase font-bold text-hprh-clay block">Queue Sync Failure</span>
              <p className="leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-hprh-pine/10 font-mono text-[10px] sm:text-xs font-bold uppercase tracking-wider select-none">
          {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((tab) => {
            const isActive = activeTab === tab;
            const count = applications.filter(a => tab === 'ALL' || a.status === tab).length;
            
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
                <span>{tab === 'ALL' ? 'All Dossiers' : tab}</span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] ${
                  isActive ? 'bg-hprh-sage text-hprh-paper' : 'bg-hprh-pine/5 text-hprh-pine/60'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Queue List Container */}
        {filteredApps.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-hprh-pine/15 bg-hprh-paper-dark/30 rounded-lg space-y-3">
            <h3 className="font-display text-xl font-bold text-hprh-pine/70">No Applications Filed</h3>
            <p className="text-xs text-hprh-pine/50 max-w-sm mx-auto leading-relaxed">
              There are no adoption questionnaires logged under the <span className="font-mono text-hprh-sage font-semibold">{activeTab}</span> folder.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredApps.map((app) => {
              const isExpanded = expandedAppId === app.id;
              const dateSubmitted = new Date(app.submitted_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div
                  key={app.id}
                  className={`bg-hprh-paper-dark border rounded transition-all duration-200 overflow-hidden shadow-sm ${
                    isExpanded 
                      ? 'border-hprh-sage/50 ring-1 ring-hprh-sage/10' 
                      : 'border-hprh-pine/15 hover:border-hprh-pine/30'
                  }`}
                >
                  {/* Row Summary Header */}
                  <div
                    onClick={() => toggleExpand(app.id)}
                    className="flex flex-col md:flex-row md:items-center justify-between p-4 sm:p-5 gap-4 cursor-pointer select-none"
                  >
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-grow">
                      <div>
                        <span className="block text-[8px] font-mono uppercase tracking-widest text-hprh-pine/40">Adopter Name</span>
                        <span className="text-sm font-bold text-hprh-pine">{app.adopters?.full_name || 'Anonymous Adopter'}</span>
                      </div>
                      
                      <div>
                        <span className="block text-[8px] font-mono uppercase tracking-widest text-hprh-pine/40">Target Pet</span>
                        <span className="text-sm font-bold text-hprh-sage">{app.pets?.name || 'Deleted Case File'}</span>
                      </div>

                      <div>
                        <span className="block text-[8px] font-mono uppercase tracking-widest text-hprh-pine/40">Submitted At</span>
                        <span className="text-xs font-mono font-medium text-hprh-pine/70">{dateSubmitted}</span>
                      </div>

                      <div className="flex items-center md:justify-start">
                        <Badge status={app.status} className="text-[9px] px-2 py-0.5" />
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
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        
                        {/* Section 1: Adopter Contact Dossier */}
                        <div className="space-y-3 font-sans text-xs">
                          <h4 className="font-mono text-[10px] uppercase tracking-widest text-hprh-sage font-bold border-b border-hprh-sage/20 pb-1.5">
                            Adopter Contact Profile
                          </h4>
                          
                          <div className="space-y-2.5 pl-1">
                            <div className="flex items-center gap-2 text-hprh-pine/80">
                              <Mail className="w-4 h-4 text-hprh-sage flex-shrink-0" />
                              <a href={`mailto:${app.adopters?.email}`} className="font-semibold hover:underline">
                                {app.adopters?.email}
                              </a>
                            </div>

                            <div className="flex items-center gap-2 text-hprh-pine/80">
                              <Phone className="w-4 h-4 text-hprh-sage flex-shrink-0" />
                              <span className="font-semibold">{app.adopters?.phone || 'No phone recorded'}</span>
                            </div>

                            <div className="flex items-start gap-2 text-hprh-pine/80">
                              <MapPin className="w-4 h-4 text-hprh-sage flex-shrink-0 mt-0.5" />
                              <span className="font-semibold leading-relaxed">{app.adopters?.address || 'No address recorded'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Section 2: Home & Animal Experience */}
                        <div className="space-y-3 font-sans text-xs">
                          <h4 className="font-mono text-[10px] uppercase tracking-widest text-hprh-sage font-bold border-b border-hprh-sage/20 pb-1.5">
                            Home & Experience Clearance
                          </h4>
                          
                          <div className="space-y-2.5 pl-1">
                            <div className="flex items-center gap-2 text-hprh-pine/80">
                              <Home className="w-4 h-4 text-hprh-sage flex-shrink-0" />
                              <span className="font-semibold">Structure:</span>
                              <span className="bg-hprh-pine/5 px-2 py-0.5 rounded font-mono text-[10px] border border-hprh-pine/10">
                                {app.housing_type}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-hprh-pine/80">
                              <Award className="w-4 h-4 text-hprh-sage flex-shrink-0" />
                              <span className="font-semibold">Other Pets in House:</span>
                              <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${
                                app.has_other_pets 
                                  ? 'bg-hprh-gold/10 border-hprh-gold/30 text-hprh-gold/80' 
                                  : 'bg-hprh-pine/5 border border-hprh-pine/10 text-hprh-pine/60'
                              }`}>
                                {app.has_other_pets ? 'YES' : 'NO'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Section 3: Government ID Verification */}
                        <div className="space-y-3 font-sans text-xs">
                          <h4 className="font-mono text-[10px] uppercase tracking-widest text-hprh-sage font-bold border-b border-hprh-sage/20 pb-1.5">
                            Government ID Verification
                          </h4>

                          <div className="pl-1">
                            {app.adopters?.id_document_url ? (
                              loadingIdUrl[app.adopters.id] ? (
                                <div className="flex items-center justify-center py-6">
                                  <Loader2 className="w-5 h-5 animate-spin text-hprh-sage" />
                                </div>
                              ) : idSignedUrls[app.adopters.id] ? (
                                <div className="space-y-3">
                                  {app.adopters.id_document_url.toLowerCase().endsWith('.pdf') ? (
                                    <div className="flex flex-col items-center justify-center p-4 border border-hprh-pine/10 bg-hprh-paper-dark/30 rounded text-center">
                                      <FileText className="w-10 h-10 text-hprh-clay mb-2 flex-shrink-0" />
                                      <span className="text-[10px] font-mono font-bold text-hprh-pine block truncate max-w-full mb-2">
                                        Government_ID.pdf
                                      </span>
                                      <a
                                        href={idSignedUrls[app.adopters.id]}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-hprh-sage hover:underline"
                                      >
                                        Open PDF Document
                                      </a>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-center">
                                      <div className="bg-white p-2 pb-4 border border-hprh-pine/10 shadow-md rotate-[-1deg] hover:rotate-0 hover:scale-105 transition-all duration-200 cursor-pointer">
                                        <a
                                          href={idSignedUrls[app.adopters.id]}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          title="Click to view full image"
                                        >
                                          <img
                                            src={idSignedUrls[app.adopters.id]}
                                            alt="Government ID"
                                            className="w-32 h-20 object-cover border border-hprh-pine/5 rounded-sm"
                                          />
                                        </a>
                                        <span className="text-[8px] font-mono text-hprh-pine/40 text-center block mt-2">
                                          ID DOCUMENT IMAGE
                                        </span>
                                      </div>
                                      <a
                                        href={idSignedUrls[app.adopters.id]}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[9px] uppercase font-mono tracking-wider font-extrabold text-hprh-sage hover:underline mt-3 block"
                                      >
                                        Open Full Image
                                      </a>
                                    </div>
                                  )}

                                  <div className="pt-2 border-t border-dashed border-hprh-pine/10 flex items-center gap-2">
                                    <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-bold text-hprh-pine">
                                      <input
                                        type="checkbox"
                                        checked={!!app.adopters?.id_verified}
                                        onChange={() => handleIdVerificationToggle(app.adopters!.id, !!app.adopters?.id_verified)}
                                        className="w-4 h-4 accent-hprh-sage rounded border-hprh-pine/20 text-hprh-sage focus:ring-hprh-sage/30"
                                      />
                                      <span>ID Verified</span>
                                    </label>
                                    {app.adopters?.id_verified && (
                                      <span className="text-[9px] text-hprh-sage font-mono font-bold uppercase tracking-wider bg-hprh-sage/10 px-1.5 py-0.5 rounded">
                                        Cleared
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center py-4 text-hprh-clay font-mono text-[10px]">
                                  Failed to load ID document.
                                </div>
                              )
                            ) : (
                              <div className="text-center py-6 border border-dashed border-hprh-pine/15 bg-hprh-paper-dark/30 rounded text-hprh-pine/50">
                                <span className="text-[10px] font-mono uppercase tracking-wider block font-bold">No ID Uploaded</span>
                                <span className="text-[9px] block mt-1 leading-normal font-sans">
                                  This application was submitted prior to the ID requirement.
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                      </div>

                      {/* Experience Text Box */}
                      <div className="border border-hprh-pine/15 bg-hprh-paper-dark/30 rounded p-4 relative font-sans text-xs">
                        <div className="absolute left-0 top-0 w-1 h-full bg-hprh-sage/40 rounded-l"></div>
                        <h5 className="font-mono text-[9px] uppercase tracking-widest font-extrabold text-hprh-pine/50 mb-1.5">
                          Adopter Experience Statements
                        </h5>
                        <p className="leading-relaxed text-hprh-pine/80 italic">
                          "{app.experience_details || 'No experience details submitted.'}"
                        </p>
                      </div>

                      {/* Action Triggers (Only show if PENDING) */}
                      {app.status === 'PENDING' && (
                        <div className="border-t border-dashed border-hprh-pine/15 pt-4 flex flex-col sm:flex-row sm:items-center gap-3">
                          <Button
                            onClick={() => handleStatusUpdate(app.id, 'APPROVED')}
                            variant="success"
                            className="w-full sm:w-auto flex items-center justify-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Approve Application
                          </Button>

                          <Button
                            onClick={() => handleStatusUpdate(app.id, 'REJECTED')}
                            variant="destructive"
                            className="w-full sm:w-auto flex items-center justify-center gap-1.5"
                          >
                            <X className="w-3.5 h-3.5" />
                            Reject Application
                          </Button>
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
        <div className="fixed bottom-5 right-5 z-50 max-w-md w-full animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className={`p-4 rounded-lg shadow-lg border text-xs flex items-start gap-3 relative ${
            notification.type === 'success' 
              ? 'bg-hprh-sage/10 border-hprh-sage/30 text-hprh-pine' 
              : notification.type === 'warning'
              ? 'bg-hprh-gold/10 border-hprh-gold/30 text-hprh-pine'
              : 'bg-hprh-clay/10 border-hprh-clay/30 text-hprh-pine'
          }`}>
            {notification.type === 'success' && <Check className="w-5 h-5 flex-shrink-0 text-hprh-sage" />}
            {notification.type === 'warning' && <ShieldAlert className="w-5 h-5 flex-shrink-0 text-hprh-gold" />}
            {notification.type === 'error' && <ShieldAlert className="w-5 h-5 flex-shrink-0 text-hprh-clay" />}
            
            <div className="flex-grow space-y-1 pr-6">
              <span className="font-mono uppercase font-bold block">
                {notification.type === 'success' ? 'Operation Success' : notification.type === 'warning' ? 'Process Alert' : 'Operation Failure'}
              </span>
              <p className="leading-relaxed font-sans">{notification.message}</p>
            </div>

            <button 
              onClick={() => setNotification(null)}
              className="absolute top-3 right-3 text-current/60 hover:text-current transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminApplications;
