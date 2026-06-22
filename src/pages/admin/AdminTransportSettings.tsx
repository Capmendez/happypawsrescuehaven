import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Container from '../../components/ui/Container';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  ShieldAlert, 
  Truck, 
  AlertTriangle, 
  AlertCircle
} from 'lucide-react';

interface TransportFeeTier {
  id: string;
  min_distance_miles: number;
  max_distance_miles: number | null;
  fee_amount: number;
  currency: string;
  is_active: boolean;
  created_at?: string;
}

export const AdminTransportSettings: React.FC = () => {
  const [tiers, setTiers] = useState<TransportFeeTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  


  // Form Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [minDistance, setMinDistance] = useState('');
  const [maxDistance, setMaxDistance] = useState('');
  const [feeAmount, setFeeAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [isActive, setIsActive] = useState(true);

  // Live Overlap warnings in form modal
  const [formWarnings, setFormWarnings] = useState<string[]>([]);
  // Global warnings / consistency checks (gaps or conflicts)
  const [globalWarnings, setGlobalWarnings] = useState<string[]>([]);

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

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 1. Fetch distance fee tiers
      const { data: tiersData, error: dbError } = await supabase
        .from('transport_fee_tiers')
        .select('*')
        .order('min_distance_miles', { ascending: true });

      if (dbError) throw dbError;
      const sortedTiers = (tiersData || []) as TransportFeeTier[];
      setTiers(sortedTiers);

      // Run global consistency warnings check
      const globalAnomalies = checkGlobalConsistency(sortedTiers);
      setGlobalWarnings(globalAnomalies);


    } catch (err: any) {
      console.error('Error fetching settings:', err);
      setError(err.message || 'Failed to retrieve transport settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Run live form overlap/validation checking
  useEffect(() => {
    if (!isFormOpen) {
      setFormWarnings([]);
      return;
    }

    const minVal = parseFloat(minDistance);
    const maxVal = maxDistance.trim() === '' ? null : parseFloat(maxDistance);

    if (isNaN(minVal)) {
      setFormWarnings([]);
      return;
    }

    const warnings: string[] = [];

    if (minVal < 0) {
      warnings.push("Minimum distance cannot be negative.");
    }
    if (maxVal !== null && maxVal < minVal) {
      warnings.push("Maximum distance cannot be less than minimum distance.");
    }

    // Check overlaps with other active tiers
    const actualMax = maxVal === null ? Infinity : maxVal;
    const activeTiers = tiers.filter(t => t.id !== editingId && t.is_active);

    for (const tier of activeTiers) {
      const tierMin = tier.min_distance_miles;
      const tierMax = tier.max_distance_miles === null ? Infinity : tier.max_distance_miles;

      // They overlap if minDist < tierMax && tierMin < actualMax
      if (minVal < tierMax && tierMin < actualMax) {
        warnings.push(
          `Overlaps with active Tier: ${tier.min_distance_miles} to ${
            tier.max_distance_miles ?? 'No limit'
          } miles (Fee: $${tier.fee_amount} ${tier.currency}).`
        );
      }
    }

    setFormWarnings(warnings);
  }, [minDistance, maxDistance, isActive, isFormOpen, editingId, tiers]);

  // Global Gaps and Overlaps analyzer
  const checkGlobalConsistency = (allTiers: TransportFeeTier[]) => {
    const activeTiers = allTiers
      .filter(t => t.is_active)
      .sort((a, b) => a.min_distance_miles - b.min_distance_miles);

    const anomalies: string[] = [];

    if (activeTiers.length === 0) {
      anomalies.push("There are no active distance fee tiers. Quote calculations will fail.");
      return anomalies;
    }

    // Check if first tier starts at 0
    if (activeTiers[0].min_distance_miles > 0) {
      anomalies.push(`Gap: No coverage for distances below ${activeTiers[0].min_distance_miles} miles.`);
    }

    // Check for gaps and overlaps
    for (let i = 0; i < activeTiers.length - 1; i++) {
      const current = activeTiers[i];
      const next = activeTiers[i + 1];
      
      const currentMax = current.max_distance_miles;
      
      if (currentMax === null) {
        anomalies.push(`Conflict: The tier starting at ${current.min_distance_miles} miles has "No limit", making subsequent tiers unreachable.`);
        break;
      }

      if (next.min_distance_miles < currentMax) {
        anomalies.push(`Overlap: Range ${current.min_distance_miles}-${currentMax} miles overlaps with ${next.min_distance_miles}-${next.max_distance_miles ?? 'No limit'} miles.`);
      } else if (next.min_distance_miles > currentMax) {
        anomalies.push(`Gap: Distances between ${currentMax} and ${next.min_distance_miles} miles are not covered.`);
      }
    }

    // Check if last tier has no upper limit
    const lastTier = activeTiers[activeTiers.length - 1];
    if (lastTier && lastTier.max_distance_miles !== null) {
      anomalies.push(`Gap: Distances above ${lastTier.max_distance_miles} miles have no active fee tier configured.`);
    }

    return anomalies;
  };

  const openAddForm = () => {
    setEditingId(null);
    setMinDistance('');
    setMaxDistance('');
    setFeeAmount('');
    setCurrency('USD');
    setIsActive(true);
    setIsFormOpen(true);
  };

  const openEditForm = (tier: TransportFeeTier) => {
    setEditingId(tier.id);
    setMinDistance(tier.min_distance_miles.toString());
    setMaxDistance(tier.max_distance_miles !== null ? tier.max_distance_miles.toString() : '');
    setFeeAmount(tier.fee_amount.toString());
    setCurrency(tier.currency);
    setIsActive(tier.is_active);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
  };

  const handleToggleActive = async (tier: TransportFeeTier) => {
    try {
      const newActiveState = !tier.is_active;
      
      // Optimistic update
      const updatedTiers = tiers.map(t => t.id === tier.id ? { ...t, is_active: newActiveState } : t);
      setTiers(updatedTiers);
      setGlobalWarnings(checkGlobalConsistency(updatedTiers));

      const { error: updateError } = await supabase
        .from('transport_fee_tiers')
        .update({ is_active: newActiveState })
        .eq('id', tier.id);

      if (updateError) throw updateError;
      
      setNotification({
        message: `Distance tier status set to ${newActiveState ? 'active' : 'inactive'}.`,
        type: 'success'
      });
      fetchData();
    } catch (err: any) {
      console.error('Error toggling active state:', err);
      setNotification({
        message: `Failed to toggle status: ${err.message}`,
        type: 'error'
      });
      fetchData();
    }
  };

  const handleDelete = async (tier: TransportFeeTier) => {
    try {
      // 1. Check if tier is referenced in transport_requests
      const { count, error: countError } = await supabase
        .from('transport_requests')
        .select('id', { count: 'exact', head: true })
        .eq('fee_tier_id', tier.id);

      if (countError) throw countError;

      if (count && count > 0) {
        // Referenced! Prompt for deactivation instead.
        const confirmDeactivate = window.confirm(
          `This distance fee tier is referenced in ${count} transport request(s) and cannot be deleted permanently.\n\nWould you like to deactivate it instead? Inactive tiers are excluded from future transport quotes.`
        );

        if (confirmDeactivate) {
          const { error: updateError } = await supabase
            .from('transport_fee_tiers')
            .update({ is_active: false })
            .eq('id', tier.id);

          if (updateError) throw updateError;
          setNotification({
            message: `Distance tier deactivated successfully.`,
            type: 'warning'
          });
          fetchData();
        }
      } else {
        // Not referenced. Hard delete.
        const confirmDelete = window.confirm(
          `Are you sure you want to permanently delete this distance fee tier?\nThis action cannot be undone.`
        );

        if (confirmDelete) {
          const { error: deleteError } = await supabase
            .from('transport_fee_tiers')
            .delete()
            .eq('id', tier.id);

          if (deleteError) throw deleteError;
          setNotification({
            message: `Distance fee tier permanently deleted.`,
            type: 'success'
          });
          fetchData();
        }
      }
    } catch (err: any) {
      console.error('Error deleting distance tier:', err);
      alert('Action failed: ' + (err.message || 'Error occurred.'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const parsedMin = parseInt(minDistance, 10);
    const parsedMax = maxDistance.trim() === '' ? null : parseInt(maxDistance, 10);
    const parsedFee = parseFloat(feeAmount);

    if (isNaN(parsedMin) || parsedMin < 0) {
      setNotification({ message: 'Minimum distance must be a non-negative number.', type: 'error' });
      return;
    }
    if (parsedMax !== null && parsedMax < parsedMin) {
      setNotification({ message: 'Maximum distance cannot be less than minimum distance.', type: 'error' });
      return;
    }
    if (isNaN(parsedFee) || parsedFee < 0) {
      setNotification({ message: 'Fee amount must be a positive number.', type: 'error' });
      return;
    }

    try {
      setSubmitting(true);
      
      const payload: any = {
        min_distance_miles: parsedMin,
        max_distance_miles: parsedMax,
        fee_amount: parsedFee,
        currency,
        is_active: isActive
      };

      if (editingId) {
        const { error: updateError } = await supabase
          .from('transport_fee_tiers')
          .update(payload)
          .eq('id', editingId);

        if (updateError) throw updateError;
        setNotification({
          message: `Distance fee tier ($${parsedFee}) updated successfully.`,
          type: 'success'
        });
      } else {
        const { error: insertError } = await supabase
          .from('transport_fee_tiers')
          .insert([payload]);

        if (insertError) throw insertError;
        setNotification({
          message: `Distance fee tier ($${parsedFee}) added successfully.`,
          type: 'success'
        });
      }

      closeForm();
      fetchData();
    } catch (err: any) {
      console.error('Error saving distance tier:', err);
      setNotification({
        message: `Failed to save tier: ${err.message || 'Error occurred.'}`,
        type: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };



  if (loading && tiers.length === 0) {
    return (
      <div className="py-20 bg-hprh-paper min-h-[60vh] flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 border-4 border-hprh-sage border-t-transparent rounded-full animate-spin mx-auto text-hprh-sage"></div>
          <p className="font-mono text-xs uppercase tracking-widest text-hprh-pine/50">Fetching transport parameters...</p>
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
              Transport Settings
            </h1>
            <p className="text-xs text-hprh-pine/50 mt-1">
              Configure distance-based delivery rate tiers.
            </p>
          </div>
          
          <button
            onClick={openAddForm}
            className="inline-flex items-center gap-1.5 bg-hprh-clay text-hprh-paper hover:bg-hprh-clay/95 text-xs font-mono font-bold uppercase tracking-wider px-5 py-3 rounded self-start sm:self-center transition-colors shadow"
          >
            <Plus className="w-4 h-4" />
            <span>Add Fee Tier</span>
          </button>
        </div>

        {error && (
          <div className="bg-hprh-clay/10 border border-hprh-clay/20 text-hprh-pine p-4 rounded text-xs flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-hprh-clay flex-shrink-0 animate-bounce" />
            <div className="space-y-1">
              <span className="font-mono uppercase font-bold text-hprh-clay block">Register Sync Error</span>
              <p className="leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Global Warnings Alert Banner */}
        {globalWarnings.length > 0 && (
          <div className="bg-hprh-gold/10 border border-hprh-gold/30 text-hprh-pine p-4 rounded text-xs space-y-2">
            <div className="flex items-center gap-2 font-mono font-bold uppercase text-[9px] text-hprh-gold">
              <AlertTriangle className="w-4.5 h-4.5" />
              <span>Distance Configuration Alert</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-hprh-pine/80 font-medium">
              {globalWarnings.map((warning, idx) => (
                <li key={idx}>{warning}</li>
              ))}
            </ul>
            <p className="text-[9px] text-hprh-pine/45 leading-relaxed pt-1">
              * Overlaps or gaps do not block the app but can yield unexpected transport fee outputs or cause distance lookups to fallback/error.
            </p>
          </div>
        )}

        {/* SECTION A: Distance Fee Tiers Table */}
        <div className="space-y-4">
          <h2 className="font-mono text-xs uppercase tracking-widest font-bold text-hprh-pine/50">
            Section A — Distance Fee Tiers
          </h2>

          {tiers.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-hprh-pine/15 bg-hprh-paper-dark/30 rounded-lg space-y-3">
              <h3 className="font-display text-xl font-bold text-hprh-pine/70">No Fee Tiers Defined</h3>
              <p className="text-xs text-hprh-pine/50 max-w-sm mx-auto leading-relaxed">
                Adopters will not be able to generate transport quotes until distance fee tiers are set. Click "Add Fee Tier" to begin.
              </p>
            </div>
          ) : (
            <div className="bg-hprh-paper-dark border border-hprh-pine/15 rounded overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-sans text-xs">
                  <thead>
                    <tr className="bg-hprh-pine/5 border-b border-hprh-pine/15 text-hprh-pine/60 font-mono text-[9px] uppercase tracking-wider select-none">
                      <th className="py-3 px-4">Distance Range</th>
                      <th className="py-3 px-4">Fee Amount</th>
                      <th className="py-3 px-4">Currency</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hprh-pine/10">
                    {tiers.map((tier) => {
                      return (
                        <tr key={tier.id} className="hover:bg-hprh-pine/5 transition-colors">
                          
                          {/* Distance Range */}
                          <td className="py-3.5 px-4 font-mono font-bold text-sm text-hprh-pine">
                            {tier.min_distance_miles} - {tier.max_distance_miles !== null ? `${tier.max_distance_miles} miles` : 'No limit'}
                          </td>

                          {/* Fee Amount */}
                          <td className="py-3.5 px-4 font-mono text-sm text-hprh-clay font-black">
                            ${tier.fee_amount.toFixed(2)}
                          </td>

                          {/* Currency */}
                          <td className="py-3.5 px-4 font-mono text-hprh-pine/60">
                            {tier.currency}
                          </td>

                          {/* Active Status */}
                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => handleToggleActive(tier)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded font-mono text-[9px] font-bold border transition-all ${
                                tier.is_active 
                                  ? 'bg-hprh-sage/15 border-hprh-sage/35 text-hprh-sage hover:bg-hprh-sage/25'
                                  : 'bg-hprh-pine/5 border-hprh-pine/20 text-hprh-pine/40 hover:bg-hprh-pine/10'
                              }`}
                            >
                              {tier.is_active ? (
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
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => openEditForm(tier)}
                                className="p-1.5 border border-hprh-pine/15 rounded bg-hprh-paper hover:bg-hprh-pine/5 text-hprh-sage hover:border-hprh-sage/40 transition-colors"
                                title="Edit Tier"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDelete(tier)}
                                className="p-1.5 border border-hprh-pine/15 rounded bg-hprh-paper hover:bg-hprh-clay/10 text-hprh-clay hover:border-hprh-clay/40 transition-colors"
                                title="Delete Tier"
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
        </div>



      </Container>

      {/* Add/Edit Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-hprh-pine/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-hprh-paper border-2 border-hprh-pine/20 rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-hprh-paper-dark border-b border-hprh-pine/10 px-5 py-4 flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-hprh-pine">
                {editingId ? 'Edit Distance Tier' : 'Add Distance Tier'}
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
                <Input
                  label="Min Distance (Miles) *"
                  type="number"
                  min="0"
                  placeholder="e.g. 0"
                  value={minDistance}
                  onChange={(e) => setMinDistance(e.target.value)}
                  required
                />

                <Input
                  label="Max Distance (Miles)"
                  type="number"
                  min="0"
                  placeholder="Leave blank for no limit"
                  helperText="Blank = No limit"
                  value={maxDistance}
                  onChange={(e) => setMaxDistance(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Fee Amount ($ USD) *"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 50.00"
                  value={feeAmount}
                  onChange={(e) => setFeeAmount(e.target.value)}
                  required
                />

                <Input
                  label="Currency *"
                  placeholder="USD"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  required
                  disabled
                />
              </div>

              <Select
                label="Status *"
                value={isActive ? 'active' : 'inactive'}
                onChange={(e) => setIsActive(e.target.value === 'active')}
                options={[
                  { value: 'active', label: 'Active (Used for lookups)' },
                  { value: 'inactive', label: 'Inactive (Hidden)' }
                ]}
              />

              {/* Form Warning Alerts */}
              {formWarnings.length > 0 && (
                <div className="bg-hprh-gold/10 border border-hprh-gold/25 text-hprh-pine p-3.5 rounded text-[11px] space-y-1.5">
                  <div className="flex items-center gap-1.5 font-mono font-bold uppercase text-[9px] text-hprh-gold">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Configuration Warnings</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 font-medium">
                    {formWarnings.map((warning, idx) => (
                      <li key={idx} className="leading-snug">{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

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
                  disabled={submitting}
                  className="font-semibold"
                >
                  {submitting ? 'Saving...' : editingId ? 'Update Tier' : 'Save Tier'}
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
            <Truck className={`w-5 h-5 flex-shrink-0 ${
              notification.type === 'success' ? 'text-hprh-sage' : notification.type === 'warning' ? 'text-hprh-gold' : 'text-hprh-clay'
            }`} />
            <div className="flex-grow space-y-1">
              <span className="font-mono uppercase font-bold block">
                {notification.type === 'success' ? 'Settings Saved' : notification.type === 'warning' ? 'Settings Warning' : 'Settings Error'}
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

export default AdminTransportSettings;
