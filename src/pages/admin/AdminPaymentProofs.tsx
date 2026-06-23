import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { PaymentProof } from '../../lib/types';
import Container from '../../components/ui/Container';
import Button from '../../components/ui/Button';
import { 
  ChevronDown, 
  ChevronUp, 
  Check, 
  X, 
  ShieldAlert, 
  Mail, 
  FileText, 
  User, 
  Building2, 
  AlertTriangle,
  ExternalLink,
  Loader2,
  AlertCircle,
  Truck
} from 'lucide-react';

export const AdminPaymentProofs: React.FC = () => {
  const [proofs, setProofs] = useState<PaymentProof[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedProofId, setExpandedProofId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING_REVIEW');
  const [activePurpose, setActivePurpose] = useState<'ALL' | 'ADOPTION_FEE' | 'TRANSPORT_FEE' | 'SECURITY_DEPOSIT'>('ALL');
  
  // Signed URLs cache for proof images/receipts
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loadingUrl, setLoadingUrl] = useState<Record<string, boolean>>({});

  // Review action states
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [proofToReject, setProofToReject] = useState<PaymentProof | null>(null);

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

  const fetchProofs = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: dbError } = await supabase
        .from('payment_proofs')
        .select('*, pets:pet_id(*), adopters:adopter_id(*), bank_accounts:bank_account_id(*), transport_requests:transport_request_id(*)')
        .order('submitted_at', { ascending: false });

      if (dbError) throw dbError;
      setProofs((data || []) as unknown as PaymentProof[]);
    } catch (err: any) {
      console.error('Error fetching payment proofs:', err);
      setError(err.message || 'Failed to retrieve payment proofs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProofs();
  }, []);

  const getSignedUrl = async (proofId: string, path: string) => {
    if (signedUrls[proofId]) return; // already loaded

    try {
      setLoadingUrl(prev => ({ ...prev, [proofId]: true }));
      
      const { data, error: storageError } = await supabase.storage
        .from('payment-proofs')
        .createSignedUrl(path, 3600); // 1 hour token

      if (storageError) throw storageError;

      if (data?.signedUrl) {
        setSignedUrls(prev => ({ ...prev, [proofId]: data.signedUrl }));
      }
    } catch (err: any) {
      console.error('Error generating signed URL:', err);
    } finally {
      setLoadingUrl(prev => ({ ...prev, [proofId]: false }));
    }
  };

  const toggleExpand = (proof: PaymentProof) => {
    if (expandedProofId === proof.id) {
      setExpandedProofId(null);
    } else {
      setExpandedProofId(proof.id);
      getSignedUrl(proof.id, proof.proof_image_url);
    }
  };

  const generateTrackingId = async (): Promise<string> => {
    const currentYear = new Date().getFullYear();
    const prefix = `HPRH-TRK-${currentYear}-`;

    const { data, error } = await supabase
      .from('transport_requests')
      .select('tracking_id')
      .like('tracking_id', `${prefix}%`)
      .order('tracking_id', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error query max tracking ID:', error);
      // Fallback
      const randomPart = Math.floor(1000 + Math.random() * 9000);
      return `${prefix}${randomPart}`;
    }

    let nextSeq = 1;
    if (data && data.length > 0 && data[0].tracking_id) {
      const parts = data[0].tracking_id.split('-');
      const lastPart = parts[parts.length - 1];
      const seq = parseInt(lastPart, 10);
      if (!isNaN(seq)) {
        nextSeq = seq + 1;
      }
    }

    const paddedSeq = String(nextSeq).padStart(4, '0');
    return `${prefix}${paddedSeq}`;
  };

  const handleApprove = async (proof: PaymentProof) => {
    try {
      setActioningId(proof.id);
      
      // Get current staff user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Unauthorized or staff session expired.');

      // A. Update Payment Proof status
      const { error: updateProofError } = await supabase
        .from('payment_proofs')
        .update({
          status: 'APPROVED',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', proof.id);

      if (updateProofError) throw updateProofError;

      const purpose = proof.purpose || 'ADOPTION_FEE';

      if (purpose === 'ADOPTION_FEE') {
        // Finalize Adoption
        const adoptionFee = proof.pets?.adoption_fee ?? proof.amount_claimed;
        const { data: adoptionData, error: insertAdoptionError } = await supabase
          .from('adoptions')
          .insert([{
            application_id: proof.application_id,
            pet_id: proof.pet_id,
            adopter_id: proof.adopter_id,
            fee_paid: adoptionFee,
            amount: adoptionFee,
            currency: proof.pets?.currency ?? 'USD',
            payment_status: 'PAID',
            paid_at: new Date().toISOString(),
            tracking_id: null,
            contract_signed: true
          }])
          .select()
          .single();

        if (insertAdoptionError) throw insertAdoptionError;
        
        // Send Email
        try {
          const { error: emailError } = await supabase.functions.invoke('send-approval-email', {
            body: {
              type: 'adoption_finalized',
              adopterEmail: proof.adopters?.email,
              adopterName: proof.adopters?.full_name,
              petName: proof.pets?.name,
              adoptionId: adoptionData.id
            }
          });

          if (emailError) {
            console.error('Failed to trigger email:', emailError);
            setNotification({
              message: `Adoption fee wire proof approved. Dossier finalized. Adopter can now proceed to transport step. Note: Email notification failed to send.`,
              type: 'warning'
            });
          } else {
            setNotification({
              message: `Adoption fee wire proof approved. Dossier finalized and notification email sent.`,
              type: 'success'
            });
          }
        } catch (emailErr) {
          console.error('Email trigger error:', emailErr);
          setNotification({
            message: `Adoption fee wire proof approved. Dossier finalized. Adopter can now proceed to transport step.`,
            type: 'success'
          });
        }
      } else if (purpose === 'TRANSPORT_FEE') {
        // 1. Update transport_requests status
        const { error: updateReq1 } = await supabase
          .from('transport_requests')
          .update({ status: 'TRANSPORT_FEE_PAID' })
          .eq('id', proof.transport_request_id);

        if (updateReq1) throw updateReq1;

        // Check if there is a foster assignment associated
        const fosterAssignmentId = proof.transport_requests?.foster_assignment_id;
        let depositRequired = true;
        let applicantEmail = proof.adopters?.email;
        let applicantName = proof.adopters?.full_name;

        if (fosterAssignmentId) {
          const { data: faData } = await supabase
            .from('foster_assignments')
            .select('deposit_required, foster_volunteer_applications(email, full_name)')
            .eq('id', fosterAssignmentId)
            .maybeSingle();
          if (faData) {
            depositRequired = faData.deposit_required !== false;
            if (faData.foster_volunteer_applications) {
              const fva = faData.foster_volunteer_applications as any;
              applicantEmail = fva.email;
              applicantName = fva.full_name;
            }
          }
        }

        if (!depositRequired) {
          // Michigan foster: Bypass security deposit entirely
          const trackingId = await generateTrackingId();

          const { error: updateRequestErr } = await supabase
            .from('transport_requests')
            .update({
              tracking_id: trackingId,
              tracking_activated_at: new Date().toISOString(),
              status: 'TRACKING_ACTIVE'
            })
            .eq('id', proof.transport_request_id);

          if (updateRequestErr) throw updateRequestErr;

          // Trigger email: foster_payment_confirmed
          try {
            const { error: emailError } = await supabase.functions.invoke('send-approval-email', {
              body: {
                type: 'foster_payment_confirmed',
                adopterEmail: applicantEmail,
                adopterName: applicantName,
                petName: proof.pets?.name,
                trackingId: trackingId
              }
            });

            if (emailError) {
              console.error('Failed to trigger email:', emailError);
              setNotification({
                message: `Transport fee approved. MI Deposit waived. Tracking ID: ${trackingId} activated. Note: Email notification failed to send.`,
                type: 'warning'
              });
            } else {
              setNotification({
                message: `Transport fee approved. MI Deposit waived. Tracking ID: ${trackingId} activated and email sent.`,
                type: 'success'
              });
            }
          } catch (emailErr) {
            console.error('Email trigger error:', emailErr);
            setNotification({
              message: `Transport fee approved. MI Deposit waived. Tracking ID: ${trackingId} activated.`,
              type: 'success'
            });
          }
        } else {
          // 2. Fetch deposit setting
          const { data: settingsData } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'security_deposit_amount')
            .maybeSingle();
          const depositAmount = parseFloat(settingsData?.value || '100.00');

          // 3. Create security_deposits row
          const { data: depositObj, error: depositErr } = await supabase
            .from('security_deposits')
            .insert([{
              transport_request_id: proof.transport_request_id,
              amount: depositAmount,
              currency: 'USD',
              status: 'PENDING'
            }])
            .select()
            .single();

          if (depositErr) throw depositErr;

          // 4. Update transport request
          const { error: updateReq2 } = await supabase
            .from('transport_requests')
            .update({
              status: 'DEPOSIT_PENDING',
              security_deposit_id: depositObj.id
            })
            .eq('id', proof.transport_request_id);

          if (updateReq2) throw updateReq2;

          // 5. Send Email
          try {
            const { error: emailError } = await supabase.functions.invoke('send-approval-email', {
              body: fosterAssignmentId ? {
                type: 'foster_deposit_requested',
                adopterEmail: applicantEmail,
                adopterName: applicantName,
                petName: proof.pets?.name,
                assignmentId: fosterAssignmentId
              } : {
                type: 'deposit_requested',
                adopterEmail: applicantEmail,
                adopterName: applicantName,
                petName: proof.pets?.name,
                transportRequestId: proof.transport_request_id
              }
            });

            if (emailError) {
              console.error('Failed to trigger email:', emailError);
              setNotification({
                message: `Transport fee approved. Security deposit requested. Note: Email notification failed to send.`,
                type: 'warning'
              });
            } else {
              setNotification({
                message: `Transport fee approved. Security deposit requested and notification email sent.`,
                type: 'success'
              });
            }
          } catch (emailErr) {
            console.error('Email trigger error:', emailErr);
            setNotification({
              message: `Transport fee approved. Security deposit requested.`,
              type: 'success'
            });
          }
        }

      } else if (purpose === 'SECURITY_DEPOSIT') {
        // 1. Update deposit status
        const { error: updateDepositErr } = await supabase
          .from('security_deposits')
          .update({
            status: 'PAID',
            paid_at: new Date().toISOString()
          })
          .eq('id', proof.security_deposit_id);

        if (updateDepositErr) throw updateDepositErr;

        // 2. Generate Tracking ID
        const trackingId = await generateTrackingId();

        // 3. Activate tracking
        const { error: updateRequestErr } = await supabase
          .from('transport_requests')
          .update({
            tracking_id: trackingId,
            tracking_activated_at: new Date().toISOString(),
            status: 'TRACKING_ACTIVE'
          })
          .eq('id', proof.transport_request_id);

        if (updateRequestErr) throw updateRequestErr;

        // Check if there is a foster assignment associated
        const fosterAssignmentId = proof.transport_requests?.foster_assignment_id;
        let applicantEmail = proof.adopters?.email;
        let applicantName = proof.adopters?.full_name;

        if (fosterAssignmentId) {
          const { data: faData } = await supabase
            .from('foster_assignments')
            .select('foster_volunteer_applications(email, full_name)')
            .eq('id', fosterAssignmentId)
            .maybeSingle();
          if (faData?.foster_volunteer_applications) {
            const fva = faData.foster_volunteer_applications as any;
            applicantEmail = fva.email;
            applicantName = fva.full_name;
          }
        }

        // 4. Trigger payment_confirmed email with tracking ID
        try {
          const { error: emailError } = await supabase.functions.invoke('send-approval-email', {
            body: {
              type: fosterAssignmentId ? 'foster_payment_confirmed' : 'payment_confirmed',
              adopterEmail: applicantEmail,
              adopterName: applicantName,
              petName: proof.pets?.name,
              trackingId: trackingId
            }
          });

          if (emailError) {
            console.error('Failed to trigger confirmation email:', emailError);
            setNotification({
              message: `Deposit approved. Tracking ID: ${trackingId} activated. Email notification failed to send.`,
              type: 'warning'
            });
          } else {
            setNotification({
              message: `Deposit approved. Tracking ID: ${trackingId} activated and email sent.`,
              type: 'success'
            });
          }
        } catch (emailErr) {
          console.error('Confirmation email trigger error:', emailErr);
          setNotification({
            message: `Deposit approved. Tracking ID: ${trackingId} activated.`,
            type: 'success'
          });
        }
      }

      fetchProofs();
    } catch (err: any) {
      console.error('Error approving payment proof:', err);
      setNotification({
        message: `Failed to approve proof: ${err.message || 'Database error occurred.'}`,
        type: 'error'
      });
    } finally {
      setActioningId(null);
    }
  };

  const openRejectModal = (proof: PaymentProof) => {
    setProofToReject(proof);
    setRejectionReason('');
    setIsRejectModalOpen(true);
  };

  const handleReject = async () => {
    if (!proofToReject || !rejectionReason.trim()) return;

    try {
      setActioningId(proofToReject.id);
      setIsRejectModalOpen(false);

      // Get current staff user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Unauthorized or staff session expired.');

      const { error: updateProofError } = await supabase
        .from('payment_proofs')
        .update({
          status: 'REJECTED',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason
        })
        .eq('id', proofToReject.id);

      if (updateProofError) throw updateProofError;

      setNotification({
        message: `Payment proof for "${proofToReject.pets?.name || 'Pet'}" was rejected.`,
        type: 'warning'
      });
      fetchProofs();
    } catch (err: any) {
      console.error('Error rejecting payment proof:', err);
      setNotification({
        message: `Failed to reject proof: ${err.message || 'Database error occurred.'}`,
        type: 'error'
      });
    } finally {
      setActioningId(null);
      setProofToReject(null);
    }
  };

  // Filter queue records based on tab selection
  const filteredProofs = proofs.filter(p => {
    const matchesTab = activeTab === 'ALL' || p.status === activeTab;
    const matchesPurpose = activePurpose === 'ALL' || (p.purpose || 'ADOPTION_FEE') === activePurpose;
    return matchesTab && matchesPurpose;
  });

  if (loading && proofs.length === 0) {
    return (
      <div className="py-20 bg-hprh-paper min-h-[60vh] flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 border-4 border-hprh-sage border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="font-mono text-xs uppercase tracking-widest text-hprh-pine/50">Loading Payment Queue...</p>
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
            Auditing Dossiers
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-hprh-pine">
            Adoption Payment Review Queue
          </h1>
          <p className="text-xs text-hprh-pine/50 mt-1">
            Audit manual bank wire transfer receipts submitted by approved adopters to release tracking IDs.
          </p>
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
          {(['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'ALL'] as const).map((tab) => {
            const isActive = activeTab === tab;
            const count = proofs.filter(p => tab === 'ALL' || p.status === tab).length;
            
            let label: string = tab;
            if (tab === 'PENDING_REVIEW') label = 'Pending Audit';
            if (tab === 'APPROVED') label = 'Approved';
            if (tab === 'REJECTED') label = 'Rejected';
            if (tab === 'ALL') label = 'All Receipts';

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

        {/* Purpose Filter Sub-Tabs */}
        <div className="flex flex-wrap gap-2 font-mono text-[9px] sm:text-xs uppercase tracking-wider select-none bg-hprh-pine/5 p-1.5 rounded-md w-max max-w-full">
          {(['ALL', 'ADOPTION_FEE', 'TRANSPORT_FEE', 'SECURITY_DEPOSIT'] as const).map((purposeOpt) => {
            const isActive = activePurpose === purposeOpt;
            const count = proofs.filter(p => {
              const matchesTab = activeTab === 'ALL' || p.status === activeTab;
              const matchesPurpose = purposeOpt === 'ALL' || (p.purpose || 'ADOPTION_FEE') === purposeOpt;
              return matchesTab && matchesPurpose;
            }).length;

            let label = purposeOpt.replace('_', ' ');
            if (purposeOpt === 'ALL') label = 'All Purposes';

            return (
              <button
                key={purposeOpt}
                onClick={() => setActivePurpose(purposeOpt)}
                className={`py-1.5 px-3 rounded text-[10px] sm:text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-hprh-sage text-hprh-paper shadow-sm'
                    : 'text-hprh-pine/60 hover:text-hprh-pine hover:bg-hprh-pine/5'
                }`}
              >
                <span>{label}</span>
                <span className={`ml-1.5 px-1 py-0.2 rounded text-[8px] ${
                  isActive ? 'bg-hprh-paper/20 text-hprh-paper' : 'bg-hprh-pine/10 text-hprh-pine/60'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Queue List Container */}
        {filteredProofs.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-hprh-pine/15 bg-hprh-paper-dark/30 rounded-lg space-y-3">
            <h3 className="font-display text-xl font-bold text-hprh-pine/70">No Receipts Filed</h3>
            <p className="text-xs text-hprh-pine/50 max-w-sm mx-auto leading-relaxed">
              There are no wire transfer receipts matching your selected filters.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProofs.map((proof) => {
              const isExpanded = expandedProofId === proof.id;
              const hasMismatch = proof.pets && proof.amount_claimed !== proof.pets.adoption_fee;
              
              const dateSubmitted = new Date(proof.submitted_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div
                  key={proof.id}
                  className={`bg-hprh-paper-dark border rounded transition-all duration-200 overflow-hidden shadow-sm ${
                    isExpanded 
                      ? 'border-hprh-sage/50 ring-1 ring-hprh-sage/10' 
                      : 'border-hprh-pine/15 hover:border-hprh-pine/30'
                  }`}
                >
                  {/* Row Summary Header */}
                  <div
                    onClick={() => toggleExpand(proof)}
                    className="flex flex-col md:flex-row md:items-center justify-between p-4 sm:p-5 gap-4 cursor-pointer select-none"
                  >
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 flex-grow">
                      <div>
                        <span className="block text-[8px] font-mono uppercase tracking-widest text-hprh-pine/40">Adopter Details</span>
                        <span className="text-sm font-bold text-hprh-pine block truncate">{proof.adopters?.full_name || 'Anonymous Adopter'}</span>
                        <span className="text-[10px] text-hprh-pine/50 block truncate">{proof.adopters?.email}</span>
                      </div>
                      
                      <div>
                        <span className="block text-[8px] font-mono uppercase tracking-widest text-hprh-pine/40">Target Pet</span>
                        <span className="text-sm font-bold text-hprh-sage">{proof.pets?.name || 'Deleted Case'}</span>
                      </div>

                      <div>
                        <span className="block text-[8px] font-mono uppercase tracking-widest text-hprh-pine/40">Purpose</span>
                        <span className={`inline-flex items-center font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border rounded-sm mt-1 w-max ${
                          (proof.purpose || 'ADOPTION_FEE') === 'ADOPTION_FEE'
                            ? 'border-hprh-pine/30 bg-hprh-pine/5 text-hprh-pine'
                            : (proof.purpose || 'ADOPTION_FEE') === 'TRANSPORT_FEE'
                            ? 'border-hprh-sage/30 bg-hprh-sage/5 text-hprh-sage'
                            : 'border-hprh-gold/30 bg-hprh-gold/5 text-hprh-gold'
                        }`}>
                          {(proof.purpose || 'ADOPTION_FEE').replace('_', ' ')}
                        </span>
                      </div>

                      <div>
                        <span className="block text-[8px] font-mono uppercase tracking-widest text-hprh-pine/40">Amount Claimed</span>
                        <span className="text-xs font-mono font-bold text-hprh-pine">
                          {proof.amount_claimed.toLocaleString('en-US', { style: 'currency', currency: proof.pets?.currency || 'USD' })}
                        </span>
                        {hasMismatch && (
                          <span className="inline-flex items-center gap-0.5 text-[8px] uppercase tracking-wider font-mono font-bold bg-hprh-gold/15 text-hprh-gold border border-hprh-gold/30 px-1 rounded block w-max mt-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" /> Mismatch
                          </span>
                        )}
                      </div>

                      <div>
                        <span className="block text-[8px] font-mono uppercase tracking-widest text-hprh-pine/40">Submitted At</span>
                        <span className="text-xs font-mono font-medium text-hprh-pine/70">{dateSubmitted}</span>
                      </div>

                      <div className="flex items-center md:justify-start">
                        {proof.status === 'PENDING_REVIEW' ? (
                          <span className="inline-block font-display text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 border border-hprh-gold/50 bg-hprh-gold/5 text-hprh-gold rounded rotate-[1deg]">
                            Pending Audit
                          </span>
                        ) : proof.status === 'APPROVED' ? (
                          <span className="inline-block font-display text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 border border-hprh-sage/50 bg-hprh-sage/5 text-hprh-sage rounded rotate-[-1deg]">
                            Approved
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
                          
                          {/* Ledger Verification Summary */}
                          <div className="space-y-3 font-sans text-xs">
                            <h4 className="font-mono text-[10px] uppercase tracking-widest text-hprh-sage font-bold border-b border-hprh-sage/20 pb-1.5">
                              Ledger Validation
                            </h4>
                            
                            <div className="space-y-2.5 pl-1">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-hprh-sage flex-shrink-0" />
                                <span className="font-semibold w-24">Adopter:</span>
                                <span className="font-mono">{proof.adopters?.full_name}</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-hprh-sage flex-shrink-0" />
                                <span className="font-semibold w-24">Email:</span>
                                <span className="font-mono">{proof.adopters?.email}</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-hprh-sage flex-shrink-0" />
                                <span className="font-semibold w-24">Sent To Account:</span>
                                <span className="font-mono truncate bg-hprh-pine/5 px-2 py-0.5 rounded text-[10px] border border-hprh-pine/10">
                                  {proof.bank_accounts?.bank_name} {proof.bank_accounts?.account_number ? `(...${proof.bank_accounts.account_number.slice(-4)})` : proof.bank_accounts?.handle ? `(${proof.bank_accounts.handle})` : ''}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-hprh-sage flex-shrink-0" />
                                <span className="font-semibold w-24">Amount Claimed:</span>
                                <span className="font-mono font-bold">{proof.amount_claimed} {proof.pets?.currency}</span>
                              </div>

                              {proof.pets && (
                                <div className="flex items-center gap-2">
                                  <AlertCircle className="w-4 h-4 text-hprh-sage flex-shrink-0" />
                                  <span className="font-semibold w-24">Expected Fee:</span>
                                  <span className="font-mono">{proof.pets.adoption_fee} {proof.pets.currency}</span>
                                </div>
                              )}

                              {proof.transport_requests?.pickup_method && (
                                <div className="flex items-center gap-2">
                                  <Truck className="w-4 h-4 text-hprh-sage flex-shrink-0" />
                                  <span className="font-semibold w-24">Pickup Method:</span>
                                  <span className="font-mono bg-hprh-pine/5 px-2 py-0.5 rounded text-[10px] border border-hprh-pine/10 uppercase font-bold text-hprh-pine/80">
                                    {proof.transport_requests.pickup_method.replace('_', ' ')}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Fee Mismatch Danger Alert */}
                          {hasMismatch && proof.pets && (
                            <div className="bg-hprh-gold/10 border border-hprh-gold/25 text-hprh-pine p-3.5 rounded text-xs flex items-start gap-2.5">
                              <AlertTriangle className="w-5 h-5 text-hprh-gold flex-shrink-0 mt-0.5" />
                              <div className="space-y-0.5">
                                <span className="font-mono font-bold text-hprh-gold uppercase text-[9px] block">Discrepancy Warning Flag</span>
                                <p className="leading-relaxed">
                                  The adopter claimed a wire transfer of <strong>{proof.amount_claimed} {proof.pets.currency}</strong>, but the registered pet adoption fee is <strong>{proof.pets.adoption_fee} {proof.pets.currency}</strong>.
                                </p>
                                <p className="text-[9px] text-hprh-pine/50 mt-1">Audit the wire transfer receipt carefully. You may still approve if the difference represents Zelle/wire processing offsets.</p>
                              </div>
                            </div>
                          )}

                          {/* Notes */}
                          {proof.reference_note && (
                            <div className="border border-hprh-pine/15 bg-hprh-paper-dark/30 rounded p-4 relative font-sans text-xs">
                              <div className="absolute left-0 top-0 w-1 h-full bg-hprh-sage/40 rounded-l"></div>
                              <h5 className="font-mono text-[9px] uppercase tracking-widest font-extrabold text-hprh-pine/50 mb-1.5">
                                Adopter Submission Statement
                              </h5>
                              <p className="leading-relaxed text-hprh-pine/80 italic">
                                "{proof.reference_note}"
                              </p>
                            </div>
                          )}

                          {/* Rejection metadata display */}
                          {proof.status === 'REJECTED' && proof.rejection_reason && (
                            <div className="bg-hprh-clay/10 border border-hprh-clay/20 text-hprh-pine p-4 rounded text-xs">
                              <span className="font-mono font-bold text-hprh-clay uppercase text-[9px] block mb-1">Rejection Audit Log</span>
                              <p className="italic font-medium">"{proof.rejection_reason}"</p>
                            </div>
                          )}

                        </div>

                        {/* Right Proof Preview Panel */}
                        <div className="space-y-3">
                          <h4 className="font-mono text-[10px] uppercase tracking-widest text-hprh-sage font-bold border-b border-hprh-sage/20 pb-1.5">
                            Transaction Receipt Document
                          </h4>

                          <div className="border border-hprh-pine/15 bg-white rounded-md overflow-hidden flex flex-col items-center justify-center p-3 relative h-72 shadow-sm">
                            {loadingUrl[proof.id] ? (
                              <div className="text-center space-y-2">
                                <Loader2 className="w-8 h-8 animate-spin text-hprh-sage mx-auto" />
                                <span className="font-mono text-[9px] text-hprh-pine/40 uppercase block">Generating signed url...</span>
                              </div>
                            ) : signedUrls[proof.id] ? (
                              // Check if file is PDF
                              proof.proof_image_url.toLowerCase().endsWith('.pdf') ? (
                                <div className="text-center space-y-3">
                                  <FileText className="w-16 h-16 text-hprh-sage/60 mx-auto" />
                                  <span className="text-xs font-semibold text-hprh-pine block">PDF Receipt Document</span>
                                  <a 
                                    href={signedUrls[proof.id]} 
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
                                    src={signedUrls[proof.id]} 
                                    alt="Payment proof receipt" 
                                    className="w-full h-full object-contain" 
                                  />
                                  <a 
                                    href={signedUrls[proof.id]} 
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
                                <ShieldAlert className="w-8 h-8 mx-auto" />
                                <span className="font-mono text-[9px] uppercase">Token Authorization Error</span>
                              </div>
                            )}
                          </div>
                          
                        </div>

                      </div>

                      {/* Action triggers for PENDING_REVIEW */}
                      {proof.status === 'PENDING_REVIEW' && (
                        <div className="border-t border-dashed border-hprh-pine/15 pt-4 flex items-center justify-between">
                          <span className="text-[10px] font-mono text-hprh-pine/40 uppercase font-semibold">Triage Action:</span>
                          
                          <div className="inline-flex gap-2">
                            <button
                              onClick={() => openRejectModal(proof)}
                              disabled={actioningId !== null}
                              className="bg-hprh-clay text-hprh-paper hover:bg-hprh-clay/95 text-[10px] font-mono font-bold uppercase tracking-wider py-2.5 px-6 rounded inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject Proof</span>
                            </button>

                            <button
                              onClick={() => handleApprove(proof)}
                              disabled={actioningId !== null}
                              className="bg-hprh-sage text-hprh-paper hover:bg-hprh-sage/95 text-[10px] font-mono font-bold uppercase tracking-wider py-2.5 px-6 rounded inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                            >
                              {actioningId === proof.id ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Finalizing...</span>
                                </>
                              ) : (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Approve & Release Tracking</span>
                                </>
                              )}
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

      {/* Reject Modal */}
      {isRejectModalOpen && proofToReject && (
        <div className="fixed inset-0 bg-hprh-pine/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-hprh-paper border-2 border-hprh-pine/20 rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-hprh-paper-dark border-b border-hprh-pine/10 px-5 py-4 flex items-center justify-between">
              <h3 className="font-display font-bold text-base text-hprh-pine flex items-center gap-1.5">
                <AlertTriangle className="w-5 h-5 text-hprh-clay" />
                <span>Reject Wire Proof</span>
              </h3>
              <button 
                onClick={() => setIsRejectModalOpen(false)}
                className="text-hprh-pine/50 hover:text-hprh-pine transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-hprh-pine/70 leading-relaxed">
                Provide a reason for rejecting this wire transfer proof. Adopters will see this note in their portal and need to re-upload.
              </p>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-mono tracking-wider font-bold text-hprh-pine/60">
                  Rejection Reason *
                </label>
                <textarea
                  className="w-full bg-hprh-paper border-2 border-hprh-pine/15 focus:border-hprh-sage focus:ring-1 focus:ring-hprh-sage rounded p-3 text-xs text-hprh-pine font-sans min-h-[100px] resize-none focus:outline-none"
                  placeholder="e.g. Wire proof screenshot is blurred. Please upload a clear receipt showing the account numbers and transaction date."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-hprh-pine/10">
                <Button variant="ghost" onClick={() => setIsRejectModalOpen(false)}>
                  Cancel
                </Button>
                <button
                  onClick={handleReject}
                  disabled={!rejectionReason.trim()}
                  className="bg-hprh-clay text-hprh-paper hover:bg-hprh-clay/95 text-[10px] font-mono font-bold uppercase tracking-wider py-2.5 px-5 rounded disabled:opacity-50 transition-colors"
                >
                  Reject & Notify
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md w-full animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className={`p-4 rounded-lg shadow-lg border text-xs flex items-start gap-3 relative ${
            notification.type === 'success' 
              ? 'bg-hprh-sage/10 border-hprh-sage/30 text-hprh-pine' 
              : notification.type === 'warning'
              ? 'bg-hprh-gold/10 border-hprh-gold/30 text-hprh-pine'
              : 'bg-hprh-clay/10 border-hprh-clay/30 text-hprh-pine'
          }`}>
            <Check className={`w-5 h-5 flex-shrink-0 ${
              notification.type === 'success' ? 'text-hprh-sage' : notification.type === 'warning' ? 'text-hprh-gold' : 'text-hprh-clay'
            }`} />
            
            <div className="flex-grow space-y-1">
              <span className="font-mono uppercase font-bold block">
                {notification.type === 'success' ? 'Triage Success' : notification.type === 'warning' ? 'Triage Rejection' : 'Triage Error'}
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

export default AdminPaymentProofs;
