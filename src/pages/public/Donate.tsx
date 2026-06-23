import React, { useState, useEffect } from 'react';
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
  Heart,
  DollarSign,
  ArrowRight,
  ExternalLink
} from 'lucide-react';

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

export const Donate: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Bank accounts
  const [bankAccounts, setBankAccounts] = useState<ActiveBankAccount[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  
  // Form states
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [message, setMessage] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<number | 'custom'>(100);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [successAmount, setSuccessAmount] = useState(0);

  // Copy feedback states
  const [copiedField, setCopiedField] = useState<{ [key: string]: boolean }>({});

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(prev => ({ ...prev, [fieldId]: true }));
    setTimeout(() => {
      setCopiedField(prev => ({ ...prev, [fieldId]: false }));
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setLoading(true);
        setError(null);
        // Query active bank accounts (defaulting to USD for donations)
        const { data: bankData, error: bankError } = await supabase
          .from('bank_accounts')
          .select('*')
          .eq('is_active', true)
          .eq('currency', 'USD');

        if (bankError) throw bankError;

        const activeBanks = (bankData || []) as ActiveBankAccount[];
        setBankAccounts(activeBanks);
        
        if (activeBanks.length > 0) {
          setSelectedBankId(activeBanks[0].id);
        }
      } catch (err: any) {
        console.error('Error fetching bank accounts for donation:', err);
        setError('Failed to retrieve verified organization payment channels.');
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, []);

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

    if (!donorName.trim() || !donorEmail.trim()) {
      setError('Name and Email are required fields.');
      return;
    }

    // Determine final amount
    const amountVal = selectedPreset === 'custom' ? parseFloat(customAmount) : selectedPreset;
    if (!amountVal || isNaN(amountVal) || amountVal <= 0) {
      setError('Please select or specify a valid donation amount.');
      return;
    }

    if (!selectedFile) {
      setFileError('Proof of transfer receipt file is required.');
      return;
    }

    if (!selectedBankId) {
      setError('Please select a destination payment channel.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setFileError(null);

      // 1. Upload proof file to Supabase private storage bucket 'payment-proofs' under 'donations/' subfolder
      const fileExt = selectedFile.name.split('.').pop();
      const sanitizedName = selectedFile.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 15);
      const storagePath = `donations/${Date.now()}-${sanitizedName}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(storagePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: selectedFile.type
        });

      if (uploadError) throw uploadError;

      // 2. Insert record in donations - WITHOUT chaining .select() due to INSERT-only RLS policy
      const { error: dbError } = await supabase
        .from('donations')
        .insert([
          {
            donor_name: donorName.trim(),
            donor_email: donorEmail.trim(),
            amount: amountVal,
            currency: 'USD',
            message: message.trim() || null,
            bank_account_id: selectedBankId,
            proof_image_url: storagePath,
            status: 'PENDING_REVIEW'
          }
        ]);

      if (dbError) throw dbError;

      setSuccessAmount(amountVal);
      setSubmitSuccess(true);
      
      // Reset state
      setDonorName('');
      setDonorEmail('');
      setMessage('');
      setSelectedPreset(100);
      setCustomAmount('');
      setSelectedFile(null);
    } catch (err: any) {
      console.error('Error submitting donation proof:', err);
      setError(err.message || 'Failed to record donation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedBank = bankAccounts.find(b => b.id === selectedBankId);

  return (
    <div className="py-16 bg-hprh-paper text-hprh-pine font-sans min-h-screen">
      <Container className="max-w-5xl space-y-12">
        {/* Page Header */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-hprh-sage/10 text-hprh-sage mb-1 shadow-sm border border-hprh-sage/15">
            <Heart className="w-6 h-6 fill-current animate-pulse" />
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold font-display text-hprh-pine">
            Support Our Haven
          </h1>
          <p className="text-sm font-sans text-hprh-pine/70 leading-relaxed">
            Every donation goes directly to veterinary bills, pet food, clean shelter supplies, 
            and transport logistics to help rescue dogs and cats find their forever homes.
          </p>
        </div>

        {submitSuccess ? (
          <div className="max-w-2xl mx-auto bg-white border border-hprh-pine/15 rounded-lg p-8 text-center space-y-6 shadow-sm relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-hprh-sage"></div>
            
            <CheckCircle className="w-14 h-14 text-hprh-sage mx-auto" />
            
            <div className="space-y-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-hprh-sage font-extrabold">
                Transaction Logged
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-hprh-pine">
                Thank you for your generosity!
              </h2>
            </div>

            <p className="text-sm text-hprh-pine/70 leading-relaxed max-w-md mx-auto">
              Your donation of <strong className="font-mono text-base text-hprh-clay">${successAmount.toFixed(2)}</strong> has been recorded. 
              Our volunteers will reconcile the wire ledger soon, and a confirmation receipt will be emailed once verified.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row justify-center gap-3">
              <Button 
                onClick={() => setSubmitSuccess(false)}
                className="font-mono text-xs"
              >
                Make Another Donation
              </Button>
              <Button 
                onClick={() => window.location.href = '/'}
                variant="ghost"
                className="font-mono text-xs border-hprh-pine/10 hover:border-hprh-pine/35"
              >
                Go to Homepage
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Input Form & Fallbacks */}
            <div className="lg:col-span-7 space-y-8">
              
              {/* Fallback Cards Section */}
              <div className="bg-hprh-paper-dark border border-hprh-pine/15 rounded-lg p-5 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 bg-hprh-gold h-full"></div>
                <div className="space-y-1 text-center sm:text-left">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-hprh-gold font-bold block">
                    Third-Party Portals
                  </span>
                  <h4 className="font-display font-bold text-sm text-hprh-pine">
                    Prefer giving via GoFundMe Campaign?
                  </h4>
                  <p className="text-[11px] text-hprh-pine/60 leading-normal max-w-sm">
                    You can contribute to our active public fundraiser directly.
                  </p>
                </div>
                
                {/* 
                  TODO: Replace with real client GoFundMe campaign URL when provided.
                  Currently set to "#" as a placeholder link per requirements.
                */}
                <a 
                  href="#" 
                  className="bg-hprh-gold text-hprh-pine hover:bg-hprh-gold/95 font-mono text-[10px] uppercase font-bold tracking-wider py-2.5 px-5 rounded transition-all inline-flex items-center gap-1.5 flex-shrink-0 shadow"
                >
                  <span>Donate on GoFundMe</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Main Form */}
              <form onSubmit={handleFormSubmit} className="bg-white border border-hprh-pine/15 rounded-lg p-6 sm:p-8 space-y-6 shadow-sm">
                <h3 className="font-display text-xl font-bold text-hprh-pine border-b border-hprh-pine/10 pb-3">
                  Direct Donation Details
                </h3>

                {error && (
                  <div className="bg-hprh-clay/10 border border-hprh-clay/20 text-hprh-pine p-4 rounded text-xs flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-hprh-clay flex-shrink-0" />
                    <div className="space-y-1">
                      <span className="font-mono uppercase font-bold text-hprh-clay block">Submission Error</span>
                      <p className="leading-relaxed">{error}</p>
                    </div>
                  </div>
                )}

                {/* Amount Select Grid */}
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-hprh-pine/70 font-bold select-none">
                    Select Donation Amount (USD) *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    {([25, 50, 100, 250] as const).map((amount) => {
                      const isSelected = selectedPreset === amount;
                      return (
                        <button
                          key={amount}
                          type="button"
                          onClick={() => {
                            setSelectedPreset(amount);
                            setCustomAmount('');
                          }}
                          className={`py-3.5 px-2 border rounded font-mono text-sm font-extrabold transition-all ${
                            isSelected 
                              ? 'bg-hprh-sage/10 border-hprh-sage text-hprh-sage font-black scale-105 shadow-sm'
                              : 'border-hprh-pine/15 text-hprh-pine hover:border-hprh-pine/30 bg-hprh-paper-dark/30'
                          }`}
                        >
                          ${amount}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setSelectedPreset('custom')}
                      className={`py-3.5 px-2 border rounded font-mono text-xs uppercase tracking-wider font-extrabold transition-all col-span-2 sm:col-span-1 ${
                        selectedPreset === 'custom'
                          ? 'bg-hprh-sage/10 border-hprh-sage text-hprh-sage font-black scale-105 shadow-sm'
                          : 'border-hprh-pine/15 text-hprh-pine hover:border-hprh-pine/30 bg-hprh-paper-dark/30'
                      }`}
                    >
                      Custom
                    </button>
                  </div>
                </div>

                {/* Custom Amount Field */}
                {selectedPreset === 'custom' && (
                  <div className="animate-in slide-in-from-top-3 duration-200">
                    <Input
                      label="Enter Custom Amount ($ USD) *"
                      type="number"
                      step="1"
                      min="1"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder="e.g. 500"
                      required
                    />
                  </div>
                )}

                {/* Donor Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Your Name *"
                    placeholder="e.g. Jane Doe"
                    type="text"
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    required
                    disabled={submitting}
                  />

                  <Input
                    label="Email Address *"
                    placeholder="e.g. jane@example.com"
                    type="email"
                    value={donorEmail}
                    onChange={(e) => setDonorEmail(e.target.value)}
                    required
                    disabled={submitting}
                  />
                </div>

                {/* Optional Note */}
                <Textarea
                  label="Message / Dedication (Optional)"
                  placeholder="e.g. In memory of my beloved dog Max, or general comments..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  disabled={submitting}
                />

                {/* Submit button at bottom */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full font-mono uppercase tracking-wider py-4 flex items-center justify-center gap-2 shadow"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Submitting Donation...</span>
                      </>
                    ) : (
                      <>
                        <DollarSign className="w-4 h-4" />
                        <span>Submit Donation Proof</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>

            </div>

            {/* Right Column: Payment Channels & Upload */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Payment Methods Info */}
              <div className="bg-hprh-paper-dark border border-hprh-pine/15 rounded-lg p-5 space-y-5 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-hprh-sage"></div>
                
                <div className="flex items-center justify-between border-b border-hprh-pine/10 pb-3">
                  <h4 className="font-mono text-[10px] uppercase tracking-widest font-extrabold text-hprh-pine/70">
                    Step 1: Rescue Accounts
                  </h4>
                  <Heart className="w-4 h-4 text-hprh-sage" />
                </div>

                <p className="text-xs text-hprh-pine/60 leading-relaxed">
                  Please initiate a transfer of your chosen amount to one of our accounts via Zelle, Venmo, CashApp, or direct wire, then upload the receipt proof below.
                </p>

                {loading ? (
                  <div className="py-8 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-hprh-sage" />
                    <span className="font-mono text-[9px] uppercase tracking-wider text-hprh-pine/45">Loading channels...</span>
                  </div>
                ) : bankAccounts.length === 0 ? (
                  <div className="text-center py-6 bg-hprh-paper border border-dashed border-hprh-pine/15 rounded text-xs text-hprh-pine/40 select-none">
                    No active USD accounts configured. Please contact support.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Account Selector if multiple */}
                    {bankAccounts.length > 1 && (
                      <div className="space-y-1">
                        <label className="text-[9px] font-mono uppercase tracking-wider font-bold text-hprh-pine/50">
                          Select Account
                        </label>
                        <select
                          value={selectedBankId}
                          onChange={(e) => setSelectedBankId(e.target.value)}
                          className="w-full bg-hprh-paper border border-hprh-pine/15 focus:border-hprh-sage focus:ring-1 focus:ring-hprh-sage rounded px-3 py-2 text-xs text-hprh-pine focus:outline-none"
                        >
                          {bankAccounts.map(b => (
                            <option key={b.id} value={b.id}>
                              {b.display_label || b.bank_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Active Bank details card */}
                    {selectedBank && (
                      <div className="bg-white/60 border border-hprh-pine/10 rounded-md p-4 space-y-4 relative overflow-hidden animate-in fade-in duration-200">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-white border border-hprh-pine/10 rounded flex items-center justify-center p-1 overflow-hidden shadow-sm flex-shrink-0">
                            {selectedBank.logo_url ? (
                              <img src={selectedBank.logo_url} alt={`${selectedBank.bank_name} logo`} className="w-full h-full object-contain" />
                            ) : (
                              <Building2 className="w-4 h-4 text-hprh-pine/30" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-xs text-hprh-pine leading-tight">{selectedBank.display_label || selectedBank.bank_name}</div>
                            <span className="font-mono text-[8px] uppercase px-1 py-0.2 bg-hprh-sage/10 text-hprh-sage rounded font-bold">
                              {selectedBank.method_type || 'bank_transfer'}
                            </span>
                          </div>
                        </div>

                        {/* Details list */}
                        <div className="space-y-2 text-xs divide-y divide-hprh-pine/5">
                          <div className="flex items-center justify-between py-1">
                            <div>
                              <span className="text-[8px] font-mono text-hprh-pine/40 uppercase block">Account Holder</span>
                              <span className="font-semibold text-hprh-pine">{selectedBank.account_name}</span>
                            </div>
                            <button 
                              type="button" 
                              onClick={() => handleCopy(selectedBank.account_name, 'account_name')}
                              className="p-1 text-hprh-pine/30 hover:text-hprh-sage transition-colors"
                            >
                              {copiedField['account_name'] ? <Check className="w-3 h-3 text-hprh-sage" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>

                          {(!selectedBank.method_type || selectedBank.method_type === 'bank_transfer') ? (
                            <>
                              {selectedBank.account_number && (
                                <div className="flex items-center justify-between py-1">
                                  <div>
                                    <span className="text-[8px] font-mono text-hprh-pine/40 uppercase block">Account Number</span>
                                    <span className="font-mono font-bold text-hprh-pine">{selectedBank.account_number}</span>
                                  </div>
                                  <button 
                                    type="button" 
                                    onClick={() => handleCopy(selectedBank.account_number || '', 'account_number')}
                                    className="p-1 text-hprh-pine/30 hover:text-hprh-sage transition-colors"
                                  >
                                    {copiedField['account_number'] ? <Check className="w-3 h-3 text-hprh-sage" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </div>
                              )}
                              {selectedBank.routing_number && (
                                <div className="flex items-center justify-between py-1">
                                  <div>
                                    <span className="text-[8px] font-mono text-hprh-pine/40 uppercase block">Routing Number</span>
                                    <span className="font-mono font-bold text-hprh-pine">{selectedBank.routing_number}</span>
                                  </div>
                                  <button 
                                    type="button" 
                                    onClick={() => handleCopy(selectedBank.routing_number || '', 'routing_number')}
                                    className="p-1 text-hprh-pine/30 hover:text-hprh-sage transition-colors"
                                  >
                                    {copiedField['routing_number'] ? <Check className="w-3 h-3 text-hprh-sage" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </div>
                              )}
                            </>
                          ) : (
                            selectedBank.handle && (
                              <div className="flex items-center justify-between py-1">
                                  <div>
                                    <span className="text-[8px] font-mono text-hprh-pine/40 uppercase block">Identifier / Handle</span>
                                    <span className="font-mono font-bold text-hprh-clay">{selectedBank.handle}</span>
                                  </div>
                                  <button 
                                    type="button" 
                                    onClick={() => handleCopy(selectedBank.handle || '', 'handle')}
                                    className="p-1 text-hprh-pine/30 hover:text-hprh-sage transition-colors"
                                  >
                                    {copiedField['handle'] ? <Check className="w-3 h-3 text-hprh-sage" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Receipt File Dropzone */}
              <div className="bg-hprh-paper-dark border border-hprh-pine/15 rounded-lg p-5 space-y-4 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-hprh-clay"></div>
                
                <div className="flex items-center justify-between border-b border-hprh-pine/10 pb-3">
                  <h4 className="font-mono text-[10px] uppercase tracking-widest font-extrabold text-hprh-pine/70">
                    Step 2: Upload Receipt
                  </h4>
                  <Upload className="w-4 h-4 text-hprh-clay" />
                </div>

                <div className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center transition-colors ${
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
                      <span className="text-[11px] font-mono font-bold text-hprh-sage block truncate max-w-[180px] mx-auto">
                        {selectedFile.name}
                      </span>
                      <span className="text-[8px] text-hprh-pine/50 block font-mono">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                      <button
                        type="button"
                        onClick={handleClearFile}
                        className="text-[9px] uppercase font-mono tracking-widest font-bold text-hprh-clay hover:underline block mx-auto mt-1"
                      >
                        Remove Receipt
                      </button>
                    </div>
                  ) : (
                    <div className="text-center space-y-2 cursor-pointer relative py-3 w-full">
                      <Upload className="w-8 h-8 text-hprh-pine/25 mx-auto" />
                      <span className="text-xs font-bold text-hprh-pine block">Select transfer receipt</span>
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
                  <span className="text-[10px] text-hprh-clay uppercase tracking-wide font-semibold block mt-1">
                    {fileError}
                  </span>
                )}
              </div>

            </div>

          </div>
        )}
      </Container>
    </div>
  );
};

export default Donate;
