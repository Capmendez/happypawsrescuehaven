import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Container from '../../components/ui/Container';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Textarea from '../../components/ui/Textarea';
import { 
  MapPin, 
  Coins, 
  FileText, 
  Check, 
  Copy, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ShieldCheck,
  Upload,
  Building2,
  User,
  Truck
} from 'lucide-react';
import type { Pet, Adopter, Adoption, TransportRequest, BankAccount, SecurityDeposit } from '../../lib/types';

// Haversine Distance Formula
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const TransportRequestPage: React.FC = () => {
  const { adoptionId } = useParams<{ adoptionId: string }>();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Core Data
  const [adoption, setAdoption] = useState<Adoption | null>(null);
  const [pet, setPet] = useState<Pet | null>(null);
  const [adopter, setAdopter] = useState<Adopter | null>(null);
  const [transportRequest, setTransportRequest] = useState<TransportRequest | null>(null);
  const [securityDeposit, setSecurityDeposit] = useState<SecurityDeposit | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<BankAccount[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string>('');

  // Step 1: Address Input
  const [addressInput, setAddressInput] = useState('');
  const [distance, setDistance] = useState<number | null>(null);
  const [calculatedQuote, setCalculatedQuote] = useState<{ fee: number; tierId: string; currency: string } | null>(null);
  const [geocodeState, setGeocodeState] = useState<{ lat: number; lng: number; formatted: string } | null>(null);

  // Step 2 & 3: Payment Upload
  const [amountClaimed, setAmountClaimed] = useState('');
  const [referenceNote, setReferenceNote] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Copy Feedback
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const loadData = async () => {
    if (!adoptionId) {
      setError('Missing adoption identifier.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let activeAdoptionId = adoptionId;

      // Check if the parameter is actually a transport request ID
      const { data: checkTransport } = await supabase
        .from('transport_requests')
        .select('adoption_id')
        .eq('id', adoptionId)
        .maybeSingle();

      if (checkTransport) {
        activeAdoptionId = checkTransport.adoption_id;
      }

      // 1. Fetch adoption record
      const { data: adoptData, error: adoptErr } = await supabase
        .from('adoptions')
        .select('*, pets:pet_id(*), adopters:adopter_id(*)')
        .eq('id', activeAdoptionId)
        .maybeSingle();

      if (adoptErr) throw adoptErr;
      if (!adoptData) {
        setError('Adoption record not found.');
        setLoading(false);
        return;
      }

      const typedAdoption = adoptData as unknown as Adoption;
      setAdoption(typedAdoption);
      setPet(typedAdoption.pets || null);
      setAdopter(typedAdoption.adopters || null);

      // Guard: Adoption fee must be paid
      if (typedAdoption.payment_status !== 'PAID') {
        setError('Adoption checkout fee must be fully processed and confirmed before requesting transport.');
        setLoading(false);
        return;
      }

      // 2. Fetch existing transport request
      const { data: transportData, error: transportErr } = await supabase
        .from('transport_requests')
        .select('*')
        .eq('adoption_id', activeAdoptionId)
        .maybeSingle();

      if (transportErr) throw transportErr;
      
      const typedTransport = transportData as TransportRequest | null;
      setTransportRequest(typedTransport);

      // 3. Fetch security deposit if transport request exists
      if (typedTransport) {
        const { data: depositData, error: depositErr } = await supabase
          .from('security_deposits')
          .select('*')
          .eq('transport_request_id', typedTransport.id)
          .maybeSingle();

        if (depositErr) throw depositErr;
        setSecurityDeposit(depositData as SecurityDeposit | null);
      }

      // 4. Fetch active payment methods
      const { data: methodsData, error: methodsErr } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('is_active', true);

      if (methodsErr) throw methodsErr;
      
      const activeMethods = (methodsData || []) as BankAccount[];
      setPaymentMethods(activeMethods);
      if (activeMethods.length > 0) {
        setSelectedMethodId(activeMethods[0].id);
      }

    } catch (err: any) {
      console.error('Error synchronizing transport data:', err);
      setError(err.message || 'Unable to retrieve coordination details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [adoptionId]);

  // Step 1: Calculate quote
  const handleCalculateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressInput.trim() || !pet) return;

    if (pet.origin_latitude === null || pet.origin_longitude === null) {
      setError('The foster origin coordinates for this pet are not configured. Please contact administration.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // 1. Geocode adopter address
      const { data: geocodeData, error: geocodeErr } = await supabase.functions.invoke('geocode-address', {
        body: { address: addressInput }
      });

      if (geocodeErr) throw geocodeErr;
      if (geocodeData.error) throw new Error(geocodeData.error);

      const adopterLat = parseFloat(geocodeData.latitude);
      const adopterLng = parseFloat(geocodeData.longitude);
      const formattedAddress = geocodeData.formattedAddress;

      setGeocodeState({ lat: adopterLat, lng: adopterLng, formatted: formattedAddress });

      // 2. Calculate Haversine Distance
      const dist = haversineDistance(
        parseFloat(pet.origin_latitude as any),
        parseFloat(pet.origin_longitude as any),
        adopterLat,
        adopterLng
      );
      setDistance(dist);

      // 3. Fetch tiers and match rate
      const { data: tiersData, error: tiersErr } = await supabase
        .from('transport_fee_tiers')
        .select('*')
        .eq('is_active', true);

      if (tiersErr) throw tiersErr;

      const matchingTier = tiersData?.find((tier: any) => {
        const min = tier.min_distance_miles;
        const max = tier.max_distance_miles;
        return dist >= min && (max === null || dist <= max);
      });

      if (!matchingTier) {
        throw new Error('No matching transportation rate tier exists for this distance.');
      }

      setCalculatedQuote({
        fee: matchingTier.fee_amount,
        tierId: matchingTier.id,
        currency: matchingTier.currency || 'USD'
      });
      setAmountClaimed(matchingTier.fee_amount.toString());

    } catch (err: any) {
      console.error('Quote calculation error:', err);
      setError(err.message || 'Geocoding failed. Please check the address structure.');
    } finally {
      setSubmitting(false);
    }
  };

  // Step 0: Choose pickup method
  const handleSelectPickupMethod = async (method: 'self_pickup' | 'transport') => {
    if (!adoption || !pet || !adopter) return;

    try {
      setSubmitting(true);
      setError(null);

      const targetStatus = method === 'self_pickup' ? 'SELF_PICKUP_CONFIRMED' : 'AWAITING_LOCATION';

      const upsertPayload: any = {
        adoption_id: adoption.id,
        pet_id: pet.id,
        adopter_id: adopter.id,
        pickup_method: method,
        status: targetStatus
      };

      // Preserve existing id if we have one loaded
      if (transportRequest?.id) {
        upsertPayload.id = transportRequest.id;
      }

      const { data, error: upsertErr } = await supabase
        .from('transport_requests')
        .upsert([upsertPayload], { onConflict: 'adoption_id' })
        .select()
        .single();

      if (upsertErr) throw upsertErr;
      setTransportRequest(data as TransportRequest);
      loadData();
    } catch (err: any) {
      console.error('Error selecting pickup method:', err);
      setError(err.message || 'Failed to register your pickup selection.');
    } finally {
      setSubmitting(false);
    }
  };

  // Step 1 completion: Create/Update transport request
  const handleConfirmQuote = async () => {
    if (!calculatedQuote || !geocodeState || !distance || !adoption || !pet || !adopter) return;

    try {
      setSubmitting(true);
      setError(null);

      const upsertPayload: any = {
        adoption_id: adoption.id,
        pet_id: pet.id,
        adopter_id: adopter.id,
        status: 'QUOTE_GENERATED',
        destination_address: geocodeState.formatted,
        destination_latitude: geocodeState.lat,
        destination_longitude: geocodeState.lng,
        distance_miles: distance,
        fee_tier_id: calculatedQuote.tierId,
        transport_fee_amount: calculatedQuote.fee,
        transport_fee_currency: calculatedQuote.currency,
        pickup_method: 'transport'
      };

      // Preserve existing id if we have one loaded
      if (transportRequest?.id) {
        upsertPayload.id = transportRequest.id;
      }

      const { data, error: upsertErr } = await supabase
        .from('transport_requests')
        .upsert([upsertPayload], { onConflict: 'adoption_id' })
        .select()
        .single();

      if (upsertErr) throw upsertErr;
      
      setTransportRequest(data as TransportRequest);
      loadData();
    } catch (err: any) {
      console.error('Error confirming quote:', err);
      setError(err.message || 'Failed to submit transport quote coordinates.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Payment Proof File selection
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

    if (file.size > 5 * 1024 * 1024) {
      setFileError('File size exceeds 5MB limit.');
      setSelectedFile(null);
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/heic', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setFileError('Supported formats: JPG, PNG, HEIC, or PDF.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    if (file.type !== 'application/pdf') {
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // Step 2 & 3 Submission: Proof upload
  const handlePaymentSubmit = async (e: React.FormEvent, purpose: 'TRANSPORT_FEE' | 'SECURITY_DEPOSIT') => {
    e.preventDefault();
    if (!transportRequest || !selectedMethodId || !selectedFile) {
      setFileError('Payment receipt document is required.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setFileError(null);

      // 1. Upload receipt to storage
      const fileExt = selectedFile.name.split('.').pop();
      const sanitizedName = selectedFile.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 15);
      const folder = purpose === 'TRANSPORT_FEE' ? 'transport-fees' : 'security-deposits';
      const storagePath = `${folder}/${transportRequest.id}/${Date.now()}-${sanitizedName}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(storagePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: selectedFile.type
        });

      if (uploadError) throw uploadError;

      // 2. Insert payment proof
      const proofPayload: any = {
        application_id: adoption?.application_id,
        pet_id: pet?.id,
        adopter_id: adopter?.id,
        bank_account_id: selectedMethodId,
        proof_image_url: storagePath,
        amount_claimed: parseFloat(amountClaimed) || 0,
        reference_note: referenceNote || null,
        status: 'PENDING_REVIEW',
        purpose: purpose,
        transport_request_id: transportRequest.id
      };

      if (purpose === 'SECURITY_DEPOSIT' && securityDeposit) {
        proofPayload.security_deposit_id = securityDeposit.id;
      }

      const { data: proofData, error: dbError } = await supabase
        .from('payment_proofs')
        .insert([proofPayload])
        .select()
        .single();

      if (dbError) throw dbError;

      // 3. Update transport request status / links
      if (purpose === 'TRANSPORT_FEE') {
        const { error: updateRequestErr } = await supabase
          .from('transport_requests')
          .update({
            status: 'TRANSPORT_FEE_PENDING',
            transport_fee_proof_id: proofData.id
          })
          .eq('id', transportRequest.id);

        if (updateRequestErr) throw updateRequestErr;
      } else {
        // SECURITY_DEPOSIT
        const { error: updateRequestErr } = await supabase
          .from('transport_requests')
          .update({
            status: 'DEPOSIT_PROOF_SUBMITTED'
          })
          .eq('id', transportRequest.id);

        if (updateRequestErr) throw updateRequestErr;

        const { error: updateDepositErr } = await supabase
          .from('security_deposits')
          .update({
            proof_id: proofData.id
          })
          .eq('id', securityDeposit?.id);

        if (updateDepositErr) throw updateDepositErr;
      }

      setSelectedFile(null);
      setReferenceNote('');
      loadData();
    } catch (err: any) {
      console.error('Error submitting receipt:', err);
      setError(err.message || 'Failed to submit payment verification receipt.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="py-24 bg-hprh-paper min-h-[70vh] flex items-center justify-center">
        <div className="space-y-4 text-center">
          <Loader2 className="w-10 h-10 border-4 border-hprh-sage border-t-transparent rounded-full animate-spin mx-auto text-hprh-sage" />
          <p className="font-mono text-xs uppercase tracking-widest text-hprh-pine/50">Securing dispatch routing...</p>
        </div>
      </div>
    );
  }

  if (error && !adoption) {
    return (
      <div className="py-20 bg-hprh-paper min-h-screen flex items-center">
        <Container className="max-w-md text-center space-y-6">
          <AlertCircle className="w-12 h-12 text-hprh-clay mx-auto" />
          <h1 className="text-3xl font-display font-extrabold text-hprh-pine">Portal Locked</h1>
          <p className="text-sm text-hprh-pine/70 leading-relaxed">{error}</p>
          <div className="pt-4">
            <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-hprh-sage hover:underline">
              Return Home
            </Link>
          </div>
        </Container>
      </div>
    );
  }

  const selectedMethod = paymentMethods.find(m => m.id === selectedMethodId);
  const status = transportRequest?.status || 'AWAITING_CHOICE';

  // Step indicator helper
  const getStepStatusClass = (stepNum: number) => {
    let currentStep = 1;
    if (status === 'QUOTE_GENERATED' || status === 'TRANSPORT_FEE_PENDING') currentStep = 2;
    if (status === 'DEPOSIT_PENDING' || status === 'DEPOSIT_PROOF_SUBMITTED') currentStep = 3;
    if (status === 'TRACKING_ACTIVE' || status === 'DELIVERED') currentStep = 4;

    if (currentStep > stepNum) return 'bg-hprh-sage text-white border-hprh-sage';
    if (currentStep === stepNum) return 'bg-hprh-clay text-white border-hprh-clay animate-pulse';
    return 'bg-hprh-paper-dark border-hprh-pine/15 text-hprh-pine/40';
  };

  return (
    <div className="py-12 bg-hprh-paper text-hprh-pine font-sans min-h-screen">
      <Container className="max-w-4xl space-y-8">
        
        {/* Header */}
        <div className="border-b-2 border-dashed border-hprh-pine/20 pb-5">
          <span className="font-mono text-xs uppercase tracking-widest text-hprh-sage font-bold block mb-1">
            Dispatch Coordination Portal
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-hprh-pine">
            Coordinate Pet Delivery
          </h1>
          <p className="text-xs text-hprh-pine/50 mt-1">
            Pet: <strong className="text-hprh-pine">{pet?.name}</strong> • Adopter: <span className="font-mono">{adopter?.full_name}</span>
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-hprh-clay/10 border border-hprh-clay/20 text-hprh-pine p-4 rounded text-xs flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-hprh-clay flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-mono uppercase font-bold text-hprh-clay block">Coordination Error</span>
              <p className="leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Step Indicator Timeline */}
        {!['AWAITING_CHOICE', 'SELF_PICKUP_CONFIRMED'].includes(status) && (
          <div className="grid grid-cols-4 gap-2 font-mono text-[9px] sm:text-xs font-bold uppercase tracking-wider text-center select-none border-b border-hprh-pine/10 pb-6">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold ${getStepStatusClass(1)}`}>
                {status !== 'AWAITING_LOCATION' ? <Check className="w-4 h-4" /> : '1'}
              </div>
              <span>1. Location</span>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold ${getStepStatusClass(2)}`}>
                {['DEPOSIT_PENDING', 'DEPOSIT_PROOF_SUBMITTED', 'TRACKING_ACTIVE', 'DELIVERED'].includes(status) ? <Check className="w-4 h-4" /> : '2'}
              </div>
              <span>2. Transport Fee</span>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold ${getStepStatusClass(3)}`}>
                {['TRACKING_ACTIVE', 'DELIVERED'].includes(status) ? <Check className="w-4 h-4" /> : '3'}
              </div>
              <span>3. Deposit</span>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold ${getStepStatusClass(4)}`}>
                {status === 'DELIVERED' ? <Check className="w-4 h-4" /> : '4'}
              </div>
              <span>4. Tracking</span>
            </div>
          </div>
        )}

        {/* FLOW STATES */}

        {/* STEP 0: AWAITING_CHOICE */}
        {status === 'AWAITING_CHOICE' && (
          <div className="space-y-6">
            <div className="bg-hprh-paper-dark border border-hprh-pine/15 rounded-lg p-6 sm:p-8 space-y-4 shadow-sm text-center max-w-2xl mx-auto">
              <h3 className="font-display font-extrabold text-2xl text-hprh-pine">
                How would you like to receive {pet?.name}?
              </h3>
              <p className="text-xs text-hprh-pine/60 leading-relaxed">
                Choose between picking up {pet?.name} directly from their foster location or having us arrange nationwide door-to-door delivery.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {/* Option 1: Self Pickup */}
              <div 
                onClick={() => handleSelectPickupMethod('self_pickup')}
                className="bg-hprh-paper-dark hover:bg-white/60 border-2 border-hprh-pine/10 hover:border-hprh-sage/50 rounded-lg p-6 sm:p-8 space-y-4 shadow-sm cursor-pointer transition-all duration-300 flex flex-col items-center text-center group"
              >
                <div className="w-16 h-16 bg-hprh-sage/10 text-hprh-sage rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-105">
                  <User className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h4 className="font-display font-bold text-lg text-hprh-pine">
                    I'll Pick Up {pet?.name} Myself
                  </h4>
                  <p className="text-xs text-hprh-pine/60 leading-relaxed">
                    Coordinate directly with the foster parent to pick up the pet. No shipping fees or deposits are required.
                  </p>
                  <span className="inline-block text-[10px] font-mono font-bold uppercase tracking-wider text-hprh-sage bg-hprh-sage/15 px-2 py-0.5 rounded mt-2">
                    Free / $0.00
                  </span>
                </div>
              </div>

              {/* Option 2: Nationwide Transport */}
              <div 
                onClick={() => handleSelectPickupMethod('transport')}
                className="bg-hprh-paper-dark hover:bg-white/60 border-2 border-hprh-pine/10 hover:border-hprh-sage/50 rounded-lg p-6 sm:p-8 space-y-4 shadow-sm cursor-pointer transition-all duration-300 flex flex-col items-center text-center group"
              >
                <div className="w-16 h-16 bg-hprh-clay/10 text-hprh-clay rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-105">
                  <Truck className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h4 className="font-display font-bold text-lg text-hprh-pine">
                    I Need Transport Arranged
                  </h4>
                  <p className="text-xs text-hprh-pine/60 leading-relaxed">
                    We'll calculate the foster-to-destination distance and arrange premium, safe transportation right to your location.
                  </p>
                  <span className="inline-block text-[10px] font-mono font-bold uppercase tracking-wider text-hprh-clay bg-hprh-clay/15 px-2 py-0.5 rounded mt-2">
                    Paid Delivery Flow
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SELF_PICKUP_CONFIRMED STATE */}
        {status === 'SELF_PICKUP_CONFIRMED' && (
          <div className="bg-hprh-paper-dark border border-hprh-pine/15 rounded-lg p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-hprh-sage"></div>
            <CheckCircle2 className="w-16 h-16 text-hprh-sage mx-auto" />
            <div className="space-y-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-hprh-sage font-bold block">
                Pickup Option Confirmed
              </span>
              <h3 className="font-display font-extrabold text-2xl text-hprh-pine">
                Self-Pickup Scheduled
              </h3>
            </div>
            <p className="text-xs text-hprh-pine/70 leading-relaxed max-w-md mx-auto">
              Great choice! You have chosen to pick up <strong>{pet?.name}</strong> yourself. Our team and the foster home caregiver will be in touch shortly to coordinate a safe pickup date, time, and location.
            </p>
            <div className="bg-white/40 border border-hprh-pine/10 rounded p-4 text-[10px] text-hprh-pine/60 leading-relaxed italic max-w-md mx-auto">
              No additional transport fees or security deposits are required.
            </div>
            <div className="pt-4 border-t border-hprh-pine/10">
              <Link 
                to="/" 
                className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-hprh-sage hover:underline"
              >
                Return to Homepage
              </Link>
            </div>
          </div>
        )}

        {/* STEP 1: AWAITING_LOCATION */}
        {status === 'AWAITING_LOCATION' && (
          <div className="bg-hprh-paper-dark border border-hprh-pine/15 rounded-lg p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="flex items-start gap-4">
              <MapPin className="w-8 h-8 text-hprh-sage flex-shrink-0 mt-1" />
              <div className="space-y-1">
                <h3 className="font-display font-bold text-xl">Address & Route Calculation</h3>
                <p className="text-xs text-hprh-pine/60 leading-relaxed">
                  Enter your physical delivery address. The system will calculate the direct distance from the pet foster home at <strong>{pet?.current_location}</strong> and match it against our delivery rate tiers.
                </p>
              </div>
            </div>

            <form onSubmit={handleCalculateQuote} className="space-y-4 max-w-xl">
              <div className="flex flex-col sm:flex-row items-end gap-3">
                <div className="flex-grow">
                  <Input
                    label="Delivery Destination Address *"
                    placeholder="e.g. 1109 N Highland St, Arlington, VA 22201"
                    value={addressInput}
                    onChange={(e) => setAddressInput(e.target.value)}
                    required
                    disabled={submitting}
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={submitting || !addressInput.trim()}
                  className="bg-hprh-clay text-hprh-paper hover:bg-hprh-clay/95 text-xs font-mono font-bold uppercase tracking-wider py-3.5 px-6 rounded transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Calculate Distance</span>
                  )}
                </button>
              </div>
            </form>

            {/* Display Calculated Quote */}
            {geocodeState && distance && calculatedQuote && (
              <div className="bg-white/60 border border-hprh-sage/30 rounded-lg p-5 space-y-4 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[9px] font-mono text-hprh-pine/40 uppercase block">Foster Home Origin</span>
                    <strong className="text-hprh-pine">{pet?.current_location}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-hprh-pine/40 uppercase block">Resolved Delivery Address</span>
                    <strong className="text-hprh-sage">{geocodeState.formatted}</strong>
                  </div>
                </div>

                <div className="border-t border-dashed border-hprh-pine/10 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-mono text-hprh-pine/40 uppercase block">Calculated Distance</span>
                    <span className="text-sm font-mono font-bold text-hprh-pine">~{distance.toFixed(1)} miles</span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[9px] font-mono text-hprh-pine/40 uppercase block">Transport Fee Quote</span>
                    <span className="text-xl font-mono font-bold text-hprh-clay">
                      {calculatedQuote.fee.toLocaleString('en-US', { style: 'currency', currency: calculatedQuote.currency })}
                    </span>
                  </div>

                  <button
                    onClick={handleConfirmQuote}
                    disabled={submitting}
                    className="bg-hprh-sage text-hprh-paper hover:bg-hprh-sage/95 text-xs font-mono font-bold uppercase tracking-wider py-3 px-6 rounded transition-colors disabled:opacity-50 self-start sm:self-center"
                  >
                    Proceed to Payment
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: QUOTE_GENERATED / TRANSPORT_FEE_PENDING */}
        {(status === 'QUOTE_GENERATED' || status === 'TRANSPORT_FEE_PENDING') && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Left Col: Details */}
            <div className="md:col-span-7 space-y-6">
              
              {/* Distance Summary Card */}
              <div className="bg-hprh-paper-dark border border-hprh-pine/15 rounded-lg p-5 space-y-3 shadow-sm">
                <h4 className="font-mono text-[10px] uppercase tracking-widest font-extrabold text-hprh-pine/70 border-b border-hprh-pine/10 pb-2">
                  Delivery Details
                </h4>
                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                  <div>
                    <span className="text-[8px] text-hprh-pine/40 block">Origin Coordinates</span>
                    <span className="font-bold">{pet?.current_location}</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-hprh-pine/40 block">Delivery Coordinates</span>
                    <span className="font-bold">{transportRequest?.destination_address}</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-hprh-pine/40 block">Total Route</span>
                    <span className="font-bold text-hprh-sage">~{parseFloat(transportRequest?.distance_miles as any || 0).toFixed(1)} miles</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-hprh-pine/40 block">Transport Quote Amount</span>
                    <span className="font-bold text-hprh-clay">
                      {parseFloat(transportRequest?.transport_fee_amount as any || 0).toLocaleString('en-US', { style: 'currency', currency: transportRequest?.transport_fee_currency || 'USD' })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment details */}
              <div className="bg-hprh-paper-dark border border-hprh-pine/15 rounded-lg p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-hprh-pine/10 pb-3">
                  <h4 className="font-mono text-[10px] uppercase tracking-widest font-extrabold text-hprh-pine/70">
                    Step 1: Send Transport Payment
                  </h4>
                  <ShieldCheck className="w-4.5 h-4.5 text-hprh-sage" />
                </div>

                <p className="text-xs text-hprh-pine/60 leading-relaxed">
                  Please wire the transport fee of <strong className="text-hprh-pine">{parseFloat(transportRequest?.transport_fee_amount as any || 0).toLocaleString('en-US', { style: 'currency', currency: transportRequest?.transport_fee_currency || 'USD' })}</strong> to our payment account below.
                </p>

                {paymentMethods.length === 0 ? (
                  <div className="text-center py-6 bg-hprh-paper border border-dashed border-hprh-pine/15 rounded text-xs text-hprh-pine/40">
                    No active payment methods configured. Please contact support.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {paymentMethods.length > 1 && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono uppercase tracking-wider font-bold text-hprh-pine/55">
                          Select Account
                        </label>
                        <select
                          value={selectedMethodId}
                          onChange={(e) => setSelectedMethodId(e.target.value)}
                          className="w-full bg-hprh-paper border border-hprh-pine/15 focus:border-hprh-sage focus:ring-1 focus:ring-hprh-sage rounded px-3 py-2 text-xs text-hprh-pine focus:outline-none"
                        >
                          {paymentMethods.map(m => (
                            <option key={m.id} value={m.id}>{m.display_label} ({m.bank_name})</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {selectedMethod && (
                      <div className="bg-white/60 border border-hprh-pine/10 rounded-md p-4 space-y-3 relative overflow-hidden text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-white border border-hprh-pine/10 rounded flex items-center justify-center p-1 overflow-hidden shadow-sm flex-shrink-0">
                            {selectedMethod.logo_url ? (
                              <img src={selectedMethod.logo_url || undefined} alt={selectedMethod.display_label || selectedMethod.bank_name} className="w-full h-full object-contain" />
                            ) : (
                              <Building2 className="w-4 h-4 text-hprh-pine/30" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-hprh-pine">{selectedMethod.display_label || selectedMethod.bank_name}</div>
                            <span className="font-mono text-[8px] uppercase px-1.5 py-0.5 bg-hprh-sage/10 text-hprh-sage rounded font-bold">
                              {selectedMethod.method_type}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1.5 font-sans pt-1">
                          <div className="flex items-center justify-between border-b border-hprh-pine/5 pb-1">
                            <span className="text-[9px] font-mono text-hprh-pine/40 uppercase">Account Holder</span>
                            <span className="font-semibold text-hprh-pine">{selectedMethod.account_name}</span>
                          </div>

                          {selectedMethod.method_type === 'bank_transfer' ? (
                            <>
                              <div className="flex items-center justify-between border-b border-hprh-pine/5 pb-1">
                                <span className="text-[9px] font-mono text-hprh-pine/40 uppercase">Account Number</span>
                                <div className="flex items-center gap-1">
                                  <span className="font-mono font-bold">{selectedMethod.account_number}</span>
                                  <button type="button" onClick={() => handleCopyText(selectedMethod.account_number || '')} className="text-hprh-pine/40 hover:text-hprh-sage">
                                    <Copy className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center justify-between border-b border-hprh-pine/5 pb-1">
                                <span className="text-[9px] font-mono text-hprh-pine/40 uppercase">Routing Number</span>
                                <div className="flex items-center gap-1">
                                  <span className="font-mono font-bold">{selectedMethod.routing_number}</span>
                                  <button type="button" onClick={() => handleCopyText(selectedMethod.routing_number || '')} className="text-hprh-pine/40 hover:text-hprh-sage">
                                    <Copy className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center justify-between border-b border-hprh-pine/5 pb-1">
                              <span className="text-[9px] font-mono text-hprh-pine/40 uppercase">Identifier / Handle</span>
                              <div className="flex items-center gap-1">
                                <span className="font-mono font-bold text-hprh-clay">{selectedMethod.handle}</span>
                                <button type="button" onClick={() => handleCopyText(selectedMethod.handle || '')} className="text-hprh-pine/40 hover:text-hprh-sage">
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {selectedMethod.notes && (
                          <div className="bg-hprh-paper border border-hprh-pine/10 rounded p-2 text-[10px] text-hprh-pine/60 leading-relaxed italic">
                            <strong>Note:</strong> {selectedMethod.notes}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Col: Upload proof form */}
            <div className="md:col-span-5">
              {status === 'TRANSPORT_FEE_PENDING' ? (
                <div className="bg-hprh-paper-dark border border-hprh-pine/15 rounded-lg p-6 text-center space-y-5 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-hprh-gold"></div>
                  <Clock className="w-12 h-12 text-hprh-gold mx-auto animate-pulse" />
                  <div className="space-y-1">
                    <span className="font-mono text-[9px] uppercase tracking-widest text-hprh-gold font-bold">Verification Pending</span>
                    <h3 className="font-display text-lg font-bold">Proof Submitted</h3>
                  </div>
                  <p className="text-xs text-hprh-pine/60 leading-relaxed">
                    We are verifying your transport payment proof of <strong>{parseFloat(transportRequest?.transport_fee_amount as any || 0).toLocaleString('en-US', { style: 'currency', currency: transportRequest?.transport_fee_currency || 'USD' })}</strong>.
                  </p>
                  <div className="bg-white/40 border border-hprh-pine/10 rounded p-3 text-[10px] text-hprh-pine/50 leading-relaxed">
                    Audits usually take <strong>24-48 hours</strong>. You will receive an email once confirmed to request the security deposit step.
                  </div>
                </div>
              ) : (
                <form onSubmit={(e) => handlePaymentSubmit(e, 'TRANSPORT_FEE')} className="bg-hprh-paper-dark border border-hprh-pine/15 rounded-lg p-5 space-y-4 shadow-sm">
                  <div className="border-b border-hprh-pine/10 pb-2">
                    <h4 className="font-mono text-[10px] uppercase tracking-widest font-extrabold text-hprh-pine/70">
                      Step 2: Upload Proof
                    </h4>
                  </div>

                  <Input
                    label={`Amount Transferred (${transportRequest?.transport_fee_currency}) *`}
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amountClaimed}
                    onChange={(e) => setAmountClaimed(e.target.value)}
                    required
                    helperText={`Expected amount: ${parseFloat(transportRequest?.transport_fee_amount as any || 0)}`}
                  />

                  {/* Dropzone */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs uppercase tracking-wider text-hprh-pine/70 font-bold select-none">
                      Receipt Screenshot *
                    </label>
                    
                    <div className={`border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center transition-colors ${
                      selectedFile 
                        ? 'border-hprh-sage/50 bg-hprh-sage/5' 
                        : fileError 
                        ? 'border-hprh-clay/40 bg-hprh-clay/5'
                        : 'border-hprh-pine/15 hover:border-hprh-sage/30 bg-hprh-paper'
                    }`}>
                      {selectedFile ? (
                        <div className="text-center space-y-2">
                          {previewUrl ? (
                            <div className="w-16 h-16 bg-white border border-hprh-pine/10 rounded overflow-hidden mx-auto p-0.5 flex items-center justify-center">
                              <img src={previewUrl} alt="Receipt preview" className="w-full h-full object-cover rounded-sm" />
                            </div>
                          ) : (
                            <FileText className="w-7 h-7 text-hprh-sage mx-auto" />
                          )}
                          <span className="text-xs font-mono font-bold text-hprh-sage block truncate max-w-[150px] mx-auto">
                            {selectedFile.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                            className="text-[9px] uppercase font-mono tracking-widest font-bold text-hprh-clay hover:underline block mx-auto"
                          >
                            Clear Selection
                          </button>
                        </div>
                      ) : (
                        <div className="text-center space-y-2 cursor-pointer relative py-2">
                          <Upload className="w-7 h-7 text-hprh-pine/30 mx-auto" />
                          <span className="text-xs font-bold text-hprh-pine block">Choose receipt document</span>
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
                      <span className="text-[10px] text-hprh-clay uppercase tracking-wide font-semibold block">
                        {fileError}
                      </span>
                    )}
                  </div>

                  <Textarea
                    label="Transaction reference details"
                    placeholder="e.g. Zelle transaction code #88923..."
                    value={referenceNote}
                    onChange={(e) => setReferenceNote(e.target.value)}
                    rows={2}
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full font-bold py-3 mt-4"
                    disabled={submitting || !selectedMethodId}
                  >
                    {submitting ? 'Submitting receipt...' : 'Submit Payment Proof'}
                  </Button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: DEPOSIT_PENDING / DEPOSIT_PROOF_SUBMITTED */}
        {(status === 'DEPOSIT_PENDING' || status === 'DEPOSIT_PROOF_SUBMITTED') && securityDeposit && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Left Col: Details */}
            <div className="md:col-span-7 space-y-6">
              
              {/* Deposit Info Card */}
              <div className="bg-hprh-paper-dark border border-hprh-pine/15 rounded-lg p-5 space-y-3 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-hprh-clay"></div>
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-hprh-clay" />
                  <h4 className="font-display font-bold text-base text-hprh-pine">
                    Refundable Security Deposit Required
                  </h4>
                </div>
                <p className="text-xs text-hprh-pine/60 leading-relaxed">
                  Per policy, a flat security deposit of <strong className="text-hprh-pine">${parseFloat(securityDeposit.amount as any || 0).toFixed(2)}</strong> is required to secure transport booking. This deposit is <strong>100% refundable</strong> upon safe delivery of <strong>{pet?.name}</strong>.
                </p>
                <div className="font-mono text-xs pt-1">
                  <span className="text-[9px] text-hprh-pine/40 block">Deposit Amount</span>
                  <span className="text-lg font-bold text-hprh-clay">${parseFloat(securityDeposit.amount as any || 0).toFixed(2)} {securityDeposit.currency}</span>
                </div>
              </div>

              {/* Payment Account */}
              <div className="bg-hprh-paper-dark border border-hprh-pine/15 rounded-lg p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-hprh-pine/10 pb-3">
                  <h4 className="font-mono text-[10px] uppercase tracking-widest font-extrabold text-hprh-pine/70">
                    Step 1: Wire Deposit Funds
                  </h4>
                  <ShieldCheck className="w-4.5 h-4.5 text-hprh-sage" />
                </div>

                {paymentMethods.length === 0 ? (
                  <div className="text-center py-6 bg-hprh-paper border border-dashed border-hprh-pine/15 rounded text-xs text-hprh-pine/40">
                    No active accounts configured.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {paymentMethods.length > 1 && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono uppercase tracking-wider font-bold text-hprh-pine/55">
                          Select Account
                        </label>
                        <select
                          value={selectedMethodId}
                          onChange={(e) => setSelectedMethodId(e.target.value)}
                          className="w-full bg-hprh-paper border border-hprh-pine/15 focus:border-hprh-sage focus:ring-1 focus:ring-hprh-sage rounded px-3 py-2 text-xs text-hprh-pine focus:outline-none"
                        >
                          {paymentMethods.map(m => (
                            <option key={m.id} value={m.id}>{m.display_label} ({m.bank_name})</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {selectedMethod && (
                      <div className="bg-white/60 border border-hprh-pine/10 rounded-md p-4 space-y-3 relative overflow-hidden text-xs animate-in fade-in duration-200">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-white border border-hprh-pine/10 rounded flex items-center justify-center p-1 overflow-hidden shadow-sm flex-shrink-0">
                            {selectedMethod.logo_url ? (
                              <img src={selectedMethod.logo_url || undefined} alt={selectedMethod.display_label || selectedMethod.bank_name} className="w-full h-full object-contain" />
                            ) : (
                              <Building2 className="w-4 h-4 text-hprh-pine/30" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-hprh-pine">{selectedMethod.display_label || selectedMethod.bank_name}</div>
                            <span className="font-mono text-[8px] uppercase px-1.5 py-0.5 bg-hprh-sage/10 text-hprh-sage rounded font-bold">
                              {selectedMethod.method_type}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1.5 font-sans pt-1">
                          <div className="flex items-center justify-between border-b border-hprh-pine/5 pb-1">
                            <span className="text-[9px] font-mono text-hprh-pine/40 uppercase">Account Holder</span>
                            <span className="font-semibold text-hprh-pine">{selectedMethod.account_name}</span>
                          </div>

                          {selectedMethod.method_type === 'bank_transfer' ? (
                            <>
                              <div className="flex items-center justify-between border-b border-hprh-pine/5 pb-1">
                                <span className="text-[9px] font-mono text-hprh-pine/40 uppercase">Account Number</span>
                                <div className="flex items-center gap-1">
                                  <span className="font-mono font-bold">{selectedMethod.account_number}</span>
                                  <button type="button" onClick={() => handleCopyText(selectedMethod.account_number || '')} className="text-hprh-pine/40 hover:text-hprh-sage">
                                    <Copy className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center justify-between border-b border-hprh-pine/5 pb-1">
                                <span className="text-[9px] font-mono text-hprh-pine/40 uppercase">Routing Number</span>
                                <div className="flex items-center gap-1">
                                  <span className="font-mono font-bold">{selectedMethod.routing_number}</span>
                                  <button type="button" onClick={() => handleCopyText(selectedMethod.routing_number || '')} className="text-hprh-pine/40 hover:text-hprh-sage">
                                    <Copy className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center justify-between border-b border-hprh-pine/5 pb-1">
                              <span className="text-[9px] font-mono text-hprh-pine/40 uppercase">Identifier / Handle</span>
                              <div className="flex items-center gap-1">
                                <span className="font-mono font-bold text-hprh-clay">{selectedMethod.handle}</span>
                                <button type="button" onClick={() => handleCopyText(selectedMethod.handle || '')} className="text-hprh-pine/40 hover:text-hprh-sage">
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {selectedMethod.notes && (
                          <div className="bg-hprh-paper border border-hprh-pine/10 rounded p-2 text-[10px] text-hprh-pine/60 leading-relaxed italic">
                            <strong>Note:</strong> {selectedMethod.notes}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Col: Upload proof form */}
            <div className="md:col-span-5">
              {status === 'DEPOSIT_PROOF_SUBMITTED' ? (
                <div className="bg-hprh-paper-dark border border-hprh-pine/15 rounded-lg p-6 text-center space-y-5 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-hprh-gold"></div>
                  <Clock className="w-12 h-12 text-hprh-gold mx-auto animate-pulse" />
                  <div className="space-y-1">
                    <span className="font-mono text-[9px] uppercase tracking-widest text-hprh-gold font-bold">Audit In Progress</span>
                    <h3 className="font-display text-lg font-bold">Deposit Receipt Filed</h3>
                  </div>
                  <p className="text-xs text-hprh-pine/60 leading-relaxed">
                    We are verifying your security deposit payment proof of <strong>${parseFloat(securityDeposit.amount as any || 0).toFixed(2)}</strong>.
                  </p>
                  <div className="bg-white/40 border border-hprh-pine/10 rounded p-3 text-[10px] text-hprh-pine/50 leading-relaxed">
                    Once staff audits the deposit wire and approves it, your dispatch tracking details will activate and reveal.
                  </div>
                </div>
              ) : (
                <form onSubmit={(e) => handlePaymentSubmit(e, 'SECURITY_DEPOSIT')} className="bg-hprh-paper-dark border border-hprh-pine/15 rounded-lg p-5 space-y-4 shadow-sm">
                  <div className="border-b border-hprh-pine/10 pb-2">
                    <h4 className="font-mono text-[10px] uppercase tracking-widest font-extrabold text-hprh-pine/70">
                      Step 2: Upload Deposit Proof
                    </h4>
                  </div>

                  <Input
                    label={`Deposit Amount (${securityDeposit.currency}) *`}
                    type="number"
                    step="0.01"
                    value={amountClaimed || securityDeposit.amount}
                    onChange={(e) => setAmountClaimed(e.target.value)}
                    required
                    helperText={`Required deposit: $${parseFloat(securityDeposit.amount as any || 0)}`}
                  />

                  {/* Dropzone */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs uppercase tracking-wider text-hprh-pine/70 font-bold select-none">
                      Receipt Screenshot *
                    </label>
                    
                    <div className={`border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center transition-colors ${
                      selectedFile 
                        ? 'border-hprh-sage/50 bg-hprh-sage/5' 
                        : fileError 
                        ? 'border-hprh-clay/40 bg-hprh-clay/5'
                        : 'border-hprh-pine/15 hover:border-hprh-sage/30 bg-hprh-paper'
                    }`}>
                      {selectedFile ? (
                        <div className="text-center space-y-2">
                          {previewUrl ? (
                            <div className="w-16 h-16 bg-white border border-hprh-pine/10 rounded overflow-hidden mx-auto p-0.5 flex items-center justify-center">
                              <img src={previewUrl} alt="Receipt preview" className="w-full h-full object-cover rounded-sm" />
                            </div>
                          ) : (
                            <FileText className="w-7 h-7 text-hprh-sage mx-auto" />
                          )}
                          <span className="text-xs font-mono font-bold text-hprh-sage block truncate max-w-[150px] mx-auto">
                            {selectedFile.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                            className="text-[9px] uppercase font-mono tracking-widest font-bold text-hprh-clay hover:underline block mx-auto"
                          >
                            Clear Selection
                          </button>
                        </div>
                      ) : (
                        <div className="text-center space-y-2 cursor-pointer relative py-2">
                          <Upload className="w-7 h-7 text-hprh-pine/30 mx-auto" />
                          <span className="text-xs font-bold text-hprh-pine block">Choose receipt document</span>
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
                      <span className="text-[10px] text-hprh-clay uppercase tracking-wide font-semibold block">
                        {fileError}
                      </span>
                    )}
                  </div>

                  <Textarea
                    label="Transaction reference details"
                    placeholder="e.g. Zelle confirmation note..."
                    value={referenceNote}
                    onChange={(e) => setReferenceNote(e.target.value)}
                    rows={2}
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full font-bold py-3 mt-4"
                    disabled={submitting || !selectedMethodId}
                  >
                    {submitting ? 'Submitting proof...' : 'Submit Deposit Proof'}
                  </Button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: TRACKING_ACTIVE / DELIVERED */}
        {(status === 'TRACKING_ACTIVE' || status === 'DELIVERED') && (
          <div className="max-w-xl mx-auto">
            <div className="bg-hprh-paper-dark border-2 border-hprh-sage/30 rounded-lg p-8 text-center space-y-6 shadow-md relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-hprh-sage"></div>
              
              <CheckCircle2 className="w-12 h-12 text-hprh-sage mx-auto" />
              
              <div className="space-y-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-hprh-sage font-extrabold block">
                  Transport Dispatched
                </span>
                <h2 className="font-display text-3xl font-extrabold text-hprh-pine">
                  Tracking Active!
                </h2>
              </div>

              <p className="text-sm text-hprh-pine/70 leading-relaxed max-w-sm mx-auto">
                Thank you! Your security deposit and transport fees have been verified. <strong>{pet?.name}</strong>'s route details are active.
              </p>

              {/* Tracking ID details (secured gate check) */}
              {transportRequest?.tracking_id && (
                <div className="border border-hprh-pine/15 bg-white/50 rounded p-5 space-y-2 text-left max-w-sm mx-auto">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-hprh-pine/40 font-bold block">
                    Transport Dispatch Reference
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sm text-hprh-clay">{transportRequest.tracking_id}</span>
                    <button 
                      onClick={() => handleCopyText(transportRequest.tracking_id || '')}
                      className="p-1 text-hprh-pine/50 hover:text-hprh-sage transition-colors"
                      title="Copy Tracking ID"
                    >
                      {copied ? (
                        <Check className="w-3.5 h-3.5 text-hprh-sage" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <p className="text-[10px] text-hprh-pine/50 leading-relaxed">
                    Use this ID to follow your pet's dispatch progress. Standard transport details will be dispatched to your email address: <strong>{adopter?.email}</strong>.
                  </p>
                </div>
              )}

              <div className="pt-4">
                <Link 
                  to="/" 
                  className="bg-hprh-sage text-hprh-paper hover:bg-hprh-sage/95 text-[10px] font-mono font-bold uppercase tracking-wider py-3 px-6 rounded transition-colors inline-block"
                >
                  Return to Homepage
                </Link>
              </div>
            </div>
          </div>
        )}

      </Container>
    </div>
  );
};

export default TransportRequestPage;
