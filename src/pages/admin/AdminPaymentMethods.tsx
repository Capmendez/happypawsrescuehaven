import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { BankAccount, PaymentMethodType } from '../../lib/types';
import Container from '../../components/ui/Container';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Building2, 
  Check, 
  X, 
  ShieldAlert, 
  Upload,
  Settings
} from 'lucide-react';

export const AdminPaymentMethods: React.FC = () => {
  const [methods, setMethods] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Settings State
  const [securityDepositAmount, setSecurityDepositAmount] = useState('100.00');
  const [updatingSettings, setUpdatingSettings] = useState(false);

  // Public Contact Info Settings State
  const [contactPhone, setContactPhone] = useState('+1 (XXX) XXX-XXXX');
  const [contactEmail, setContactEmail] = useState('support@happypawsrescuehaven.com');
  const [contactAddress, setContactAddress] = useState('Grand Rapids, MI 49503');
  const [updatingContactSettings, setUpdatingContactSettings] = useState(false);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Form Fields
  const [methodType, setMethodType] = useState<PaymentMethodType>('bank_transfer');
  const [displayLabel, setDisplayLabel] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [accountType, setAccountType] = useState<'checking' | 'savings'>('checking');
  const [swiftCode, setSwiftCode] = useState('');
  const [handle, setHandle] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [notes, setNotes] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'warning' | 'error';
  } | null>(null);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const fetchPaymentData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 1. Fetch payment methods
      const { data: methodsData, error: dbError } = await supabase
        .from('bank_accounts')
        .select('*')
        .order('is_active', { ascending: false });

      if (dbError) throw dbError;
      setMethods(methodsData || []);

      // 2. Fetch application settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('app_settings')
        .select('*')
        .in('key', [
          'security_deposit_amount',
          'contact_phone',
          'contact_email',
          'contact_address'
        ]);

      if (settingsError) throw settingsError;
      if (settingsData) {
        settingsData.forEach((row: any) => {
          if (row.key === 'security_deposit_amount') setSecurityDepositAmount(row.value);
          if (row.key === 'contact_phone') setContactPhone(row.value);
          if (row.key === 'contact_email') setContactEmail(row.value);
          if (row.key === 'contact_address') setContactAddress(row.value);
        });
      }
    } catch (err: any) {
      console.error('Error fetching payment methods data:', err);
      setError(err.message || 'Failed to retrieve payment settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentData();
  }, []);

  // Update display label suggestion when method type changes
  const handleMethodTypeChange = (type: PaymentMethodType) => {
    setMethodType(type);
    
    // Set sensible defaults if user hasn't customized it significantly
    let suggestedLabel = '';
    switch(type) {
      case 'bank_transfer':
        suggestedLabel = 'Bank Wire Transfer';
        break;
      case 'zelle':
        suggestedLabel = 'Pay via Zelle';
        break;
      case 'cashapp':
        suggestedLabel = 'Pay via CashApp';
        break;
      case 'chime':
        suggestedLabel = 'Pay via Chime';
        break;
      case 'venmo':
        suggestedLabel = 'Pay via Venmo';
        break;
      case 'paypal':
        suggestedLabel = 'Pay via PayPal';
        break;
      case 'other':
        suggestedLabel = 'Other Payment Method';
        break;
    }
    setDisplayLabel(suggestedLabel);
  };

  const openAddForm = () => {
    setEditingId(null);
    setMethodType('bank_transfer');
    setDisplayLabel('Bank Wire Transfer');
    setBankName('');
    setAccountName('');
    setAccountNumber('');
    setRoutingNumber('');
    setAccountType('checking');
    setSwiftCode('');
    setHandle('');
    setCurrency('USD');
    setNotes('');
    setLogoUrl(null);
    setIsFormOpen(true);
  };

  const openEditForm = (account: BankAccount) => {
    setEditingId(account.id);
    setMethodType(account.method_type || 'bank_transfer');
    setDisplayLabel(account.display_label || '');
    setBankName(account.bank_name || '');
    setAccountName(account.account_name || '');
    setAccountNumber(account.account_number || '');
    setRoutingNumber(account.routing_number || '');
    setAccountType(account.account_type || 'checking');
    setSwiftCode(account.swift_code || '');
    setHandle(account.handle || '');
    setCurrency(account.currency);
    setNotes(account.notes || '');
    setLogoUrl(account.logo_url);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit.');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      alert('Only image files (JPG, PNG, SVG) are allowed.');
      return;
    }

    try {
      setUploadingLogo(true);
      const fileExt = file.name.split('.').pop();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 15);
      const fileName = `payment-logos/${Date.now()}-${sanitizedName}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('pet-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('pet-photos')
        .getPublicUrl(fileName);

      setLogoUrl(publicUrl);
      setNotification({
        message: 'Logo uploaded successfully.',
        type: 'success'
      });
    } catch (err: any) {
      console.error('Logo upload error:', err);
      alert('Failed to upload logo: ' + (err.message || 'Unknown error'));
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validations
    if (!accountName) {
      setNotification({ message: 'Account Holder Name is required.', type: 'error' });
      return;
    }
    
    if (methodType === 'bank_transfer') {
      if (!bankName || !accountNumber || !routingNumber) {
        setNotification({ message: 'Bank Name, Account Number, and Routing Number are required for wire transfers.', type: 'error' });
        return;
      }
    } else {
      if (!handle) {
        setNotification({ message: 'Handle/Identifier is required.', type: 'error' });
        return;
      }
    }

    try {
      setSubmitting(true);
      
      const payload: any = {
        method_type: methodType,
        display_label: displayLabel || methodType.toUpperCase(),
        account_name: accountName,
        currency,
        notes: notes || null,
        logo_url: logoUrl,
        is_active: editingId ? undefined : true
      };

      if (methodType === 'bank_transfer') {
        payload.bank_name = bankName;
        payload.account_number = accountNumber;
        payload.routing_number = routingNumber;
        payload.account_type = accountType;
        payload.swift_code = swiftCode || null;
        payload.handle = null;
      } else {
        // Non-bank transfer methods: bank_name is the provider name, account_number/routing are null, handle is populated
        let providerName = 'Other';
        switch(methodType) {
          case 'zelle': providerName = 'Zelle'; break;
          case 'cashapp': providerName = 'CashApp'; break;
          case 'venmo': providerName = 'Venmo'; break;
          case 'chime': providerName = 'Chime'; break;
          case 'paypal': providerName = 'PayPal'; break;
        }
        payload.bank_name = providerName;
        payload.handle = handle;
        payload.account_number = null;
        payload.routing_number = null;
        payload.account_type = null;
        payload.swift_code = null;
      }

      if (editingId) {
        const { error: updateError } = await supabase
          .from('bank_accounts')
          .update(payload)
          .eq('id', editingId);

        if (updateError) throw updateError;
        setNotification({
          message: `Payment method "${displayLabel}" updated successfully.`,
          type: 'success'
        });
      } else {
        const { error: insertError } = await supabase
          .from('bank_accounts')
          .insert([payload]);

        if (insertError) throw insertError;
        setNotification({
          message: `Payment method "${displayLabel}" registered successfully.`,
          type: 'success'
        });
      }

      closeForm();
      fetchPaymentData();
    } catch (err: any) {
      console.error('Error saving payment method:', err);
      setNotification({
        message: `Failed to save payment method: ${err.message || 'Error occurred.'}`,
        type: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (account: BankAccount) => {
    try {
      const newActiveState = !account.is_active;
      // Optimistic update
      setMethods(prev => 
        prev.map(acc => acc.id === account.id ? { ...acc, is_active: newActiveState } : acc)
      );

      const { error: updateError } = await supabase
        .from('bank_accounts')
        .update({ is_active: newActiveState })
        .eq('id', account.id);

      if (updateError) throw updateError;
      setNotification({
        message: `Payment method status set to ${newActiveState ? 'active' : 'inactive'}.`,
        type: 'success'
      });
    } catch (err: any) {
      console.error('Error toggling active state:', err);
      setNotification({
        message: `Failed to toggle status: ${err.message}`,
        type: 'error'
      });
      fetchPaymentData();
    }
  };

  const handleDelete = async (account: BankAccount) => {
    try {
      const { count, error: countError } = await supabase
        .from('payment_proofs')
        .select('id', { count: 'exact', head: true })
        .eq('bank_account_id', account.id);

      if (countError) throw countError;

      if (count && count > 0) {
        const confirmDeactivate = window.confirm(
          `This payment method is referenced in ${count} payment proof(s) and cannot be deleted.\n\nWould you like to deactivate it instead? Inactive methods are hidden during adopter checkout.`
        );

        if (confirmDeactivate) {
          const { error: updateError } = await supabase
            .from('bank_accounts')
            .update({ is_active: false })
            .eq('id', account.id);

          if (updateError) throw updateError;
          setNotification({
            message: `Payment method "${account.display_label}" has been deactivated.`,
            type: 'warning'
          });
          fetchPaymentData();
        }
      } else {
        const confirmDelete = window.confirm(
          `Are you sure you want to permanently delete the payment method "${account.display_label}"?\nThis action cannot be undone.`
        );

        if (confirmDelete) {
          const { error: deleteError } = await supabase
            .from('bank_accounts')
            .delete()
            .eq('id', account.id);

          if (deleteError) throw deleteError;
          setNotification({
            message: `Payment method permanently deleted.`,
            type: 'success'
          });
          fetchPaymentData();
        }
      }
    } catch (err: any) {
      console.error('Error deleting payment method:', err);
      alert('Action failed: ' + (err.message || 'Error occurred.'));
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(securityDepositAmount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      setNotification({
        message: 'Please enter a valid non-negative security deposit amount.',
        type: 'error'
      });
      return;
    }

    try {
      setUpdatingSettings(true);
      const { error: settingsError } = await supabase
        .from('app_settings')
        .upsert([{ key: 'security_deposit_amount', value: parsedAmount.toFixed(2) }]);

      if (settingsError) throw settingsError;

      setNotification({
        message: `Refundable Security Deposit amount set to $${parsedAmount.toFixed(2)} successfully.`,
        type: 'success'
      });
    } catch (err: any) {
      console.error('Error updating settings:', err);
      setNotification({
        message: `Failed to update settings: ${err.message}`,
        type: 'error'
      });
    } finally {
      setUpdatingSettings(false);
    }
  };

  const handleUpdateContactSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactPhone.trim() || !contactEmail.trim() || !contactAddress.trim()) {
      setNotification({
        message: 'Please fill in all contact information fields.',
        type: 'error'
      });
      return;
    }

    try {
      setUpdatingContactSettings(true);
      const { error: settingsError } = await supabase
        .from('app_settings')
        .upsert([
          { key: 'contact_phone', value: contactPhone.trim() },
          { key: 'contact_email', value: contactEmail.trim() },
          { key: 'contact_address', value: contactAddress.trim() }
        ]);

      if (settingsError) throw settingsError;

      setNotification({
        message: 'Public Contact Information updated successfully.',
        type: 'success'
      });
    } catch (err: any) {
      console.error('Error updating contact settings:', err);
      setNotification({
        message: `Failed to update contact settings: ${err.message}`,
        type: 'error'
      });
    } finally {
      setUpdatingContactSettings(false);
    }
  };

  if (loading && methods.length === 0) {
    return (
      <div className="py-20 bg-hprh-paper min-h-[60vh] flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 border-4 border-hprh-sage border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="font-mono text-xs uppercase tracking-widest text-hprh-pine/50">Fetching payment methods...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 bg-hprh-paper text-hprh-pine font-sans min-h-screen">
      <Container className="space-y-10">
        
        {/* Header Controls */}
        <div className="border-b-2 border-dashed border-hprh-pine/20 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-hprh-sage font-bold block mb-1">
              Treasury Management
            </span>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-hprh-pine">
              Payment Methods Register
            </h1>
            <p className="text-xs text-hprh-pine/50 mt-1">
              Manage the organization payment details shown to adopters for adoption, transport, and deposit checkouts.
            </p>
          </div>
          
          <button
            onClick={openAddForm}
            className="inline-flex items-center gap-1.5 bg-hprh-clay text-hprh-paper hover:bg-hprh-clay/95 text-xs font-mono font-bold uppercase tracking-wider px-5 py-3 rounded self-start sm:self-center transition-colors shadow"
          >
            <Plus className="w-4 h-4" />
            <span>Add Payment Method</span>
          </button>
        </div>

        {error && (
          <div className="bg-hprh-clay/10 border border-hprh-clay/20 text-hprh-pine p-4 rounded text-xs flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-hprh-clay flex-shrink-0" />
            <div className="space-y-1">
              <span className="font-mono uppercase font-bold text-hprh-clay block">Register Sync Error</span>
              <p className="leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Payment Methods Table */}
        {methods.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-hprh-pine/15 bg-hprh-paper-dark/30 rounded-lg space-y-3">
            <h3 className="font-display text-xl font-bold text-hprh-pine/70">No Payment Methods Logged</h3>
            <p className="text-xs text-hprh-pine/50 max-w-sm mx-auto leading-relaxed">
              Adopters won't be able to checkout until a payment method is registered. Click "Add Payment Method" to configure Zelle, CashApp, or Bank details.
            </p>
          </div>
        ) : (
          <div className="bg-hprh-paper-dark border border-hprh-pine/15 rounded overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-sans text-xs">
                <thead>
                  <tr className="bg-hprh-pine/5 border-b border-hprh-pine/15 text-hprh-pine/60 font-mono text-[9px] uppercase tracking-wider select-none">
                    <th className="py-3 px-4 w-14">Logo</th>
                    <th className="py-3 px-4">Method Label</th>
                    <th className="py-3 px-4">Account Name</th>
                    <th className="py-3 px-4">Payment Details</th>
                    <th className="py-3 px-4">Currency</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hprh-pine/10">
                  {methods.map((method) => {
                    const isBank = method.method_type === 'bank_transfer';
                    return (
                      <tr key={method.id} className="hover:bg-hprh-pine/5 transition-colors">
                        {/* Logo Icon */}
                        <td className="py-3 px-4">
                          <div className="w-9 h-9 bg-white border border-hprh-pine/10 rounded flex items-center justify-center p-1 overflow-hidden shadow-sm">
                            {method.logo_url ? (
                              <img src={method.logo_url} alt={`${method.display_label} logo`} className="w-full h-full object-contain" />
                            ) : (
                              <Building2 className="w-4 h-4 text-hprh-pine/40" />
                            )}
                          </div>
                        </td>

                        {/* Method Label */}
                        <td className="py-3 px-4 font-bold text-sm text-hprh-pine">
                          <div>{method.display_label}</div>
                          <span className="font-mono text-[8px] uppercase px-1.5 py-0.5 bg-hprh-sage/10 text-hprh-sage rounded font-bold">
                            {method.method_type}
                          </span>
                        </td>

                        {/* Account Name */}
                        <td className="py-3 px-4 text-hprh-pine/80">
                          {method.account_name}
                        </td>

                        {/* Account/Routing Numbers or Handle */}
                        <td className="py-3 px-4 font-mono text-[10px] space-y-0.5">
                          {isBank ? (
                            <>
                              <div><span className="text-hprh-pine/40">ACCT:</span> ••••{method.account_number?.slice(-4)}</div>
                              <div><span className="text-hprh-pine/40">ROUT:</span> {method.routing_number}</div>
                              {method.swift_code && (
                                <div><span className="text-hprh-pine/40">SWIFT:</span> {method.swift_code}</div>
                              )}
                            </>
                          ) : (
                            <div><span className="text-hprh-pine/40">HANDLE:</span> {method.handle}</div>
                          )}
                        </td>

                        {/* Currency */}
                        <td className="py-3 px-4 font-mono font-bold text-hprh-pine/80">
                          {method.currency}
                        </td>

                        {/* Active Status */}
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleToggleActive(method)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded font-mono text-[9px] font-bold border transition-all ${
                              method.is_active 
                                ? 'bg-hprh-sage/15 border-hprh-sage/35 text-hprh-sage hover:bg-hprh-sage/25'
                                : 'bg-hprh-pine/5 border-hprh-pine/20 text-hprh-pine/40 hover:bg-hprh-pine/10'
                            }`}
                          >
                            {method.is_active ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>ACTIVE</span>
                              </>
                            ) : (
                              <>
                                <X className="w-3 h-3" />
                                <span>INACTIVE</span>
                              </>
                            )}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => openEditForm(method)}
                              className="p-1.5 border border-hprh-pine/15 rounded bg-hprh-paper hover:bg-hprh-pine/5 text-hprh-sage hover:border-hprh-sage/40 transition-colors"
                              title="Edit Details"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDelete(method)}
                              className="p-1.5 border border-hprh-pine/15 rounded bg-hprh-paper hover:bg-hprh-clay/10 text-hprh-clay hover:border-hprh-clay/40 transition-colors"
                              title="Delete Method"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Setting Panel: Security Deposit Settings */}
        <div className="bg-hprh-paper-dark border border-hprh-pine/15 rounded-lg p-6 space-y-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-hprh-sage"></div>
          <div className="flex items-center gap-2 border-b border-hprh-pine/10 pb-3">
            <Settings className="w-5 h-5 text-hprh-sage" />
            <h2 className="font-display text-lg font-bold text-hprh-pine">
              Global Transportation Settings
            </h2>
          </div>
          
          <form onSubmit={handleUpdateSettings} className="flex flex-col sm:flex-row sm:items-end gap-4 max-w-md">
            <div className="flex-grow">
              <Input
                label="Refundable Security Deposit ($ USD) *"
                type="number"
                step="0.01"
                min="0"
                value={securityDepositAmount}
                onChange={(e) => setSecurityDepositAmount(e.target.value)}
                placeholder="e.g. 100.00"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={updatingSettings}
              className="bg-hprh-sage text-hprh-paper hover:bg-hprh-sage/95 text-xs font-mono font-bold uppercase tracking-wider py-3.5 px-6 rounded transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow"
            >
              {updatingSettings ? 'Updating...' : 'Save Settings'}
            </button>
          </form>
          
          <p className="text-[10px] text-hprh-pine/45 italic">
            * This deposit setting determines the flat-rate security deposit adopter invoices created automatically upon approving transportation fees.
          </p>
        </div>

        {/* Setting Panel: Public Contact Information Settings */}
        <div className="bg-hprh-paper-dark border border-hprh-pine/15 rounded-lg p-6 space-y-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-hprh-clay"></div>
          <div className="flex items-center gap-2 border-b border-hprh-pine/10 pb-3">
            <Settings className="w-5 h-5 text-hprh-clay" />
            <h2 className="font-display text-lg font-bold text-hprh-pine">
              Public Contact Information
            </h2>
          </div>
          
          <form onSubmit={handleUpdateContactSettings} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Contact Phone Number *"
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="e.g. +1 (555) 019-2834"
                required
              />
              <Input
                label="Contact Email Address *"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="e.g. support@happypawsrescuehaven.com"
                required
              />
              <Input
                label="Rescue Address/Location *"
                type="text"
                value={contactAddress}
                onChange={(e) => setContactAddress(e.target.value)}
                placeholder="e.g. Grand Rapids, MI 49503"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={updatingContactSettings}
              className="bg-hprh-clay text-hprh-paper hover:bg-hprh-clay/95 text-xs font-mono font-bold uppercase tracking-wider py-3.5 px-6 rounded transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow"
            >
              {updatingContactSettings ? 'Updating...' : 'Save Contact Settings'}
            </button>
          </form>
          
          <p className="text-[10px] text-hprh-pine/45 italic">
            * This contact information is displayed publicly on the contact page. Updating these settings will update the public website contact coordinates immediately.
          </p>
        </div>

      </Container>

      {/* Add/Edit Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-hprh-pine/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-hprh-paper border-2 border-hprh-pine/20 rounded-lg shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-hprh-paper-dark border-b border-hprh-pine/10 px-5 py-4 flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-hprh-pine">
                {editingId ? 'Edit Payment Method' : 'Register New Payment Method'}
              </h3>
              <button 
                onClick={closeForm}
                className="text-hprh-pine/50 hover:text-hprh-pine p-1 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Method Type *"
                  value={methodType}
                  onChange={(e) => handleMethodTypeChange(e.target.value as PaymentMethodType)}
                  options={[
                    { value: 'bank_transfer', label: 'Bank Wire Transfer' },
                    { value: 'zelle', label: 'Zelle' },
                    { value: 'cashapp', label: 'CashApp' },
                    { value: 'chime', label: 'Chime' },
                    { value: 'venmo', label: 'Venmo' },
                    { value: 'paypal', label: 'PayPal' },
                    { value: 'other', label: 'Other Method' }
                  ]}
                />

                <Input
                  label="Display Label *"
                  placeholder="e.g. Pay via Zelle"
                  value={displayLabel}
                  onChange={(e) => setDisplayLabel(e.target.value)}
                  required
                />
              </div>

              <Input
                label="Account Holder Name *"
                placeholder="e.g. Happy Paws Rescue Haven Inc."
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                required
              />

              {/* Conditional Fields based on methodType */}
              {methodType === 'bank_transfer' ? (
                <div className="space-y-4 border-t border-hprh-pine/5 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Bank Name *"
                      placeholder="e.g. Chase Bank"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      required
                    />
                    
                    <Select
                      label="Account Type *"
                      value={accountType}
                      onChange={(e) => setAccountType(e.target.value as any)}
                      options={[
                        { value: 'checking', label: 'Checking' },
                        { value: 'savings', label: 'Savings' }
                      ]}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Account Number *"
                      placeholder="Enter account number"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      required
                    />

                    <Input
                      label="Routing Number *"
                      placeholder="9-digit routing code"
                      value={routingNumber}
                      onChange={(e) => setRoutingNumber(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="SWIFT / BIC Code (Optional)"
                      placeholder="For international wires"
                      value={swiftCode}
                      onChange={(e) => setSwiftCode(e.target.value)}
                    />

                    <Input
                      label="Currency *"
                      placeholder="e.g. USD"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4 border-t border-hprh-pine/5 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label={`${methodType.toUpperCase()} Handle / Username / Phone *`}
                      placeholder={
                        methodType === 'zelle' ? 'finance@happypaws.org or phone' :
                        methodType === 'cashapp' ? '$cashtag' :
                        methodType === 'paypal' ? 'paypal.me link or email' : 'Account Identifier'
                      }
                      value={handle}
                      onChange={(e) => setHandle(e.target.value)}
                      required
                    />

                    <Input
                      label="Currency *"
                      placeholder="e.g. USD"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              {/* Logo Upload Component */}
              <div className="border border-dashed border-hprh-pine/20 rounded p-4 bg-hprh-paper-dark/30 flex flex-col sm:flex-row items-center gap-4">
                <div className="w-16 h-16 bg-white border border-hprh-pine/10 rounded flex items-center justify-center p-1 overflow-hidden shadow-sm flex-shrink-0">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Institution Logo Preview" className="w-full h-full object-contain" />
                  ) : (
                    <Building2 className="w-6 h-6 text-hprh-pine/30" />
                  )}
                </div>

                <div className="flex-grow space-y-1.5 text-center sm:text-left w-full">
                  <span className="text-xs uppercase font-mono tracking-wider font-bold text-hprh-pine/70 block">
                    Method Brand Logo
                  </span>
                  
                  <div className="flex items-center justify-center sm:justify-start gap-3">
                    <label className="bg-hprh-sage text-hprh-paper hover:bg-hprh-sage/95 cursor-pointer text-[10px] font-mono font-bold uppercase tracking-wider py-2 px-4 rounded transition-colors inline-flex items-center gap-1.5">
                      {uploadingLogo ? (
                        <>
                          <div className="w-3 h-3 border-2 border-hprh-paper border-t-transparent rounded-full animate-spin"></div>
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Image</span>
                        </>
                      )}
                      <input 
                        type="file" 
                        accept="image/png, image/jpeg, image/jpg, image/svg+xml"
                        className="hidden" 
                        onChange={handleLogoUpload}
                        disabled={uploadingLogo}
                      />
                    </label>
                    
                    {logoUrl && (
                      <button
                        type="button"
                        onClick={() => setLogoUrl(null)}
                        className="text-hprh-clay hover:underline text-[10px] font-mono font-bold uppercase tracking-wider"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <span className="text-[9px] text-hprh-pine/40 block">PNG, JPG, SVG max 5MB. Publicly accessible.</span>
                </div>
              </div>

              <Textarea
                label="Transfer Notes (Optional)"
                placeholder="e.g. Include your application code in the payment reference note."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />

              {/* Modal Footer / Actions */}
              <div className="border-t border-hprh-pine/10 pt-4 flex justify-end gap-2.5">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={closeForm}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                
                <Button
                  type="submit"
                  variant="secondary"
                  disabled={submitting || uploadingLogo}
                  className="font-semibold"
                >
                  {submitting ? 'Saving...' : editingId ? 'Update Method' : 'Register Method'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className={`p-4 rounded-lg shadow-lg border text-xs flex items-start gap-3 relative ${
            notification.type === 'success' 
              ? 'bg-hprh-sage/10 border-hprh-sage/30 text-hprh-pine' 
              : notification.type === 'warning'
              ? 'bg-hprh-gold/10 border-hprh-gold/30 text-hprh-pine'
              : 'bg-hprh-clay/10 border-hprh-clay/30 text-hprh-pine'
          }`}>
            <Building2 className={`w-5 h-5 flex-shrink-0 ${
              notification.type === 'success' ? 'text-hprh-sage' : notification.type === 'warning' ? 'text-hprh-gold' : 'text-hprh-clay'
            }`} />
            <div className="flex-grow space-y-1">
              <span className="font-mono uppercase font-bold block">
                {notification.type === 'success' ? 'Register Update' : notification.type === 'warning' ? 'Register Alert' : 'Register Failure'}
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

export default AdminPaymentMethods;
