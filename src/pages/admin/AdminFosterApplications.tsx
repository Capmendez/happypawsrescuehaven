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

  /* 
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUBMITTED': return 'warning';
      case 'APPROVED': return 'success';
      case 'REJECTED': return 'error';
      default: return 'warning';
    }
  };
  */

  return (
    <div className="py-12 bg-hprh-paper text-hprh-pine font-sans min-h-screen">
      <Container>
        <div className="space-y-8">
          
          {/* Header */}
          <div className="border-b border-hprh-pine/10 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="font-mono text-xs uppercase tracking-widest text-hprh-sage font-bold block mb-1">
                Staff Administration
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold font-display text-hprh-pine">
                Foster & Volunteer Queue
              </h1>
              <p className="text-xs text-hprh-pine/50 mt-1">
                Triage applications and coordinate pet foster assignments.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-hprh-clay font-mono bg-hprh-clay/5 border border-hprh-clay/20 px-2.5 py-1 rounded">
                {filteredApplications.length} Application(s)
              </span>
            </div>
          </div>

          {/* Tab Filter buttons */}
          <div className="flex border-b border-hprh-pine/10 font-mono text-[10px] sm:text-xs font-bold uppercase tracking-wider select-none mb-6">
            {(['SUBMITTED', 'APPROVED', 'REJECTED', 'ALL'] as const).map(tab => {
              const isActive = activeTab === tab;
              const count = applications.filter(app => tab === 'ALL' || app.status === tab).length;
              
              let label: string = tab;
              if (tab === 'SUBMITTED') label = 'Submitted';
              if (tab === 'APPROVED') label = 'Approved';
              if (tab === 'REJECTED') label = 'Rejected';
              if (tab === 'ALL') label = 'All Queue';

              return (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setExpandedAppId(null);
                    setAssigningPetAppId(null);
                  }}
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

          {/* Loading */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-hprh-pine/50">
              <Loader2 className="w-10 h-10 animate-spin text-hprh-sage mx-auto" />
              <span className="font-mono text-xs uppercase tracking-widest">Loading queue...</span>
            </div>
          ) : error ? (
            <div className="py-12 bg-hprh-paper-dark border border-hprh-pine/15 rounded p-8 text-center max-w-lg mx-auto space-y-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-hprh-clay"></div>
              <ShieldAlert className="w-12 h-12 text-hprh-clay mx-auto" />
              <h3 className="text-lg font-bold text-hprh-pine">Failed to Load Applications</h3>
              <p className="text-sm text-hprh-clay">{error}</p>
              <Button onClick={fetchApplications} variant="ghost">Try Again</Button>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="py-20 bg-hprh-paper-dark border border-hprh-pine/15 rounded text-center space-y-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-hprh-sage"></div>
              <Award className="w-12 h-12 text-hprh-sage/40 mx-auto" />
              <h3 className="text-lg font-semibold text-hprh-pine">Queue is Empty</h3>
              <p className="text-sm text-hprh-pine/50 max-w-sm mx-auto">
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
                    className={`bg-hprh-paper-dark border rounded transition-all duration-200 overflow-hidden shadow-sm ${
                      isExpanded 
                        ? 'border-hprh-sage/50 ring-1 ring-hprh-sage/10' 
                        : 'border-hprh-pine/15 hover:border-hprh-pine/30'
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
                      <div className="border-t border-dashed border-hprh-pine/15 bg-white/40 p-5 sm:p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Background Info */}
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-xs font-mono uppercase tracking-wider text-hprh-sage font-bold">Experience</h4>
                              <p className="text-sm text-hprh-pine mt-1 whitespace-pre-line leading-relaxed bg-hprh-paper p-3 rounded border border-hprh-pine/10">
                                {app.experience_details || 'No experience details provided.'}
                              </p>
                            </div>
                            <div>
                              <h4 className="text-xs font-mono uppercase tracking-wider text-hprh-sage font-bold">Availability</h4>
                              <p className="text-sm text-hprh-pine mt-1 leading-relaxed bg-hprh-paper p-3 rounded border border-hprh-pine/10">
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
                                <div className="text-sm text-hprh-pine mt-1 font-medium pl-1">
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
                                <div className="border border-hprh-pine/15 rounded overflow-hidden bg-hprh-paper p-2">
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
                                        className="max-h-48 mx-auto rounded object-contain border border-hprh-pine/10 bg-hprh-paper/10"
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
                                <div className="py-8 text-center text-xs text-hprh-clay font-mono border border-dashed border-hprh-pine/15 rounded">
                                  No ID document url or failed to load.
                                </div>
                              )}
                            </div>

                            {/* Verification Stats */}
                            <div className="bg-hprh-paper rounded p-4 border border-hprh-pine/10 space-y-2">
                              <h5 className="text-[10px] font-mono uppercase tracking-wider text-hprh-clay font-bold">Declaration</h5>
                              <div className="flex items-center gap-2 text-xs text-hprh-pine">
                                <span className={`w-2.5 h-2.5 rounded-full ${app.age_confirmed ? 'bg-hprh-sage' : 'bg-hprh-clay'}`} />
                                <span className="font-medium">Applicant confirmed 18+ years old</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Action Panel */}
                        <div className="border-t border-dashed border-hprh-pine/15 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div className="text-xs text-hprh-pine/50">
                            {app.reviewed_at ? (
                              <span>
                                Reviewed by Admin on {new Date(app.reviewed_at).toLocaleString()}
                                {app.rejection_reason && (
                                  <span className="block text-hprh-clay font-semibold mt-1">
                                    Reason: {app.rejection_reason}
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="italic font-mono">Waiting for review</span>
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
                                variant="destructive"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2"
                              >
                                <X className="w-4 h-4 mr-1.5" />
                                Reject
                              </Button>
                              <Button
                                onClick={() => handleStatusUpdate(app.id, 'APPROVED')}
                                variant="success"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2"
                              >
                                <Check className="w-4 h-4 mr-1.5" />
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
                                    <div className="bg-hprh-paper-dark rounded p-4 border border-hprh-sage/30 space-y-4 animate-fade-in relative overflow-hidden">
                                      <div className="absolute top-0 left-0 w-full h-1 bg-hprh-sage"></div>
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
                                        <label className="block text-xs font-medium text-hprh-pine font-mono uppercase tracking-wider text-[10px]">
                                          Select Available Pet
                                        </label>
                                        <select
                                          value={selectedPetId}
                                          onChange={(e) => setSelectedPetId(e.target.value)}
                                          className="w-full px-3 py-2.5 text-sm rounded border border-hprh-pine/15 focus:border-hprh-sage focus:ring-1 focus:ring-hprh-sage bg-hprh-paper text-hprh-pine outline-none transition-colors"
                                        >
                                          <option value="">-- Choose a Pet --</option>
                                          {availablePets.map(pet => (
                                            <option key={pet.id} value={pet.id}>
                                              {pet.name} ({pet.case_number})
                                            </option>
                                          ))}
                                        </select>
                                        {availablePets.length === 0 && (
                                          <p className="text-xs text-hprh-gold flex items-center gap-1 font-medium">
                                            <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
                                            No available pets in the database.
                                          </p>
                                        )}
                                      </div>

                                      <div className="flex justify-end gap-3 pt-2">
                                        <Button
                                          onClick={() => handleAssignPet(app.id)}
                                          variant="success"
                                          disabled={submittingAssignment || !selectedPetId}
                                          className="w-full sm:w-auto text-xs py-2 inline-flex items-center justify-center gap-2"
                                        >
                                          {submittingAssignment ? (
                                            <>
                                              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                                              Assigning...
                                            </>
                                          ) : (
                                            <>
                                              <Check className="w-3.5 h-3.5 mr-1" />
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
                                        <PlusCircle className="w-4 h-4 mr-1.5" />
                                        Assign a Pet
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="bg-hprh-sage/5 border border-hprh-sage/20 rounded p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
                                  <div className="absolute top-0 left-0 w-full h-1 bg-hprh-sage"></div>
                                  <div className="space-y-1">
                                    <span className="text-xs font-mono uppercase tracking-wider text-hprh-sage font-bold">Assigned Pet Details</span>
                                    <div className="text-sm font-semibold text-hprh-pine">
                                      {activeAssignment?.pets?.name} ({activeAssignment?.pets?.case_number})
                                    </div>
                                    <div className="text-xs text-hprh-clay font-medium">
                                      Assignment Status: <span className="font-mono font-bold text-hprh-pine bg-hprh-pine/5 px-2 py-0.5 rounded border border-hprh-pine/10">{activeAssignment?.status}</span>
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

      {/* Floating Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className={`p-4 rounded-lg shadow-lg border text-xs flex items-start gap-3 relative ${
            notification.type === 'success' 
              ? 'bg-hprh-sage/10 border-hprh-sage/30 text-hprh-pine' 
              : notification.type === 'warning'
              ? 'bg-hprh-gold/10 border-hprh-gold/30 text-hprh-pine'
              : 'bg-hprh-clay/10 border-hprh-clay/30 text-hprh-pine'
          }`}>
            {notification.type === 'error' ? (
              <ShieldAlert className="w-5 h-5 shrink-0 text-hprh-clay" />
            ) : (
              <Award className={`w-5 h-5 shrink-0 ${notification.type === 'success' ? 'text-hprh-sage' : 'text-hprh-gold'}`} />
            )}
            <div className="flex-grow space-y-1">
              <span className="font-mono uppercase font-bold block">
                {notification.type === 'success' ? 'Queue Update Success' : notification.type === 'warning' ? 'Queue Warning' : 'Queue Error'}
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

export default AdminFosterApplications;
