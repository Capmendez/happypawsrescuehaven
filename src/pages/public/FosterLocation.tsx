import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import supabase from '../../lib/supabase';
import Container from '../../components/ui/Container';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { 
  FileText, 
  Check, 
  Copy, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Upload,
  User,
  Truck,
  Heart,
  FileSignature
} from 'lucide-react';
import type { TransportRequest, BankAccount } from '../../lib/types';

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

export const FosterLocation: React.FC = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Core Data
  const [assignment, setAssignment] = useState<any>(null);
  const [pet, setPet] = useState<any>(null);
  const [transportRequest, setTransportRequest] = useState<TransportRequest | null>(null);
  // paymentProofs state removed as unused
  const [paymentMethods, setPaymentMethods] = useState<BankAccount[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string>('');

  // Step 1: Address Input
  const [addressInput, setAddressInput] = useState('');
  const [distance, setDistance] = useState<number | null>(null);
  const [calculatedQuote, setCalculatedQuote] = useState<{ fee: number; tierId: string; currency: string; depositRequired: boolean } | null>(null);
  const [geocodeState, setGeocodeState] = useState<{ lat: number; lng: number; formatted: string; state: string | null } | null>(null);

  // Step 2 & 4: Payment Upload
  const [amountClaimed, setAmountClaimed] = useState('');
  const [referenceNote, setReferenceNote] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Terms & Conditions Checkbox
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [submittingTerms, setSubmittingTerms] = useState(false);

  // Copy Feedback
  const [copied, setCopied] = useState(false);

  // Timeline updates
  const [trackingUpdates, setTrackingUpdates] = useState<any[]>([]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const loadData = async () => {
    if (!assignmentId) {
      setError('Missing foster assignment identifier.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. Fetch details via secure RPC
      const { data: detailsData, error: detailsErr } = await supabase.rpc('get_foster_coordination_details', {
        assignment_id: assignmentId
      });

      if (detailsErr) throw detailsErr;
      if (!detailsData || !detailsData.assignment) {
        setError('Foster coordination record not found or not in active setup phase.');
        setLoading(false);
        return;
      }

      setAssignment(detailsData.assignment);
      setPet(detailsData.pet);
      setTransportRequest(detailsData.transport_request);
      // paymentProofs not used on public foster location page

      if (detailsData.assignment.foster_address) {
        setAddressInput(detailsData.assignment.foster_address);
      }

      // If transport request exists and has status TRACKING_ACTIVE / DELIVERED, fetch timeline
      if (detailsData.transport_request) {
        const { data: updatesData, error: updatesErr } = await supabase
          .from('shipment_status_updates')
          .select('*')
          .eq('transport_request_id', detailsData.transport_request.id)
          .order('created_at', { ascending: false });

        if (!updatesErr) {
          setTrackingUpdates(updatesData || []);
        }
      }

      // 2. Fetch active payment methods
      const { data: methodsData, error: methodsErr } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('is_active', true);

      if (methodsErr) throw methodsErr;
      setPaymentMethods(methodsData || []);
      if (methodsData && methodsData.length > 0) {
        setSelectedMethodId(methodsData[0].id);
      }

    } catch (err: any) {
      console.error('Error synchronizing foster data:', err);
      setError(err.message || 'Unable to retrieve coordination details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [assignmentId]);

  // Step 1: Calculate quote
  const handleCalculateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressInput.trim() || !pet) return;

    if (pet.origin_latitude === null || pet.origin_longitude === null) {
      setError('The transport origin coordinates for this pet are not configured. Please contact administration.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // 1. Geocode address
      const { data: geocodeData, error: geocodeErr } = await supabase.functions.invoke('geocode-address', {
        body: { address: addressInput }
      });

      if (geocodeErr) throw geocodeErr;
      if (geocodeData.error) throw new Error(geocodeData.error);

      const fosterLat = parseFloat(geocodeData.latitude);
      const fosterLng = parseFloat(geocodeData.longitude);
      const formattedAddress = geocodeData.formattedAddress;
      const stateCode = geocodeData.state; // 2-letter state code

      setGeocodeState({ lat: fosterLat, lng: fosterLng, formatted: formattedAddress, state: stateCode });

      // 2. Calculate Haversine Distance
      const dist = haversineDistance(
        parseFloat(pet.origin_latitude as any),
        parseFloat(pet.origin_longitude as any),
        fosterLat,
        fosterLng
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

      // Check if state is Michigan ('MI')
      const isMichigan = stateCode?.toUpperCase() === 'MI';
      const depositRequired = !isMichigan; // Waived for MI!

      setCalculatedQuote({
        fee: matchingTier.fee_amount,
        tierId: matchingTier.id,
        currency: matchingTier.currency || 'USD',
        depositRequired
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
    if (!assignment || !pet) return;

    try {
      setSubmitting(true);
      setError(null);

      if (method === 'self_pickup') {
        const { error: rpcErr } = await supabase.rpc('submit_foster_pickup_choice', {
          assignment_id: assignmentId
        });
        if (rpcErr) throw rpcErr;
      } else {
        // Just trigger AWAITING_LOCATION status
        const { error: updateErr } = await supabase
          .from('foster_assignments')
          .update({ status: 'TRANSPORT_NEEDED' })
          .eq('id', assignmentId);
        if (updateErr) throw updateErr;
      }

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
    if (!calculatedQuote || !geocodeState || !distance || !assignment || !pet) return;

    try {
      setSubmitting(true);
      setError(null);

      const { error: rpcErr } = await supabase.rpc('submit_foster_coordination', {
        assignment_id: assignmentId,
        foster_address: geocodeState.formatted,
        foster_state: geocodeState.state || 'MI',
        lat: geocodeState.lat,
        lng: geocodeState.lng,
        distance,
        fee_amount: calculatedQuote.fee,
        fee_tier_id: calculatedQuote.tierId,
        deposit_required: calculatedQuote.depositRequired
      });

      if (rpcErr) throw rpcErr;
      
      loadData();
    } catch (err: any) {
      console.error('Error confirming quote:', err);
      setError(err.message || 'Failed to submit coordination coordinates.');
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

  // Payment Submission
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

      // 2. Insert payment proof & update parent statuses via secure RPC
      const claimVal = parseFloat(amountClaimed) || 0;
      const { error: rpcErr } = await supabase.rpc('submit_foster_payment_proof', {
        assignment_id: assignmentId,
        bank_account_id: selectedMethodId,
        proof_image_url: storagePath,
        amount_claimed: claimVal,
        reference_note: referenceNote || null,
        purpose
      });

      if (rpcErr) throw rpcErr;

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

  // Terms and Conditions Agreement
  const handleAgreeTerms = async () => {
    try {
      setSubmittingTerms(true);
      setError(null);

      const { error: rpcErr } = await supabase.rpc('submit_foster_terms_agreement', {
        assignment_id: assignmentId
      });

      if (rpcErr) throw rpcErr;

      loadData();
    } catch (err: any) {
      console.error('Error signing terms:', err);
      setError(err.message || 'Failed to record terms agreement.');
    } finally {
      setSubmittingTerms(false);
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
          <p className="font-mono text-xs uppercase tracking-widest text-hprh-pine/50">Securing coordination channel...</p>
        </div>
      </div>
    );
  }

  if (error && !assignment) {
    return (
      <div className="py-20 bg-hprh-paper min-h-screen flex items-center">
        <Container className="max-w-md text-center space-y-6">
          <AlertCircle className="w-12 h-12 text-hprh-clay mx-auto" />
          <h1 className="text-3xl font-display font-extrabold text-hprh-pine">Gateway Locked</h1>
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

  // Determine current active step
  let activeStep = 1;
  if (assignment.status === 'SELF_PICKUP') {
    activeStep = 0;
  } else if (status === 'AWAITING_LOCATION' || status === 'AWAITING_CHOICE') {
    activeStep = 1;
  } else if (status === 'DEPOSIT_PENDING') {
    if (assignment.deposit_terms_agreed === false) {
      activeStep = 2;
    } else {
      activeStep = 3;
    }
  } else if (status === 'DEPOSIT_PROOF_SUBMITTED') {
    activeStep = 3;
  } else if (status === 'DEPOSIT_PAID' || status === 'TRACKING_ACTIVE' || status === 'DELIVERED' || status === 'CANCELLED') {
    activeStep = 4;
  }

  return (
    <div className="py-12 md:py-20 bg-hprh-paper min-h-screen text-hprh-pine font-sans flex flex-col justify-start">
      <Container className="max-w-3xl space-y-8">
        
        {/* Header Block */}
        <div className="text-center space-y-3">
          <span className="font-mono text-xs uppercase tracking-widest text-hprh-sage font-bold bg-hprh-sage/5 border border-hprh-sage/20 px-3 py-1 rounded inline-block rotate-[1deg]">
            Foster Logistics Gateway
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold font-display text-hprh-pine mt-2">
            Coordinate Foster Handoff
          </h1>
          <p className="text-xs sm:text-sm text-hprh-pine/60 max-w-md mx-auto leading-relaxed">
            Verify coordination coordinates, organize distance rates, sign security policies, and confirm pickup or tracking.
          </p>
        </div>

        {/* Info Banner: Pet & Foster details */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-hprh-sage/20 p-5 shadow-md flex flex-col sm:flex-row items-center gap-4">
          <div className="w-16 h-16 bg-hprh-paper border border-hprh-sage/10 rounded-full flex-shrink-0 flex items-center justify-center text-hprh-sage">
            <Heart className="w-8 h-8" />
          </div>
          <div className="space-y-1 text-center sm:text-left">
            <span className="font-mono text-[9px] uppercase tracking-widest text-hprh-clay font-bold block">Foster Passenger</span>
            <h3 className="font-display text-xl font-bold text-hprh-pine">{pet?.name}</h3>
            <p className="text-xs text-hprh-clay">
              Fostered by: <span className="font-semibold text-hprh-pine">{assignment?.full_name}</span> • Origin: {pet?.current_location || 'HPRH Rescue Hub'}
            </p>
          </div>
        </div>

        {/* Stepper Indicator */}
        {assignment.status !== 'SELF_PICKUP' && assignment.deposit_required !== false && (
          <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-mono font-bold uppercase tracking-wider text-hprh-clay select-none">
            <div className={`pb-2 border-b-2 transition-colors ${activeStep >= 1 ? 'border-hprh-sage text-hprh-pine' : 'border-hprh-sage/10'}`}>
              1. Location
            </div>
            <div className={`pb-2 border-b-2 transition-colors ${activeStep >= 2 ? 'border-hprh-sage text-hprh-pine' : 'border-hprh-sage/10'}`}>
              2. Terms Gate
            </div>
            <div className={`pb-2 border-b-2 transition-colors ${activeStep >= 3 ? 'border-hprh-sage text-hprh-pine' : 'border-hprh-sage/10'}`}>
              3. Deposit
            </div>
            <div className={`pb-2 border-b-2 transition-colors ${activeStep >= 4 ? 'border-hprh-sage text-hprh-pine' : 'border-hprh-sage/10'}`}>
              4. Tracking
            </div>
          </div>
        )}

        {/* Main Work Area Card */}
        <div className="bg-white rounded-2xl border border-hprh-sage/20 shadow-xl overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-hprh-sage"></div>
          
          <div className="p-6 sm:p-10 space-y-6 text-left">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>{error}</div>
              </div>
            )}

            {/* STEP 0: Select Pickup Method */}
            {activeStep === 0 && assignment.status === 'ASSIGNED' && (
              <div className="space-y-6 text-center">
                <h3 className="text-xl font-bold font-display text-hprh-pine">How would you like to receive {pet?.name}?</h3>
                <p className="text-sm text-hprh-clay max-w-md mx-auto">
                  You can choose to pick up {pet?.name} yourself directly from our Michigan hub, or coordinate distances and have our logistics team deliver them to your address.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                  <div 
                    onClick={() => handleSelectPickupMethod('self_pickup')}
                    className="border-2 border-hprh-sage/20 hover:border-hprh-sage hover:bg-hprh-sage/5 transition-all p-6 rounded-2xl cursor-pointer text-center space-y-3 shadow-sm hover:shadow-md"
                  >
                    <User className="w-8 h-8 text-hprh-sage mx-auto" />
                    <h4 className="font-bold text-hprh-pine">Self Pickup</h4>
                    <p className="text-xs text-hprh-clay">
                      Coordinate a direct pickup at our rescue hub. No fees or deposits required.
                    </p>
                  </div>

                  <div 
                    onClick={() => handleSelectPickupMethod('transport')}
                    className="border-2 border-hprh-sage/20 hover:border-hprh-sage hover:bg-hprh-sage/5 transition-all p-6 rounded-2xl cursor-pointer text-center space-y-3 shadow-sm hover:shadow-md"
                  >
                    <Truck className="w-8 h-8 text-hprh-sage mx-auto" />
                    <h4 className="font-bold text-hprh-pine">Arrange Transport</h4>
                    <p className="text-xs text-hprh-clay">
                      Have our certified volunteer team transport {pet?.name} safely to your home address.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 0 SUCCESS: Self Pickup Confirmed */}
            {assignment.status === 'SELF_PICKUP' && (
              <div className="space-y-6 text-center py-6">
                <div className="mx-auto w-16 h-16 bg-hprh-sage/10 text-hprh-sage flex items-center justify-center rounded-full">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold font-display text-hprh-pine">Self Pickup Registered</h3>
                <p className="text-sm text-hprh-clay max-w-md mx-auto">
                  You have elected to pick up <strong>{pet?.name}</strong> directly from our rescue hub.
                </p>
                <div className="bg-hprh-paper/50 border border-hprh-sage/20 rounded-xl p-4 text-left space-y-2 max-w-md mx-auto text-xs">
                  <span className="font-bold block text-hprh-pine">Next Steps:</span>
                  <p className="text-hprh-pine/70 leading-relaxed">
                    Our hub coordinators will contact you directly at <strong>{assignment.phone || assignment.email}</strong> to schedule a date and time for pickup. No security deposit or distance fee is required.
                  </p>
                </div>
              </div>
            )}

            {/* STEP 1: Address Input / Quote Resolution */}
            {activeStep === 1 && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-hprh-pine">Coordinate Location Details</h3>
                  <p className="text-xs text-hprh-clay">
                    Please provide your delivery home address. We will verify coordinates, compute transit distance, and calculate the transportation fee.
                  </p>
                </div>

                <form onSubmit={handleCalculateQuote} className="space-y-4">
                  <Input
                    label="Delivery Street Address"
                    id="addressInput"
                    placeholder="e.g. 123 Main St, Detroit, MI 48201"
                    value={addressInput}
                    onChange={(e) => setAddressInput(e.target.value)}
                    required
                    disabled={submitting}
                  />
                  <div className="flex justify-end">
                    <Button type="submit" disabled={submitting} variant="primary">
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Geocoding & Calculating...
                        </>
                      ) : (
                        'Calculate Distance & Quote'
                      )}
                    </Button>
                  </div>
                </form>

                {/* Display Route Details */}
                {distance !== null && calculatedQuote && geocodeState && (
                  <div className="bg-hprh-paper/50 border border-hprh-sage/20 rounded-xl p-5 space-y-4 animate-fade-in">
                    <h4 className="font-mono text-xs uppercase tracking-widest text-hprh-sage font-bold">Transit Route Details</h4>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-mono">
                      <div>
                        <span className="text-hprh-clay block uppercase">Parsed Address</span>
                        <span className="text-hprh-pine font-sans font-bold">{geocodeState.formatted}</span>
                      </div>
                      <div>
                        <span className="text-hprh-clay block uppercase">Transit Distance</span>
                        <span className="text-hprh-pine font-bold">{distance.toFixed(1)} miles</span>
                      </div>
                      <div>
                        <span className="text-hprh-clay block uppercase">Security Deposit</span>
                        <span className={`font-bold uppercase ${!calculatedQuote.depositRequired ? 'text-green-600' : 'text-amber-600'}`}>
                          {!calculatedQuote.depositRequired ? 'Waived (MI Resident)' : '$100.00 Refundable'}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-hprh-sage/10 pt-4 flex justify-end">
                      <Button onClick={handleConfirmQuote} variant="primary" disabled={submitting} className="w-full sm:w-auto">
                        Confirm Route & Save
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: Terms & Conditions Gate */}
            {activeStep === 2 && assignment.deposit_terms_agreed === false && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-hprh-pine">Refundable Security Deposit Agreement</h3>
                  <p className="text-xs text-hprh-clay">
                    Before uploading your security deposit, please review and agree to our rescue deposit policy terms and conditions.
                  </p>
                </div>

                <div className="bg-hprh-paper/50 border border-hprh-sage/20 rounded-xl p-6 space-y-4 max-h-60 overflow-y-auto text-xs text-hprh-pine/80 leading-relaxed font-mono">
                  <h5 className="font-bold text-hprh-pine uppercase">Section 1: General Deposit Policies</h5>
                  <p>
                    Out-of-state fosters must submit a security deposit of $100.00 USD. Fosters inside the state of Michigan (MI) are eligible for a complete waiver of this security deposit.
                  </p>
                  <h5 className="font-bold text-hprh-pine uppercase">Section 2: Terms of Return & Refundability</h5>
                  <p>
                    This deposit is fully refundable. The refund will be processed back to your registered financial portal within 7 business days following either: (a) the safe return of the fostered animal to our central hub or an approved coordinator, or (b) the official conversion of the foster assignment into a finalized adoption with payment of the adoption fee.
                  </p>
                  <h5 className="font-bold text-hprh-pine uppercase">Section 3: Forfeiture Conditions</h5>
                  <p>
                    Deposits may be forfeited if: (a) the foster fails to return the animal after formal request by rescue administration, or (b) the foster leaves the designated geographic layout without written authorization.
                  </p>
                </div>

                <div className="flex items-start gap-3 bg-hprh-paper/50 p-4 rounded-xl border border-hprh-sage/10">
                  <input
                    type="checkbox"
                    id="termsAgreed"
                    className="w-4.5 h-4.5 rounded border-hprh-sage/30 text-hprh-sage focus:ring-hprh-sage mt-0.5"
                    checked={termsAgreed}
                    onChange={(e) => setTermsAgreed(e.target.checked)}
                  />
                  <label htmlFor="termsAgreed" className="text-xs text-hprh-pine cursor-pointer select-none leading-relaxed">
                    <span className="font-semibold block text-sm text-hprh-pine mb-0.5">Accept Terms & Conditions</span>
                    I have read, understood, and agree to the Security Deposit Terms & Conditions detailed above.
                  </label>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button 
                    onClick={handleAgreeTerms} 
                    disabled={submittingTerms || !termsAgreed} 
                    variant="primary"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2"
                  >
                    {submittingTerms ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Signing Terms...
                      </>
                    ) : (
                      <>
                        <FileSignature className="w-4 h-4" />
                        I Agree & Unlock Deposit Payment
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: Security Deposit Payment Proof Upload */}
            {activeStep === 3 && (
              <div className="space-y-6 animate-fade-in">
                {status === 'DEPOSIT_PROOF_SUBMITTED' ? (
                  <div className="text-center py-8 space-y-4">
                    <Clock className="w-12 h-12 text-hprh-sage mx-auto animate-pulse" />
                    <h3 className="text-xl font-bold text-hprh-pine">Deposit Proof Under Review</h3>
                    <p className="text-sm text-hprh-clay max-w-sm mx-auto">
                      Your refundable security deposit proof has been submitted. Our team is verifying the receipt. Transit tracking will activate immediately upon verification.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold text-hprh-pine">Submit Security Deposit Receipt</h3>
                      <p className="text-xs text-hprh-clay">
                        Your deposit terms have been signed. Please submit your <strong>$100.00 USD</strong> refundable security deposit using one of the portals below and upload the receipt.
                      </p>
                    </div>

                    {/* Payment methods list */}
                    <div className="space-y-4">
                      <label className="block text-xs font-mono uppercase tracking-widest text-hprh-clay font-bold">Select Payment Portal</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {paymentMethods.map(method => (
                          <div 
                            key={method.id}
                            onClick={() => setSelectedMethodId(method.id)}
                            className={`border rounded-xl p-4 cursor-pointer transition-all ${
                              selectedMethodId === method.id 
                                ? 'border-hprh-sage bg-hprh-sage/5 shadow-sm font-semibold' 
                                : 'border-hprh-sage/10 hover:border-hprh-sage/30'
                            }`}
                          >
                            <span className="text-xs font-mono block uppercase text-hprh-clay">{method.method_type.replace(/_/g, ' ')}</span>
                            <span className="text-sm text-hprh-pine">{method.bank_name || method.display_label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Selected Method Details */}
                    {selectedMethod && (
                      <div className="bg-hprh-paper/50 border border-hprh-sage/20 rounded-xl p-4 space-y-3 text-xs font-mono">
                        <div className="flex justify-between items-center border-b border-hprh-sage/10 pb-2">
                          <span className="text-hprh-clay">PORTAL TYPE</span>
                          <span className="font-bold text-hprh-pine uppercase">{selectedMethod.method_type}</span>
                        </div>
                        {selectedMethod.account_name && (
                          <div className="flex justify-between items-center">
                            <span className="text-hprh-clay">ACCOUNT NAME</span>
                            <span className="font-bold text-hprh-pine">{selectedMethod.account_name}</span>
                          </div>
                        )}
                        {selectedMethod.account_number && (
                          <div className="flex justify-between items-center gap-4">
                            <span className="text-hprh-clay">ACCOUNT NUMBER / HANDLE</span>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-bold text-hprh-pine truncate">{selectedMethod.account_number}</span>
                              <button 
                                onClick={() => handleCopyText(selectedMethod.account_number!)}
                                className="text-hprh-sage hover:text-hprh-pine shrink-0"
                              >
                                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* File Upload & Submit */}
                    <form onSubmit={(e) => handlePaymentSubmit(e, 'SECURITY_DEPOSIT')} className="space-y-4">
                      <div className="space-y-2">
                        <label className="block text-xs font-mono uppercase tracking-widest text-hprh-clay font-bold">Upload Receipt / Proof screenshot</label>
                        {!selectedFile ? (
                          <div className="border-2 border-dashed border-hprh-sage/30 hover:border-hprh-sage/60 transition-colors rounded-xl p-6 text-center cursor-pointer relative bg-hprh-paper/20">
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/jpg,image/heic,application/pdf"
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              onChange={handleFileChange}
                              required
                            />
                            <div className="space-y-2">
                              <Upload className="w-8 h-8 text-hprh-clay mx-auto" />
                              <div className="text-xs font-semibold text-hprh-pine">Click to upload deposit screenshot</div>
                              <div className="text-[10px] text-hprh-clay">Allowed formats: JPG, PNG, HEIC, PDF. Max 5MB.</div>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-hprh-paper/50 border border-hprh-sage/20 rounded-xl p-4 flex items-center justify-between gap-4 text-xs font-mono">
                            <div className="flex items-center gap-3 min-w-0">
                              <FileText className="w-6 h-6 text-hprh-sage shrink-0" />
                              <div className="min-w-0">
                                <div className="font-semibold text-hprh-pine truncate">{selectedFile.name}</div>
                                <div className="text-[10px] text-hprh-clay">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</div>
                              </div>
                            </div>
                            <button 
                              type="button" 
                              onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                              className="text-red-500 hover:text-red-700"
                            >
                              Remove
                            </button>
                          </div>
                        )}

                        {fileError && <p className="text-xs text-red-600 font-semibold">{fileError}</p>}
                        {previewUrl && (
                          <div className="border border-hprh-sage/10 rounded-xl p-2 bg-white max-w-xs overflow-hidden">
                            <img src={previewUrl} alt="Receipt Preview" className="max-h-24 rounded mx-auto object-contain" />
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                          label="Amount Sent"
                          id="amountSent"
                          type="number"
                          value="100.00"
                          disabled
                        />
                        <Input
                          label="Reference / Transaction Notes"
                          id="referenceNote"
                          placeholder="e.g. Venmo deposit memo"
                          value={referenceNote}
                          onChange={(e) => setReferenceNote(e.target.value)}
                        />
                      </div>

                      <div className="pt-2 flex justify-end">
                        <Button type="submit" disabled={submitting || !selectedFile} variant="primary" className="w-full sm:w-auto">
                          {submitting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              Submitting Receipt...
                            </>
                          ) : (
                            'Submit Deposit Proof'
                          )}
                        </Button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* STEP 4: Live Coordination Timeline & Tracking / In-state Completion */}
            {activeStep === 4 && (
              <div className="space-y-8 animate-fade-in">
                {assignment.deposit_required === false && !transportRequest?.tracking_id ? (
                  <div className="space-y-6 text-center py-6">
                    <div className="mx-auto w-16 h-16 bg-hprh-sage/10 text-hprh-sage flex items-center justify-center rounded-full">
                      <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-bold font-display text-hprh-pine">Route Registered</h3>
                    <p className="text-sm text-hprh-clay max-w-md mx-auto">
                      Your coordination address has been saved and matched to Michigan's foster delivery network.
                    </p>
                    <div className="bg-hprh-paper/50 border border-hprh-sage/20 rounded-xl p-4 text-left space-y-2 max-w-md mx-auto text-xs">
                      <span className="font-bold block text-hprh-pine">Next Steps:</span>
                      <p className="text-hprh-pine/70 leading-relaxed">
                        Our logistics team will coordinate pickup and delivery details with you directly at <strong>{assignment.phone || assignment.email}</strong>. Fostering transport is free, and your security deposit is completely waived.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Status Card Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-dashed border-hprh-sage/20 pb-5 gap-4">
                      <div>
                        <span className="font-mono text-[9px] uppercase tracking-widest text-hprh-clay font-bold block mb-1">
                          Verified Route Registry
                        </span>
                        <h2 className="font-mono text-lg sm:text-xl font-bold text-hprh-pine uppercase tracking-wide">
                          {transportRequest?.tracking_id}
                        </h2>
                      </div>
                      <div>
                        {status === 'DELIVERED' ? (
                          <span className="bg-hprh-sage/10 border border-hprh-sage/30 text-hprh-sage text-[10px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded">
                            Delivered
                          </span>
                        ) : (
                          <span className="bg-hprh-sage/10 border border-hprh-sage/30 text-hprh-sage text-[10px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded animate-pulse">
                            Active Transit
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Stepper Timeline */}
                    <div className="space-y-6 pt-2">
                      <h3 className="font-mono text-xs uppercase tracking-widest font-bold text-hprh-sage border-b border-hprh-sage/20 pb-1">
                        Shipment Tracking Timeline
                      </h3>

                      {trackingUpdates.length === 0 ? (
                        <div className="bg-hprh-paper border border-hprh-sage/15 p-4 rounded-xl text-xs text-hprh-pine/70 italic">
                          Your foster transit route is being finalized. Tracking points will populate below as coordinators post updates.
                        </div>
                      ) : (
                        <div className="relative pl-6 space-y-6 border-l-2 border-dashed border-hprh-sage/20 py-1 ml-2">
                          {trackingUpdates.map((update: any) => {
                            const d = new Date(update.created_at);
                            const dateStr = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                            const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                            const warmDate = `${dateStr} at ${timeStr}`;

                            return (
                              <div key={update.id} className="relative">
                                {/* Bullet */}
                                <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 bg-hprh-sage border-hprh-sage text-white flex items-center justify-center">
                                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                </div>

                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 border border-hprh-sage/20 bg-hprh-sage/5 text-hprh-sage rounded">
                                      {update.status.replace(/_/g, ' ')}
                                    </span>
                                    <span className="text-[10px] text-hprh-clay font-mono">
                                      {warmDate}
                                    </span>
                                  </div>
                                  {update.location_description && (
                                    <div className="text-xs font-bold text-hprh-pine">
                                      Location: {update.location_description}
                                    </div>
                                  )}
                                  {update.note && (
                                    <p className="text-xs text-hprh-pine/75 leading-relaxed bg-hprh-paper/40 p-3 rounded-xl border border-hprh-sage/5">
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
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
};

export default FosterLocation;
