import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { Pet } from '../../lib/types';
import Container from '../../components/ui/Container';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  ShieldAlert,
  Loader2
} from 'lucide-react';

export const AdminPets: React.FC = () => {
  const navigate = useNavigate();
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchPets = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: dbError } = await supabase
        .from('pets')
        .select('*')
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;
      setPets(data || []);
    } catch (err: any) {
      console.error('Error fetching pets:', err);
      setError(err.message || 'Failed to retrieve pet inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPets();
  }, []);

  const handleDelete = async (pet: Pet) => {
    try {
      // 1. Check for associated applications
      const { count: appCount, error: appCountError } = await supabase
        .from('adoption_applications')
        .select('id', { count: 'exact', head: true })
        .eq('pet_id', pet.id);

      if (appCountError) throw appCountError;

      // 2. Check for associated adoptions
      const { count: adoptCount, error: adoptCountError } = await supabase
        .from('adoptions')
        .select('id', { count: 'exact', head: true })
        .eq('pet_id', pet.id);

      if (adoptCountError) throw adoptCountError;

      const hasApplications = appCount && appCount > 0;
      const hasAdoptions = adoptCount && adoptCount > 0;

      if (hasAdoptions) {
        // Hard-delete is blocked due to foreign key references (RESTRICT on adoptions)
        const confirmSoft = window.confirm(
          `Hard delete is blocked for "${pet.name}" because there is an adoption record linked to this pet file.\n\nWould you like to change their status to "NOT_LISTED" instead? This hides the pet from the public site while preserving transaction records.`
        );

        if (confirmSoft) {
          const { error: updateError } = await supabase
            .from('pets')
            .update({ status: 'NOT_LISTED' })
            .eq('id', pet.id);

          if (updateError) throw updateError;
          alert(`"${pet.name}" status updated to "NOT_LISTED".`);
          fetchPets();
        }
      } else if (hasApplications) {
        // Hard-delete is blocked due to foreign key references (RESTRICT on applications)
        const confirmSoft = window.confirm(
          `Hard delete is blocked for "${pet.name}" because there are ${appCount} active adoption application(s) linked to this pet file.\n\nWould you like to change their status to "NOT_LISTED" instead? This hides the pet from the public site while preserving application records.`
        );

        if (confirmSoft) {
          const { error: updateError } = await supabase
            .from('pets')
            .update({ status: 'NOT_LISTED' })
            .eq('id', pet.id);

          if (updateError) throw updateError;
          alert(`"${pet.name}" status updated to "NOT_LISTED".`);
          fetchPets();
        }
      } else {
        // Safe to hard delete
        const confirmHard = window.confirm(
          `Are you sure you want to permanently delete the case file for "${pet.name}" (Case: ${pet.case_number})?\nThis action cannot be undone.`
        );

        if (confirmHard) {
          const { error: deleteError } = await supabase
            .from('pets')
            .delete()
            .eq('id', pet.id);

          if (deleteError) throw deleteError;
          alert(`Case record for "${pet.name}" has been permanently deleted.`);
          fetchPets();
        }
      }
    } catch (err: any) {
      console.error('Error in deletion flow:', err);
      alert('Action failed: ' + (err.message || 'Error executing delete command.'));
    }
  };

  // Filter logic
  const filteredPets = pets.filter((pet) => {
    // Search filter
    const matchesSearch = 
      pet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (pet.breed || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      pet.case_number.toLowerCase().includes(searchQuery.toLowerCase());

    // Species filter
    const matchesSpecies = 
      speciesFilter === 'all' || 
      (pet.species || '').toLowerCase() === speciesFilter.toLowerCase();

    // Status filter
    const matchesStatus = 
      statusFilter === 'all' || 
      pet.status === statusFilter;

    return matchesSearch && matchesSpecies && matchesStatus;
  });

  if (loading && pets.length === 0) {
    return (
      <div className="py-20 bg-hprh-paper min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-hprh-sage" />
        <p className="font-mono text-xs uppercase tracking-widest text-hprh-pine/50">Loading Intake Database...</p>
      </div>
    );
  }

  return (
    <div className="py-12 bg-hprh-paper text-hprh-pine font-sans min-h-screen">
      <Container className="space-y-8">
        
        {/* Header Controls */}
        <div className="border-b-2 border-dashed border-hprh-pine/20 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-hprh-sage font-bold block mb-1">
              Case Records
            </span>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-hprh-pine">
              Kennel Inventory
            </h1>
            <p className="text-xs text-hprh-pine/50 mt-1">
              Browse, register, or retire kennel case profiles.
            </p>
          </div>
          
          <Button
            variant="primary"
            onClick={() => navigate('/admin/pets/new')}
            className="inline-flex items-center gap-1.5 self-start sm:self-center"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Pet</span>
          </Button>
        </div>

        {error && (
          <div className="bg-hprh-clay/10 border border-hprh-clay/20 text-hprh-pine p-4 rounded text-xs flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-hprh-clay flex-shrink-0" />
            <div className="space-y-1">
              <span className="font-mono uppercase font-bold text-hprh-clay block">Database Fetch Fault</span>
              <p className="leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Filter Desk Controls */}
        <div className="bg-hprh-paper-dark border border-hprh-pine/15 rounded p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-end gap-4 select-none">
          <div className="flex-grow w-full sm:w-auto">
            <label className="text-[10px] uppercase font-mono tracking-wider text-hprh-pine/50 font-bold block mb-1">
              Search Inventory
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search name, breed, or case ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-hprh-paper border border-hprh-pine/15 focus:border-hprh-sage focus:ring-1 focus:ring-hprh-sage rounded pl-9 pr-3 py-2 text-xs text-hprh-pine placeholder-hprh-pine/30 focus:outline-none"
              />
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-hprh-pine/30" />
            </div>
          </div>

          <div className="w-full sm:w-44">
            <label className="text-[10px] uppercase font-mono tracking-wider text-hprh-pine/50 font-bold block mb-1">
              Species
            </label>
            <select
              value={speciesFilter}
              onChange={(e) => setSpeciesFilter(e.target.value)}
              className="w-full bg-hprh-paper border border-hprh-pine/15 focus:border-hprh-sage focus:ring-1 focus:ring-hprh-sage rounded px-3 py-2 text-xs text-hprh-pine focus:outline-none"
            >
              <option value="all">All Species</option>
              <option value="dog">Dogs</option>
              <option value="cat">Cats</option>
              <option value="rabbit">Rabbits</option>
              <option value="pocket_pet">Pocket Pets</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="w-full sm:w-44">
            <label className="text-[10px] uppercase font-mono tracking-wider text-hprh-pine/50 font-bold block mb-1">
              Status Badge
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-hprh-paper border border-hprh-pine/15 focus:border-hprh-sage focus:ring-1 focus:ring-hprh-sage rounded px-3 py-2 text-xs text-hprh-pine focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="AVAILABLE">AVAILABLE</option>
              <option value="PENDING">PENDING</option>
              <option value="ADOPTED">ADOPTED</option>
              <option value="MEDICAL_HOLD">MEDICAL_HOLD</option>
              <option value="NOT_LISTED">NOT_LISTED</option>
            </select>
          </div>
        </div>

        {/* Inventory List */}
        {filteredPets.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-hprh-pine/15 bg-hprh-paper-dark/30 rounded-lg space-y-3">
            <h3 className="font-display text-xl font-bold text-hprh-pine/70">No Pets Found</h3>
            <p className="text-xs text-hprh-pine/50 max-w-sm mx-auto leading-relaxed">
              No registered kennel profiles match your current queries.
            </p>
          </div>
        ) : (
          <div className="bg-hprh-paper-dark border border-hprh-pine/15 rounded overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-sans text-xs">
                <thead>
                  <tr className="bg-hprh-pine/5 border-b border-hprh-pine/15 text-hprh-pine/60 font-mono text-[9px] uppercase tracking-wider select-none">
                    <th className="py-3 px-4 w-16">Photo</th>
                    <th className="py-3 px-4">Case Details</th>
                    <th className="py-3 px-4">Species & Breed</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hprh-pine/10">
                  {filteredPets.map((pet) => {
                    const primaryPhoto = (pet.photos && pet.photos.length > 0) ? pet.photos[0] : pet.photo_url;
                    
                    return (
                      <tr key={pet.id} className="hover:bg-hprh-pine/5 transition-colors">
                        {/* Thumbnail */}
                        <td className="py-3.5 px-4">
                          <div className="w-10 h-10 bg-white border border-hprh-pine/10 rounded overflow-hidden shadow-sm flex items-center justify-center p-0.5">
                            {primaryPhoto ? (
                              <img src={primaryPhoto} alt={pet.name} className="w-full h-full object-cover rounded-sm" />
                            ) : (
                              <span className="font-mono text-[8px] text-hprh-pine/30">N/A</span>
                            )}
                          </div>
                        </td>

                        {/* Name & Case Number */}
                        <td className="py-3.5 px-4 font-sans">
                          <div className="font-bold text-sm text-hprh-pine leading-tight">{pet.name}</div>
                          <div className="font-mono text-[9px] text-hprh-pine/40 tracking-wider mt-0.5">{pet.case_number}</div>
                        </td>

                        {/* Species & Breed */}
                        <td className="py-3.5 px-4">
                          <div className="font-mono text-[9px] uppercase tracking-wider text-hprh-sage font-bold">{pet.species}</div>
                          <div className="text-hprh-pine/80 truncate max-w-xs">{pet.breed || 'Mixed Breed'}</div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4">
                          <Badge status={pet.status} className="text-[9px] px-2 py-0.5" />
                        </td>

                        {/* Action buttons */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => navigate(`/admin/pets/${pet.id}/edit`)}
                              className="p-1.5 border border-hprh-pine/15 rounded bg-hprh-paper hover:bg-hprh-pine/5 text-hprh-sage hover:border-hprh-sage/40 transition-colors"
                              title="Edit Case"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleDelete(pet)}
                              className="p-1.5 border border-hprh-pine/15 rounded bg-hprh-paper hover:bg-hprh-clay/10 text-hprh-clay hover:border-hprh-clay/40 transition-colors"
                              title="Delete Case"
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

      </Container>
    </div>
  );
};

export default AdminPets;
