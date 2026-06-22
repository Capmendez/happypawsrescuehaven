import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Container from '../../components/ui/Container';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import { 
  Building2, 
  Copy, 
  Check, 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  ArrowRight,
  ShieldCheck,
  Clock
} from 'lucide-react';

interface ApplicationData {
  id: string;
  pet_id: string;
  adopter_id: string;
  status: string;
  pets: {
    id: string;
    name: string;
    photo_url: string | null;
    photos: string[] | null;
    adoption_fee: number;
    currency: string;
    breed: string | null;
    case_number: string;
  } | null;
  adopters: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
  } | null;
}

interface ActiveBankAccount {
  id: string;
  bank_name: string;
  account_name: string;
  account_number: string | null;
  routing_number: string | null;
  account_type: 'checking' | 'savings' | null;
  swift_code: string | null;
  currency: string;
  logo_url: string | null;
  notes: string | null;
  method_type?: string;
  handle?: string | null;
  display_label?: string | null;
}

export const Checkout: React.FC = () => {
  const { applicationId } = useParams<{ applicationId: string }>();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Guard states
  const [application, setApplication] = useState<ApplicationData | null>(null);
  const [bankAccounts, setBankAccounts] = useState<ActiveBankAccount[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<'UNPAID' | 'PENDING_REVIEW' | 'APPROVED' | 'PAID'>('UNPAID');
  const [existingProof, setExistingProof] = useState<any>(null);
  const [existingAdoption, setExistingAdoption] = useState<any>(null);

  // Form states
  const [amountClaimed, setAmountClaimed] = useState<string>('');
  const [referenceNote, setReferenceNote] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Cleanup object URL when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);
  
  // Clipboard copy feedback states
  const [copiedField, setCopiedField] = useState<{ [key: string]: boolean }>({});

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(prev => ({ ...prev, [fieldId]: true }));
    setTimeout(() => {
      setCopiedField(prev => ({ ...prev, [fieldId]: false }));
    }, 2000);
  };

  const fetchCheckoutData = async () => {
    if (!applicationId) {
      setError('Invalid application identifier.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. Fetch application, pet, and adopter joined details
      const { data: appData, error: appError } = await supabase
        .from('adoption_applications')
        .select('id, pet_id, adopter_id, status, pets:pet_id(*), adopters:adopter_id(*)')
        .eq('id', applicationId)
        .maybeSingle();

      if (appError) throw appError;

      if (!appData) {
        setError('Application dossier not found. Please review your checkout link or contact support.');
        setLoading(false);
        return;
      }

      const typedAppData = appData as unknown as ApplicationData;
      setApplication(typedAppData);
      
      // Prefill amount claimed
      if (typedAppData.pets?.adoption_fee) {
        setAmountClaimed(typedAppData.pets.adoption_fee.toString());
      }

      // Guard check: Block if not APPROVED
      if (typedAppData.status !== 'APPROVED') {
        setPaymentStatus('UNPAID');
        setLoading(false);
        return;
      }

      // 2. Query adoptions to see if it's already finalized/paid
      const { data: adoptionData, error: adoptError } = await supabase
        .from('adoptions')
        .select('*')
        .eq('application_id', applicationId)
        .maybeSingle();

      if (adoptError) throw adoptError;

      if (adoptionData) {
        setExistingAdoption(adoptionData);
        setPaymentStatus('PAID');
        setLoading(false);
        return;
      }

      // 3. Query existing payment proofs
      const { data: proofs, error: proofError } = await supabase
        .from('payment_proofs')
        .select('*')
        .eq('application_id', applicationId);

      if (proofError) throw proofError;

      if (proofs && proofs.length > 0) {
        // Sort to check if there is an APPROVED or PENDING_REVIEW proof
        const approvedProof = proofs.find(p => p.status === 'APPROVED');
        const pendingProof = proofs.find(p => p.status === 'PENDING_REVIEW');
        const rejectedProofs = proofs.filter(p => p.status === 'REJECTED');

        if (approvedProof) {
          setExistingProof(approvedProof);
          setPaymentStatus('APPROVED');
          
          // Also fetch the adoption ID if not already set
          const { data: adoptRec } = await supabase
            .from('adoptions')
            .select('*')
            .eq('application_id', applicationId)
            .maybeSingle();
          if (adoptRec) {
            setExistingAdoption(adoptRec);
          }

          setLoading(false);
          return;
        } else if (pendingProof) {
          setExistingProof(pendingProof);
          setPaymentStatus('PENDING_REVIEW');
          setLoading(false);
          return;
        } else if (rejectedProofs.length > 0) {
          // If all proofs are rejected, we allow resubmitting
          setPaymentStatus('UNPAID');
          // We can optionally show the rejection reason of the last one
          const lastRejected = rejectedProofs[rejectedProofs.length - 1];
          setExistingProof(lastRejected);
        }
      }

      // 4. Fetch all active bank accounts matching currency
      const currency = typedAppData.pets?.currency || 'USD';
      const { data: bankData, error: bankError } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('is_active', true)
        .eq('currency', currency);

      if (bankError) throw bankError;

      const activeBanks = (bankData || []) as ActiveBankAccount[];
      setBankAccounts(activeBanks);
      
      if (activeBanks.length > 0) {
        setSelectedBankId(activeBanks[0].id);
      }

    } catch (err: any) {
      console.error('Error fetching checkout details:', err);
      setError(err.message || 'System was unable to synchronize checkout files.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCheckoutData();
  }, [applicationId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    // Validate size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setFileError('File size exceeds 5MB limit.');
      setSelectedFile(null);
      return;
    }

    // Validate type (JPG, PNG, HEIC, PDF)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/heic', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setFileError('Supported formats: JPG, PNG, HEIC, or PDF receipts.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    if (file.type !== 'application/pdf') {
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!application || !selectedBankId) return;

    if (!selectedFile) {
      setFileError('Proof of transfer document is required.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setFileError(null);

      // 1. Upload proof file to Supabase private storage bucket 'payment-proofs'
      const fileExt = selectedFile.name.split('.').pop();
      const sanitizedName = selectedFile.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 15);
      const storagePath = `${application.id}/${Date.now()}-${sanitizedName}.${fileExt}`;

      console.log("Uploading file:", selectedFile, "type:", selectedFile?.type, "size:", selectedFile?.size, "path:", storagePath);

      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(storagePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: selectedFile.type
        });

      if (uploadError) throw uploadError;

      // 2. Insert record in payment_proofs
      const { error: dbError } = await supabase
        .from('payment_proofs')
        .insert([{
          application_id: application.id,
          pet_id: application.pet_id,
          adopter_id: application.adopter_id,
          bank_account_id: selectedBankId,
          proof_image_url: storagePath,
          amount_claimed: parseFloat(amountClaimed) || application.pets?.adoption_fee || 0,
          reference_note: referenceNote || null,
          status: 'PENDING_REVIEW'
        }]);

      if (dbError) throw dbError;

      setPaymentStatus('PENDING_REVIEW');
      fetchCheckoutData();
    } catch (err: any) {
      console.error('Error submitting payment proof:', err);
      setError(err.message || 'Failed to submit payment proof. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 bg-hprh-paper min-h-[70vh] flex items-center justify-center">
        <div className="space-y-4 text-center">
          <Loader2 className="w-10 h-10 border-4 border-hprh-sage border-t-transparent rounded-full animate-spin mx-auto text-hprh-sage" />
          <p className="font-mono text-xs uppercase tracking-widest text-hprh-pine/50">Accessing secure gateway...</p>
        </div>
      </div>
    );
  }

  // 1. Error / Not Found View
  if (error || !application) {
    return (
      <div className="py-20 bg-hprh-paper min-h-screen flex items-center">
        <Container className="max-w-md text-center space-y-6">
          <AlertCircle className="w-12 h-12 text-hprh-clay mx-auto" />
          <h1 className="text-3xl font-display font-extrabold text-hprh-pine">Checkout Unavailable</h1>
          <p className="text-sm text-hprh-pine/70 leading-relaxed">
            {error || 'The requested application record could not be loaded.'}
          </p>
          <div className="pt-4">
            <Link to="/adopt" className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-hprh-sage hover:underline">
              Browse Available Pets <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Container>
      </div>
    );
  }

  // 2. Guard Check: Application is not approved
  if (application.status !== 'APPROVED') {
    return (
      <div className="py-20 bg-hprh-paper min-h-screen flex items-center">
        <Container className="max-w-md text-center space-y-6">
          <AlertCircle className="w-12 h-12 text-hprh-gold mx-auto" />
          <h1 className="text-3xl font-display font-extrabold text-hprh-pine">Checkout Locked</h1>
          <p className="text-sm text-hprh-pine/70 leading-relaxed">
            This adoption application is currently in <strong>{application.status}</strong> status. 
            Adoption fee checkout is only available once an application has been fully audited and <strong>APPROVED</strong> by our adoption staff.
          </p>
          <div className="pt-4">
            <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-hprh-sage hover:underline">
              Return Home <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Container>
      </div>
    );
  }

  const pet = application.pets;
  const petPhoto = (pet?.photos && pet.photos.length > 0) ? pet.photos[0] : pet?.photo_url;
  const expectedFee = pet?.adoption_fee || 0;
  const currency = pet?.currency || 'USD';

  // 3. Already Finalized State (APPROVED or PAID)
  if (paymentStatus === 'APPROVED' || paymentStatus === 'PAID') {
    const adoptionId = existingAdoption?.id;
    return (
      <div className="py-20 bg-hprh-paper min-h-screen flex items-center">
        <Container className="max-w-xl">
          <div className="bg-hprh-paper-dark border-2 border-hprh-sage/30 rounded-lg p-8 text-center space-y-6 shadow-md relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-hprh-sage"></div>
            
            <CheckCircle className="w-12 h-12 text-hprh-sage mx-auto" />
            
            <div className="space-y-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-hprh-sage font-extrabold">
                Transaction Completed
              </span>
              <h1 className="font-display text-3xl font-extrabold text-hprh-pine">
                Adoption Finalized!
              </h1>
            </div>

            <p className="text-sm text-hprh-pine/70 leading-relaxed max-w-md mx-auto">
              Thank you! The adoption fee for <strong>{pet?.name}</strong> has been successfully processed. 
              Our team has approved your transfer verification, and your adoption is official.
            </p>

            <div className="bg-white/40 border border-hprh-pine/15 rounded p-5 space-y-3 max-w-sm mx-auto text-left">
              <span className="text-[9px] font-mono uppercase tracking-wider text-hprh-pine/40 font-bold block">
                Next Step: Pickup or Transport
              </span>
              <p className="text-[11px] text-hprh-pine/75 leading-relaxed">
                Next, let us know how you'd like to get <strong>{pet?.name}</strong> home — pick them up yourself, or have us arrange transport.
              </p>
            </div>

            <div className="pt-4">
              {adoptionId ? (
                <Link 
                  to={`/transport/request/${adoptionId}`} 
                  className="bg-hprh-sage text-hprh-paper hover:bg-hprh-sage/95 text-[10px] font-mono font-bold uppercase tracking-wider py-3.5 px-6 rounded transition-colors inline-flex items-center gap-2 shadow"
                >
                  <span>Coordinate Pet Transport</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <div className="text-xs text-hprh-clay font-semibold">
                  Loading transport coordination gateway...
                </div>
              )}
            </div>
          </div>
        </Container>
      </div>
    );
  }

  // 4. Pending Review State (Uploaded, but staff hasn't triaged yet)
  if (paymentStatus === 'PENDING_REVIEW') {
    return (
      <div className="py-20 bg-hprh-paper min-h-screen flex items-center">
        <Container className="max-w-xl">
          <div className="bg-hprh-paper-dark border border-hprh-pine/15 rounded-lg p-8 text-center space-y-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-hprh-gold"></div>
            
            <Clock className="w-12 h-12 text-hprh-gold mx-auto" />
            
            <div className="space-y-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-hprh-gold font-extrabold">
                Review in Progress
              </span>
              <h1 className="font-display text-3xl font-extrabold text-hprh-pine">
                Proof Submitted
              </h1>
            </div>

            <p className="text-sm text-hprh-pine/70 leading-relaxed max-w-md mx-auto">
              We have received your payment proof screenshot for <strong>{pet?.name}</strong>. 
              Our rescue administration team will inspect the transfer and reconcile the ledger details.
            </p>

            <div className="bg-white/40 border border-hprh-pine/10 rounded p-4 text-xs text-hprh-pine/60 max-w-md mx-auto leading-relaxed">
              Verification usually takes **1-2 business days**. Once approved, you will receive an automated email confirmation containing your pet's transport tracking ID.
            </div>

            <div className="pt-4">
              <Link 
                to="/" 
                className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-hprh-sage hover:underline"
              >
                Go to Homepage <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  // 5. Unpaid State - Show Bank Accounts and Upload form
  const selectedBank = bankAccounts.find(b => b.id === selectedBankId);

  return (
    <div className="py-12 bg-hprh-paper text-hprh-pine font-sans min-h-screen">
      <Container className="max-w-4xl space-y-8">
        
        {/* Page Header */}
        <div className="border-b-2 border-dashed border-hprh-pine/20 pb-5">
          <span className="font-mono text-xs uppercase tracking-widest text-hprh-sage font-bold block mb-1">
            Adoption Fee Checkout
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-hprh-pine">
            Complete Your Adoption
          </h1>
          <p className="text-xs text-hprh-pine/50 mt-1">
            Dossier reference: <span className="font-mono font-semibold">{applicationId}</span>
          </p>
        </div>

        {/* Mismatch Alert for rejected proof */}
        {existingProof && existingProof.status === 'REJECTED' && (
          <div className="bg-hprh-clay/10 border border-hprh-clay/20 text-hprh-pine p-4 rounded text-xs flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-hprh-clay flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-mono uppercase font-bold text-hprh-clay block">Previous Submission Rejected</span>
              <p className="leading-relaxed">
                Your previous payment proof was rejected. Reason given by review staff: 
                <span className="font-semibold block italic text-hprh-clay mt-1">"{existingProof.rejection_reason || 'No reason specified'}"</span>
              </p>
              <p className="text-[10px] text-hprh-pine/50 mt-1">Please review the bank details, re-initiate the transfer if necessary, and upload a new receipt below.</p>
            </div>
          </div>
        )}

        {/* Layout Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          
          {/* Left Column: Pet Summary & Bank Details */}
          <div className="md:col-span-7 space-y-6">
            
            {/* Pet Summary Card */}
            <div className="bg-hprh-paper-dark border border-hprh-pine/15 rounded-lg p-5 flex items-center gap-4 shadow-sm">
              <div className="w-20 h-20 bg-white border border-hprh-pine/10 rounded-md overflow-hidden flex-shrink-0 shadow-inner">
                {petPhoto ? (
                  <img src={petPhoto} alt={pet?.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-hprh-pine/5 text-hprh-pine/20 font-mono text-[10px]">NO PHOTO</div>
                )}
              </div>
              <div className="space-y-1.5 flex-grow">
                <span className="font-mono text-[9px] uppercase tracking-widest text-hprh-sage font-bold">
                  Finalizing Adoption For
                </span>
                <h3 className="font-display font-bold text-xl text-hprh-pine leading-tight">
                  {pet?.name}
                </h3>
                <p className="text-xs text-hprh-pine/50 leading-none">{pet?.breed || 'Mixed Breed'}</p>
                
                <div className="pt-1.5 flex items-baseline gap-1">
                  <span className="text-xs text-hprh-pine/60 uppercase font-mono">Adoption Fee:</span>
                  <span className="text-lg font-mono font-bold text-hprh-clay">
                    {expectedFee.toLocaleString('en-US', { style: 'currency', currency: currency })}
                  </span>
                </div>
              </div>
            </div>

            {/* Bank Accounts Display Section */}
            <div className="bg-hprh-paper-dark border border-hprh-pine/15 rounded-lg p-5 space-y-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-hprh-pine/10 pb-3">
                <h4 className="font-mono text-[10px] uppercase tracking-widest font-extrabold text-hprh-pine/70">
                  Step 1: Wire Transfer Details
                </h4>
                <ShieldCheck className="w-4.5 h-4.5 text-hprh-sage" />
              </div>

              <p className="text-xs text-hprh-pine/60 leading-relaxed">
                Please transfer the adoption fee of <strong className="text-hprh-pine">{expectedFee.toLocaleString('en-US', { style: 'currency', currency: currency })}</strong> to one of our verified rescue accounts below using your personal banking app or wire service.
              </p>

              {bankAccounts.length === 0 ? (
                <div className="text-center py-6 bg-hprh-paper border border-dashed border-hprh-pine/15 rounded text-xs text-hprh-pine/40 select-none">
                  No active wire accounts configured for {currency}. Please contact support.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Select dropdown if multiple active accounts */}
                  {bankAccounts.length > 1 && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase tracking-wider font-bold text-hprh-pine/55">
                        Select Destination Bank
                      </label>
                      <select
                        value={selectedBankId}
                        onChange={(e) => setSelectedBankId(e.target.value)}
                        className="w-full bg-hprh-paper border border-hprh-pine/15 focus:border-hprh-sage focus:ring-1 focus:ring-hprh-sage rounded px-3.5 py-2.5 text-xs text-hprh-pine focus:outline-none"
                      >
                        {bankAccounts.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.display_label || b.bank_name} ({b.bank_name})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Active Bank details card */}
                  {selectedBank && (
                    <div className="bg-white/60 border border-hprh-pine/10 rounded-md p-4 space-y-4 relative overflow-hidden animate-in fade-in duration-200">
                      
                      {/* Logo and Type */}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white border border-hprh-pine/10 rounded flex items-center justify-center p-1 overflow-hidden shadow-sm flex-shrink-0">
                          {selectedBank.logo_url ? (
                            <img src={selectedBank.logo_url} alt={`${selectedBank.bank_name} logo`} className="w-full h-full object-contain" />
                          ) : (
                            <Building2 className="w-5 h-5 text-hprh-pine/30" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-hprh-pine">{selectedBank.display_label || selectedBank.bank_name}</div>
                          <span className="font-mono text-[9px] uppercase font-bold text-hprh-sage bg-hprh-sage/10 px-1.5 py-0.5 rounded">
                            {selectedBank.method_type || 'bank_transfer'}
                          </span>
                        </div>
                      </div>

                      {/* Details list with clipboard actions */}
                      <div className="space-y-2 text-xs divide-y divide-hprh-pine/5">
                        {/* Account Name */}
                        <div className="flex items-center justify-between py-1.5">
                          <div>
                            <span className="text-[9px] font-mono text-hprh-pine/40 uppercase block">Account Holder</span>
                            <span className="font-semibold text-hprh-pine">{selectedBank.account_name}</span>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => handleCopy(selectedBank.account_name, 'account_name')}
                            className="p-1 text-hprh-pine/40 hover:text-hprh-sage transition-colors"
                          >
                            {copiedField['account_name'] ? <Check className="w-3.5 h-3.5 text-hprh-sage" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        {(!selectedBank.method_type || selectedBank.method_type === 'bank_transfer') ? (
                          <>
                            {/* Account Number */}
                            {selectedBank.account_number && (
                              <div className="flex items-center justify-between py-1.5">
                                <div>
                                  <span className="text-[9px] font-mono text-hprh-pine/40 uppercase block">Account Number</span>
                                  <span className="font-mono font-bold text-hprh-pine">{selectedBank.account_number}</span>
                                </div>
                                <button 
                                  type="button" 
                                  onClick={() => handleCopy(selectedBank.account_number || '', 'account_number')}
                                  className="p-1 text-hprh-pine/40 hover:text-hprh-sage transition-colors"
                                >
                                  {copiedField['account_number'] ? <Check className="w-3.5 h-3.5 text-hprh-sage" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            )}

                            {/* Routing Number */}
                            {selectedBank.routing_number && (
                              <div className="flex items-center justify-between py-1.5">
                                <div>
                                  <span className="text-[9px] font-mono text-hprh-pine/40 uppercase block">Routing Number (ABA/ACH)</span>
                                  <span className="font-mono font-bold text-hprh-pine">{selectedBank.routing_number}</span>
                                </div>
                                <button 
                                  type="button" 
                                  onClick={() => handleCopy(selectedBank.routing_number || '', 'routing_number')}
                                  className="p-1 text-hprh-pine/40 hover:text-hprh-sage transition-colors"
                                >
                                  {copiedField['routing_number'] ? <Check className="w-3.5 h-3.5 text-hprh-sage" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            )}

                            {/* SWIFT Code */}
                            {selectedBank.swift_code && (
                              <div className="flex items-center justify-between py-1.5">
                                <div>
                                  <span className="text-[9px] font-mono text-hprh-pine/40 uppercase block">SWIFT / BIC Code</span>
                                  <span className="font-mono font-bold text-hprh-pine">{selectedBank.swift_code}</span>
                                </div>
                                <button 
                                  type="button" 
                                  onClick={() => handleCopy(selectedBank.swift_code || '', 'swift_code')}
                                  className="p-1 text-hprh-pine/40 hover:text-hprh-sage transition-colors"
                                >
                                  {copiedField['swift_code'] ? <Check className="w-3.5 h-3.5 text-hprh-sage" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            )}
                          </>
                        ) : (
                          /* Non-bank transfer details (handle-based) */
                          selectedBank.handle && (
                            <div className="flex items-center justify-between py-1.5">
                              <div>
                                <span className="text-[9px] font-mono text-hprh-pine/40 uppercase block">Identifier / Handle</span>
                                <span className="font-mono font-bold text-hprh-clay">{selectedBank.handle}</span>
                              </div>
                              <button 
                                type="button" 
                                onClick={() => handleCopy(selectedBank.handle || '', 'handle')}
                                className="p-1 text-hprh-pine/40 hover:text-hprh-sage transition-colors"
                              >
                                {copiedField['handle'] ? <Check className="w-3.5 h-3.5 text-hprh-sage" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          )
                        )}
                      </div>

                      {/* Bank notes */}
                      {selectedBank.notes && (
                        <div className="bg-hprh-paper border border-hprh-pine/10 rounded p-2.5 text-[10px] text-hprh-pine/60 leading-relaxed italic">
                          <strong>Note:</strong> {selectedBank.notes}
                        </div>
                      )}

                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* Right Column: Upload Form */}
          <div className="md:col-span-5">
            <form onSubmit={handleFormSubmit} className="bg-hprh-paper-dark border border-hprh-pine/15 rounded-lg p-5 space-y-5 shadow-sm">
              <div className="flex items-center gap-2 border-b border-hprh-pine/10 pb-3">
                <h4 className="font-mono text-[10px] uppercase tracking-widest font-extrabold text-hprh-pine/70">
                  Step 2: Upload Proof
                </h4>
              </div>

              {/* Mismatch indicator info */}
              <div className="space-y-4">
                <Input
                  label={`Amount Transferred (${currency}) *`}
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amountClaimed}
                  onChange={(e) => setAmountClaimed(e.target.value)}
                  required
                  helperText={`Expected fee: ${expectedFee} ${currency}`}
                />

                {/* File Dropzone */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs uppercase tracking-wider text-hprh-pine/70 font-bold select-none">
                    Payment Receipt Screen *
                  </label>
                  
                  <div className={`border-2 border-dashed rounded-lg p-5 flex flex-col items-center justify-center transition-colors ${
                    selectedFile 
                      ? 'border-hprh-sage/50 bg-hprh-sage/5' 
                      : fileError 
                      ? 'border-hprh-clay/40 bg-hprh-clay/5'
                      : 'border-hprh-pine/15 hover:border-hprh-sage/30 bg-hprh-paper'
                  }`}>
                    {selectedFile ? (
                      <div className="text-center space-y-2">
                        {previewUrl ? (
                          <div className="w-20 h-20 bg-white border border-hprh-pine/10 rounded overflow-hidden mx-auto shadow-sm flex items-center justify-center p-0.5 animate-in fade-in duration-200">
                            <img src={previewUrl} alt="Receipt preview" className="w-full h-full object-cover rounded-sm" />
                          </div>
                        ) : (
                          <FileText className="w-8 h-8 text-hprh-sage mx-auto" />
                        )}
                        <span className="text-xs font-mono font-bold text-hprh-sage block truncate max-w-[200px] mx-auto">
                          {selectedFile.name}
                        </span>
                        <span className="text-[9px] text-hprh-pine/50 block font-mono">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                        <button
                          type="button"
                          onClick={handleClearFile}
                          className="text-[9px] uppercase font-mono tracking-widest font-bold text-hprh-clay hover:underline block mx-auto mt-1"
                        >
                          Clear Selection
                        </button>
                      </div>
                    ) : (
                      <div className="text-center space-y-2 cursor-pointer relative">
                        <Upload className="w-8 h-8 text-hprh-pine/30 mx-auto" />
                        <span className="text-xs font-bold text-hprh-pine block">Choose proof image / PDF</span>
                        <span className="text-[9px] text-hprh-pine/40 block">PNG, JPG, HEIC, PDF. Max 5MB.</span>
                        
                        <label className="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
                          <input 
                            type="file" 
                            accept="image/png, image/jpeg, image/jpg, image/heic, application/pdf"
                            onChange={handleFileChange}
                            required
                          />
                        </label>
                      </div>
                    )}
                  </div>

                  {fileError && (
                    <span className="text-[10px] text-hprh-clay uppercase tracking-wide font-semibold">
                      {fileError}
                    </span>
                  )}
                </div>

                <Textarea
                  label="Adopter Notes (Optional)"
                  placeholder="e.g. Sent via Chase QuickPay, reference number #9923..."
                  value={referenceNote}
                  onChange={(e) => setReferenceNote(e.target.value)}
                  rows={3}
                />

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full font-bold flex items-center justify-center gap-2 py-3 mt-4"
                  disabled={submitting || !selectedBankId}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting proof...</span>
                    </>
                  ) : (
                    <span>Submit Payment Proof</span>
                  )}
                </Button>

                <p className="text-[9px] text-center text-hprh-pine/40 leading-relaxed">
                  Uploading files represents an legal signature confirming that adoption fee funds have been wired to Happy Paws Rescue Haven. Fraudulent uploads are subject to application voiding.
                </p>

              </div>
            </form>
          </div>

        </div>

      </Container>
    </div>
  );
};

export default Checkout;
