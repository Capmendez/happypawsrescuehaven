import React, { useState, useEffect } from 'react';
import supabase from '../../lib/supabase';
import type { FosterVolunteerApplication, FosterAssignment, Pet } from '../../lib/types';
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
  Loader2,
  Calendar,
  AlertTriangle,
  PlusCircle
} from 'lucide-react';

interface FosterApplicationWithAssignment extends FosterVolunteerApplication {
  foster_assignments?: (FosterAssignment & { pets?: Pet })[];
}

export const AdminFosterApplications: React.FC = () => {
  const [applications, setApplications] = useState<FosterApplicationWithAssignment[]>([]);
  const [availablePets, setAvailablePets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'ALL'>('SUBMITTED');
  const [assigningPetAppId, setAssigningPetAppId] = useState<string | null>(null);
  const [selectedPetId, setSelectedPetId] = useState<string>('');
  const [submittingAssignment, setSubmittingAssignment] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'warning' | 'error';
  } | null>(null);

  const [idSignedUrls, setIdSignedUrls] = useState<Record<string, string>>({});
  const [loadingIdUrl, setLoadingIdUrl] = useState<Record<string, boolean>>({});

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

      // Fetch applications with joined assignments and pets
      const { data, error: dbError } = await supabase
        .from('foster_volunteer_applications')
        .select('*, foster_assignments(*, pets(*))')
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;
      setApplications(data || []);
    } catch (err: any) {
      console.error('Error fetching foster applications:', err);
      setError(err.message || 'Failed to retrieve applications.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailablePets = async () => {
    try {
      const { data, error: dbError } = await supabase
        .from('pets')
        .select('*')
        .eq('status', 'AVAILABLE')
        .order('name', { ascending: true });

      if (dbError) throw dbError;
      setAvailablePets(data || []);
    } catch (err) {
      console.error('Error fetching available pets:', err);
    }
  };

  useEffect(() => {
    fetchApplications();
    fetchAvailablePets();
  }, []);

  const getIdSignedUrl = async (appId: string, path: string) => {
    if (idSignedUrls[appId] || loadingIdUrl[appId]) return;

    try {
      setLoadingIdUrl(prev => ({ ...prev, [appId]: true }));
      const { data, error: signedUrlError } = await supabase.storage
        .from('adopter-ids')
        .createSignedUrl(path, 3600);

      if (signedUrlError) throw signedUrlError;
      if (data?.signedUrl) {
        setIdSignedUrls(prev => ({ ...prev, [appId]: data.signedUrl }));
      }
    } catch (err) {
      console.error('Error creating signed URL for ID:', err);
    } finally {
      setLoadingIdUrl(prev => ({ ...prev, [appId]: false }));
    }
  };

  const handleStatusUpdate = async (appId: string, newStatus: 'APPROVED' | 'REJECTED', reason?: string) => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error('Not authenticated');

      // Optimistically update
      setApplications(prev =>
        prev.map(app => 
          app.id === appId 
            ? { 
                ...app, 
                status: newStatus, 
                reviewed_by: user.id, 
                reviewed_at: new Date().toISOString(),
                rejection_reason: reason || null
              } 
            : app
        )
      );

      const { error: updateError } = await supabase
        .from('foster_volunteer_applications')
        .update({
          status: newStatus,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: reason || null
        })
        .eq('id', appId);

      if (updateError) throw updateError;

      setNotification({
        message: `Application status updated to ${newStatus}.`,
        type: 'success'
      });
    } catch (err: any) {
      console.error('Failed to update application status:', err);
      setNotification({
        message: `Failed to update status: ${err.message || 'Error occurred.'}`,
        type: 'error'
      });
      fetchApplications();
    }
  };

  const handleAssignPet = async (appId: string) => {
    if (!selectedPetId) return;

    try {
      setSubmittingAssignment(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error('Not authenticated');

      const app = applications.find(a => a.id === appId);
      const pet = availablePets.find(p => p.id === selectedPetId);
      if (!app || !pet) throw new Error('Application or pet not found');

      // 1. Create Foster Assignment
      const { data: newAssignment, error: assignError } = await supabase
        .from('foster_assignments')
        .insert({
          application_id: appId,
          pet_id: selectedPetId,
          status: 'ASSIGNED',
          assigned_by: user.id,
          assigned_at: new Date().toISOString(),
          deposit_terms_agreed: false
        })
        .select()
        .single();

      if (assignError) throw assignError;

      // 2. Update Pet Status to IN_FOSTER
      const { error: petError } = await supabase
        .from('pets')
        .update({ status: 'IN_FOSTER' })
        .eq('id', selectedPetId);

      if (petError) {
        console.error('Failed to update pet status, rollback assignment:', petError);
        await supabase.from('foster_assignments').delete().eq('id', newAssignment.id);
        throw petError;
      }

      // 3. Trigger Email Function
      try {
        const { error: emailError } = await supabase.functions.invoke('send-approval-email', {
          body: {
            type: 'foster_assignment_notice',
            adopterEmail: app.email,
            adopterName: app.full_name,
            petName: pet.name,
            assignmentId: newAssignment.id,
          }
        });
        if (emailError) console.error('Email invoke warning:', emailError);
      } catch (emailErr) {
        console.error('Failed to trigger email notification:', emailErr);
      }

      setNotification({
        message: `Successfully assigned ${pet.name} to ${app.full_name} and sent email notification.`,
        type: 'success'
      });

      setAssigningPetAppId(null);
      setSelectedPetId('');
      fetchApplications();
      fetchAvailablePets();
    } catch (err: any) {
      console.error('Failed to assign pet:', err);
      setNotification({
        message: `Failed to assign pet: ${err.message || 'Error occurred.'}`,
        type: 'error'
      });
    } finally {
      setSubmittingAssignment(false);
    }
  };

  const filteredApplications = applications.filter(app => {
    if (activeTab === 'ALL') return true;
    return app.status === activeTab;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUBMITTED': return 'warning';
      case 'APPROVED': return 'success';
      case 'REJECTED': return 'error';
      default: return 'warning';
    }
  };

  return (
    <div className="py-8 bg-hprh-paper min-h-screen">
      <Container>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="font-mono text-xs uppercase tracking-widest text-hprh-sage">
                Staff Administration
              </div>
              <h1 className="text-2xl sm:text-4xl font-bold font-display text-hprh-pine">
                Foster & Volunteer Queue
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-hprh-clay font-mono">
                {filteredApplications.length} Application(s)
              </span>
            </div>
          </div>

          {/* Toast Notification */}
          {notification && (
            <div className={`p-4 rounded-xl border flex items-start gap-3 animate-fade-in ${
              notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
              notification.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
              'bg-red-50 border-red-200 text-red-800'
            }`}>
              {notification.type === 'error' ? (
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
              ) : (
                <Award className="w-5 h-5 shrink-0 mt-0.5" />
              )}
              <div className="text-sm font-medium">{notification.message}</div>
            </div>
          )}

          {/* Tab Filter buttons */}
          <div className="flex flex-wrap gap-2 border-b border-hprh-sage/20 pb-4">
            {(['SUBMITTED', 'APPROVED', 'REJECTED', 'ALL'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setExpandedAppId(null);
                  setAssigningPetAppId(null);
                }}
                className={`px-4 py-2 text-xs font-mono uppercase tracking-wider rounded-lg border transition-all ${
                  activeTab === tab
                    ? 'bg-hprh-pine text-white border-hprh-pine shadow-sm'
                    : 'bg-white text-hprh-clay border-hprh-sage/20 hover:bg-hprh-paper hover:text-hprh-pine'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Loading */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-hprh-clay">
              <Loader2 className="w-8 h-8 animate-spin text-hprh-sage" />
              <span className="font-mono text-xs uppercase tracking-widest">Loading queue...</span>
            </div>
          ) : error ? (
            <div className="py-12 bg-white rounded-2xl border border-red-200 p-8 text-center max-w-lg mx-auto space-y-4">
              <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
              <h3 className="text-lg font-bold text-hprh-pine">Failed to Load Applications</h3>
              <p className="text-sm text-hprh-clay">{error}</p>
              <Button onClick={fetchApplications} variant="outline" size="sm">Try Again</Button>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="py-20 bg-white/50 backdrop-blur-md rounded-2xl border border-hprh-sage/10 text-center space-y-4">
              <Award className="w-12 h-12 text-hprh-sage/40 mx-auto" />
              <h3 className="text-lg font-semibold text-hprh-pine">Queue is Empty</h3>
              <p className="text-sm text-hprh-clay max-w-sm mx-auto">
                There are no foster or volunteer applications currently in the <span className="font-mono">{activeTab}</span> queue.
              </p>
            </div>
          ) : (
            /* Table/List View */
            <div className="space-y-4">
              {filteredApplications.map(app => {
                const isExpanded = expandedAppId === app.id;
                const hasAssignment = app.foster_assignments && app.foster_assignments.length > 0;
                const activeAssignment = hasAssignment ? app.foster_assignments?.[0] : null;

                return (
                  <div 
                    key={app.id}
                    className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
                      isExpanded 
                        ? 'border-hprh-sage/40 shadow-lg' 
                        : 'border-hprh-sage/10 hover:border-hprh-sage/30 shadow-sm'
                    }`}
                  >
                    {/* Header Row */}
                    <div 
                      onClick={() => {
                        setExpandedAppId(isExpanded ? null : app.id);
                        if (!isExpanded && app.id_document_url) {
                          getIdSignedUrl(app.id, app.id_document_url);
                        }
                      }}
                      className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold font-display text-hprh-pine text-lg">{app.full_name}</span>
                          <Badge status={app.status} className="text-[9px] px-2 py-0.5" />
                          <Badge status={app.role_interest === 'BOTH' ? 'Foster & Volunteer' : app.role_interest} className="text-[9px] px-2 py-0.5" />
                          {activeAssignment && (
                            <Badge status={`Assigned: ${activeAssignment.pets?.name}`} className="text-[9px] px-2 py-0.5" />
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-hprh-clay font-mono flex-wrap">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5" />
                            {app.email}
                          </span>
                          {app.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5" />
                              {app.phone}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(app.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-hprh-clay" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-hprh-clay" />
                        )}
                      </div>
                    </div>

                    {/* Expandable Details */}
                    {isExpanded && (
                      <div className="border-t border-hprh-paper px-6 py-6 bg-hprh-paper/20 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Background Info */}
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-xs font-mono uppercase tracking-wider text-hprh-sage font-bold">Experience</h4>
                              <p className="text-sm text-hprh-pine mt-1 whitespace-pre-line leading-relaxed bg-white p-3 rounded-xl border border-hprh-sage/10">
                                {app.experience_details || 'No experience details provided.'}
                              </p>
                            </div>
                            <div>
                              <h4 className="text-xs font-mono uppercase tracking-wider text-hprh-sage font-bold">Availability</h4>
                              <p className="text-sm text-hprh-pine mt-1 leading-relaxed bg-white p-3 rounded-xl border border-hprh-sage/10">
                                {app.availability || 'No availability provided.'}
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <h4 className="text-xs font-mono uppercase tracking-wider text-hprh-sage font-bold">Housing</h4>
                                <div className="flex items-center gap-2 text-sm text-hprh-pine mt-1">
                                  <Home className="w-4 h-4 text-hprh-sage" />
                                  <span>{app.housing_type || 'N/A'}</span>
                                </div>
                              </div>
                              <div>
                                <h4 className="text-xs font-mono uppercase tracking-wider text-hprh-sage font-bold">Other Pets</h4>
                                <div className="text-sm text-hprh-pine mt-1 font-medium">
                                  {app.has_other_pets ? 'Yes' : 'No'}
                                </div>
                              </div>
                            </div>
                            {app.address && (
                              <div>
                                <h4 className="text-xs font-mono uppercase tracking-wider text-hprh-sage font-bold">Address</h4>
                                <div className="flex items-start gap-2 text-sm text-hprh-pine mt-1">
                                  <MapPin className="w-4 h-4 text-hprh-sage shrink-0 mt-0.5" />
                                  <span>{app.address}</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* ID Document Review */}
                          <div className="space-y-4 flex flex-col justify-between">
                            <div className="space-y-2">
                              <h4 className="text-xs font-mono uppercase tracking-wider text-hprh-sage font-bold">Government Photo ID</h4>
                              {loadingIdUrl[app.id] ? (
                                <div className="py-8 flex items-center justify-center gap-2 text-xs text-hprh-clay font-mono">
                                  <Loader2 className="w-4 h-4 animate-spin text-hprh-sage" />
                                  Loading ID URL...
                                </div>
                              ) : idSignedUrls[app.id] ? (
                                <div className="border border-hprh-sage/20 rounded-xl overflow-hidden shadow-inner bg-white p-2">
                                  {app.id_document_url?.toLowerCase().endsWith('.pdf') ? (
                                    <div className="p-4 text-center space-y-2">
                                      <FileText className="w-8 h-8 text-hprh-sage mx-auto" />
                                      <span className="text-xs font-semibold text-hprh-pine block">PDF Document Uploaded</span>
                                      <a 
                                        href={idSignedUrls[app.id]} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-block text-xs font-mono uppercase tracking-wider text-hprh-sage hover:underline"
                                      >
                                        Open Document in New Tab
                                      </a>
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      <img 
                                        src={idSignedUrls[app.id]} 
                                        alt="ID Document" 
                                        className="max-h-48 mx-auto rounded object-contain border border-hprh-sage/10 bg-hprh-paper/10"
                                      />
                                      <div className="text-center">
                                        <a 
                                          href={idSignedUrls[app.id]} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-xs font-mono uppercase tracking-wider text-hprh-sage hover:underline inline-flex items-center gap-1"
                                        >
                                          <FileText className="w-3.5 h-3.5" />
                                          View Full Image
                                        </a>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="py-8 text-center text-xs text-hprh-clay font-mono border border-dashed border-hprh-sage/25 rounded-xl">
                                  No ID document url or failed to load.
                                </div>
                              )}
                            </div>

                            {/* Verification Stats */}
                            <div className="bg-white/80 rounded-xl p-4 border border-hprh-sage/10 space-y-2">
                              <h5 className="text-[10px] font-mono uppercase tracking-wider text-hprh-clay">Declaration</h5>
                              <div className="flex items-center gap-2 text-xs text-hprh-pine">
                                <span className={`w-2.5 h-2.5 rounded-full ${app.age_confirmed ? 'bg-green-500' : 'bg-red-500'}`} />
                                <span>Applicant confirmed 18+ years old</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Action Panel */}
                        <div className="border-t border-hprh-sage/10 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div className="text-xs text-hprh-clay">
                            {app.reviewed_at ? (
                              <span>
                                Reviewed by Admin on {new Date(app.reviewed_at).toLocaleString()}
                                {app.rejection_reason && (
                                  <span className="block text-red-600 font-semibold mt-1">
                                    Reason: {app.rejection_reason}
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span>Waiting for review</span>
                            )}
                          </div>

                          {/* Approval / Rejection buttons */}
                          {app.status === 'SUBMITTED' && (
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                              <Button
                                onClick={() => {
                                  const reason = prompt('Enter rejection reason (optional):');
                                  if (reason !== null) {
                                    handleStatusUpdate(app.id, 'REJECTED', reason);
                                  }
                                }}
                                variant="outline"
                                className="w-full sm:w-auto text-red-600 border-red-200 hover:bg-red-50 inline-flex items-center justify-center gap-2"
                              >
                                <X className="w-4 h-4" />
                                Reject
                              </Button>
                              <Button
                                onClick={() => handleStatusUpdate(app.id, 'APPROVED')}
                                variant="primary"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2"
                              >
                                <Check className="w-4 h-4" />
                                Approve Application
                              </Button>
                            </div>
                          )}

                          {/* Pet Assignment triggers */}
                          {app.status === 'APPROVED' && (
                            <div className="w-full space-y-4">
                              {!hasAssignment ? (
                                <div>
                                  {assigningPetAppId === app.id ? (
                                    <div className="bg-white rounded-xl p-4 border border-hprh-sage/30 space-y-4 animate-fade-in">
                                      <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-bold text-hprh-pine">Assign Pet to Foster</h4>
                                        <button 
                                          onClick={() => setAssigningPetAppId(null)}
                                          className="text-xs font-mono uppercase tracking-wider text-hprh-clay hover:text-hprh-pine"
                                        >
                                          Cancel
                                        </button>
                                      </div>

                                      <div className="space-y-2">
                                        <label className="block text-xs font-medium text-hprh-pine">
                                          Select Available Pet
                                        </label>
                                        <select
                                          value={selectedPetId}
                                          onChange={(e) => setSelectedPetId(e.target.value)}
                                          className="w-full px-3 py-2 text-sm rounded-lg border border-hprh-sage/30 focus:border-hprh-sage focus:ring-1 focus:ring-hprh-sage bg-white text-hprh-pine"
                                        >
                                          <option value="">-- Choose a Pet --</option>
                                          {availablePets.map(pet => (
                                            <option key={pet.id} value={pet.id}>
                                              {pet.name} ({pet.case_number})
                                            </option>
                                          ))}
                                        </select>
                                        {availablePets.length === 0 && (
                                          <p className="text-xs text-amber-600 flex items-center gap-1 font-medium">
                                            <AlertTriangle className="w-3.5 h-3.5" />
                                            No available pets in the database.
                                          </p>
                                        )}
                                      </div>

                                      <div className="flex justify-end gap-3 pt-2">
                                        <Button
                                          onClick={() => handleAssignPet(app.id)}
                                          variant="primary"
                                          disabled={submittingAssignment || !selectedPetId}
                                          className="w-full sm:w-auto text-xs py-2 inline-flex items-center justify-center gap-2"
                                        >
                                          {submittingAssignment ? (
                                            <>
                                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                              Assigning...
                                            </>
                                          ) : (
                                            <>
                                              <Check className="w-3.5 h-3.5" />
                                              Confirm Assignment
                                            </>
                                          )}
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex justify-end">
                                      <Button
                                        onClick={() => {
                                          setAssigningPetAppId(app.id);
                                          setSelectedPetId('');
                                        }}
                                        variant="primary"
                                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2"
                                      >
                                        <PlusCircle className="w-4 h-4" />
                                        Assign a Pet
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="bg-hprh-sage/5 border border-hprh-sage/20 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                  <div className="space-y-1">
                                    <span className="text-xs font-mono uppercase tracking-wider text-hprh-sage font-bold">Assigned Pet Details</span>
                                    <div className="text-sm font-semibold text-hprh-pine">
                                      {activeAssignment?.pets?.name} ({activeAssignment?.pets?.case_number})
                                    </div>
                                    <div className="text-xs text-hprh-clay">
                                      Assignment Status: <span className="font-mono font-bold text-hprh-pine">{activeAssignment?.status}</span>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <a
                                      href={`/foster/location/${activeAssignment?.id}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-block text-xs font-mono uppercase tracking-wider text-hprh-sage hover:underline"
                                    >
                                      Open Coordination Portal
                                    </a>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Container>
    </div>
  );
};

export default AdminFosterApplications;
