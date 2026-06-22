import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import supabase from '../../lib/supabase';
import type { Pet } from '../../lib/types';
import Container from '../../components/ui/Container';
import Badge from '../../components/ui/Badge';
import { Filter, Search, Rabbit } from 'lucide-react';

export const Adopt: React.FC = () => {
  const [pets, setPets] = useState<Pet[]>([]);
  const [filteredPets, setFilteredPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [speciesFilter, setSpeciesFilter] = useState('all');
  const [sizeFilter, setSizeFilter] = useState('all');
  const [ageFilter, setAgeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchPets = async () => {
      try {
        setLoading(true);
        // Only fetch available pets from database
        const { data, error: dbError } = await supabase
          .from('pets')
          .select('*')
          .eq('status', 'AVAILABLE')
          .order('created_at', { ascending: false });

        if (dbError) throw dbError;
        setPets(data || []);
      } catch (err: any) {
        console.error('Error fetching pets:', err);
        setError(err.message || 'Failed to retrieve available pets.');
      } finally {
        setLoading(false);
      }
    };

    fetchPets();
  }, []);

  // Filter Logic
  useEffect(() => {
    let result = [...pets];

    // Filter by Species
    if (speciesFilter !== 'all') {
      result = result.filter(pet => {
        const petSpecies = (pet.species || '').toLowerCase();
        if (speciesFilter === 'pocket_pet') {
          return petSpecies === 'pocket_pet' || petSpecies === 'rabbit' || petSpecies === 'hamster' || petSpecies === 'guinea_pig';
        }
        if (speciesFilter === 'other') {
          return petSpecies !== 'dog' && petSpecies !== 'cat' && petSpecies !== 'pocket_pet' && petSpecies !== 'rabbit' && petSpecies !== 'hamster' && petSpecies !== 'guinea_pig';
        }
        return petSpecies === speciesFilter;
      });
    }

    // Filter by Size
    if (sizeFilter !== 'all') {
      result = result.filter(pet => (pet.size || '').toLowerCase() === sizeFilter);
    }

    // Filter by Age Range
    if (ageFilter !== 'all') {
      result = result.filter(pet => {
        const ageYears = pet.age_years;
        
        // Fallback age parsing if age_years is null
        let computedAgeYears = ageYears;
        if (computedAgeYears === null && pet.age) {
          const ageStr = pet.age.toLowerCase();
          if (ageStr.includes('month')) {
            const match = ageStr.match(/(\d+)/);
            if (match) computedAgeYears = parseInt(match[1], 10) / 12;
          } else if (ageStr.includes('year')) {
            const match = ageStr.match(/(\d+)/);
            if (match) computedAgeYears = parseInt(match[1], 10);
          }
        }

        if (computedAgeYears === null) return false;

        switch (ageFilter) {
          case 'puppy_kitten':
            return computedAgeYears < 1;
          case 'young':
            return computedAgeYears >= 1 && computedAgeYears <= 3;
          case 'adult':
            return computedAgeYears > 3 && computedAgeYears <= 8;
          case 'senior':
            return computedAgeYears > 8;
          default:
            return true;
        }
      });
    }

    // Filter by Search Query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      result = result.filter(pet => 
        (pet.name || '').toLowerCase().includes(query) ||
        (pet.breed || '').toLowerCase().includes(query) ||
        (pet.description || '').toLowerCase().includes(query)
      );
    }

    setFilteredPets(result);
  }, [pets, speciesFilter, sizeFilter, ageFilter, searchQuery]);

  return (
    <div className="py-12 md:py-20 bg-hprh-paper min-h-screen text-hprh-pine">
      <Container className="space-y-12">
        {/* Warm Page Header */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <span className="font-mono text-xs uppercase tracking-widest text-hprh-sage font-bold">
            Happy Paws Rescue Haven
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold font-display leading-tight">
            Meet Our Pets
          </h1>
          <p className="text-sm sm:text-base font-sans text-hprh-pine/70 leading-relaxed">
            Find your new best friend. Below you’ll find our active cases of loving animals awaiting a second chance. Each file represents a pet currently in foster care or rehabilitation.
          </p>
        </div>

        {/* Filters Desk Panel */}
        <div className="bg-hprh-paper-dark border-2 border-hprh-pine/10 rounded p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-hprh-sage/20"></div>
          
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-hprh-sage" />
            <span className="font-mono text-xs uppercase tracking-widest font-bold text-hprh-pine/70">
              Filter Case Files
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
            {/* Search Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-wider text-hprh-pine/60 font-bold font-mono">
                Search Name / Breed
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. Barnaby..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-hprh-paper border border-hprh-pine/15 focus:border-hprh-sage focus:ring-1 focus:ring-hprh-sage rounded pl-9 pr-3 py-2 text-sm text-hprh-pine placeholder-hprh-pine/30 focus:outline-none"
                />
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-hprh-pine/30" />
              </div>
            </div>

            {/* Species Select */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-wider text-hprh-pine/60 font-bold font-mono">
                Species
              </label>
              <select
                value={speciesFilter}
                onChange={(e) => setSpeciesFilter(e.target.value)}
                className="w-full bg-hprh-paper border border-hprh-pine/15 focus:border-hprh-sage focus:ring-1 focus:ring-hprh-sage rounded px-3 py-2 text-sm text-hprh-pine focus:outline-none"
              >
                <option value="all">All Species</option>
                <option value="dog">Dogs</option>
                <option value="cat">Cats</option>
                <option value="pocket_pet">Pocket Pets</option>
                <option value="other">Other Species</option>
              </select>
            </div>

            {/* Size Select */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-wider text-hprh-pine/60 font-bold font-mono">
                Size
              </label>
              <select
                value={sizeFilter}
                onChange={(e) => setSizeFilter(e.target.value)}
                className="w-full bg-hprh-paper border border-hprh-pine/15 focus:border-hprh-sage focus:ring-1 focus:ring-hprh-sage rounded px-3 py-2 text-sm text-hprh-pine focus:outline-none"
              >
                <option value="all">All Sizes</option>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
                <option value="extra_large">Extra Large</option>
              </select>
            </div>

            {/* Age Select */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-wider text-hprh-pine/60 font-bold font-mono">
                Age Group
              </label>
              <select
                value={ageFilter}
                onChange={(e) => setAgeFilter(e.target.value)}
                className="w-full bg-hprh-paper border border-hprh-pine/15 focus:border-hprh-sage focus:ring-1 focus:ring-hprh-sage rounded px-3 py-2 text-sm text-hprh-pine focus:outline-none"
              >
                <option value="all">All Ages</option>
                <option value="puppy_kitten">Puppy / Kitten (&lt;1 year)</option>
                <option value="young">Young (1-3 years)</option>
                <option value="adult">Adult (3-8 years)</option>
                <option value="senior">Senior (8+ years)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading Skeleton Grid */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-hprh-paper-dark/30 border border-hprh-pine/10 rounded p-5 relative overflow-hidden animate-pulse flex flex-col h-[380px]"
              >
                <div className="aspect-square bg-hprh-paper-dark border border-hprh-pine/5 rounded mb-4 w-full"></div>
                <div className="h-4 bg-hprh-paper-dark rounded w-1/3 mb-3"></div>
                <div className="h-3 bg-hprh-paper-dark rounded w-2/3 mb-2"></div>
                <div className="h-3 bg-hprh-paper-dark rounded w-1/2 mt-auto"></div>
              </div>
            ))}
          </div>
        )}

        {/* Database / Connection Error */}
        {!loading && error && (
          <div className="text-center py-12 bg-hprh-clay/5 border border-hprh-clay/20 rounded p-6 max-w-xl mx-auto space-y-3">
            <span className="font-mono text-xs uppercase tracking-widest text-hprh-clay font-bold block">
              System Error
            </span>
            <p className="text-sm leading-relaxed">{error}</p>
            <p className="text-xs text-hprh-pine/50">Please verify connection or try again later.</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredPets.length === 0 && (
          <div className="text-center py-16 border-2 border-dashed border-hprh-pine/10 rounded-lg max-w-xl mx-auto space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-hprh-paper-dark flex items-center justify-center text-hprh-pine/30">
              <Rabbit className="w-6 h-6" />
            </div>
            <h3 className="font-display text-xl font-bold text-hprh-pine/90">No Matching Case Files</h3>
            <p className="text-sm text-hprh-pine/60 max-w-md mx-auto leading-relaxed">
              No pets match these filters right now — check back soon! Our team is regularly updating case files as new animals are brought in.
            </p>
            <button
              onClick={() => {
                setSpeciesFilter('all');
                setSizeFilter('all');
                setAgeFilter('all');
                setSearchQuery('');
              }}
              className="font-mono text-xs uppercase tracking-wider text-hprh-sage hover:underline underline-offset-4"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Pets Grid */}
        {!loading && !error && filteredPets.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPets.map((pet) => {
              const primaryPhoto = (pet.photos && pet.photos.length > 0) ? pet.photos[0] : pet.photo_url;
              
              // Age Fallback Display
              const petAge = pet.age_years !== null && pet.age_years !== undefined
                ? `${pet.age_years} ${pet.age_years === 1 ? 'year' : 'years'}`
                : (pet.age || 'N/A');
                
              // Sex Fallback Display
              const petSex = pet.sex || pet.gender || 'Unknown';
              
              // Size Formatting
              const petSize = pet.size 
                ? pet.size.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
                : 'Unknown';

              return (
                <Link
                  key={pet.id}
                  to={`/adopt/${pet.id}`}
                  className="bg-hprh-paper-dark border border-hprh-pine/10 hover:border-hprh-sage/40 transition-all duration-300 rounded shadow-sm hover:shadow-md p-4 relative overflow-hidden flex flex-col group"
                >
                  {/* Subtle top accent folder tab */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-hprh-pine/5 group-hover:bg-hprh-sage/30 transition-colors"></div>

                  {/* Polaroid Frame */}
                  <div className="aspect-square bg-white p-2.5 border border-hprh-pine/5 shadow-sm relative mb-4 overflow-hidden rotate-[1deg] group-hover:rotate-0 transition-transform duration-300">
                    <div className="w-full h-full bg-hprh-paper overflow-hidden relative border border-hprh-pine/5">
                      {primaryPhoto ? (
                        <img
                          src={primaryPhoto}
                          alt={pet.name}
                          className="w-full h-full object-cover filter contrast-[1.02]"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-hprh-pine/30 p-4 text-center">
                          <span className="font-mono text-[9px] uppercase tracking-wider">No Photo</span>
                        </div>
                      )}
                    </div>
                    {/* AVAILABLE Stamp Overlay */}
                    <div className="absolute top-4 right-4">
                      <Badge status="AVAILABLE" className="text-[9px] px-2 py-0.5" />
                    </div>
                  </div>

                  {/* Case File Metadata */}
                  <div className="flex-grow flex flex-col justify-between space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-display text-xl font-bold group-hover:text-hprh-sage transition-colors">
                          {pet.name}
                        </h3>
                        <span className="font-mono text-[9px] bg-hprh-pine/5 px-2 py-0.5 rounded text-hprh-pine/50 border border-hprh-pine/10">
                          {pet.case_number}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-hprh-pine/50 font-mono italic">
                        {pet.breed || 'Mixed Breed'}
                      </p>
                    </div>

                    {/* Typewriter table style details */}
                    <div className="grid grid-cols-3 gap-2 border-t border-b border-dashed border-hprh-pine/15 py-2.5 font-mono text-[10px] text-hprh-pine/70">
                      <div>
                        <span className="block text-[8px] text-hprh-pine/40 uppercase tracking-widest">Age</span>
                        <span className="font-bold truncate block">{petAge}</span>
                      </div>
                      <div>
                        <span className="block text-[8px] text-hprh-pine/40 uppercase tracking-widest">Sex</span>
                        <span className="font-bold capitalize block">{petSex}</span>
                      </div>
                      <div>
                        <span className="block text-[8px] text-hprh-pine/40 uppercase tracking-widest">Size</span>
                        <span className="font-bold block">{petSize}</span>
                      </div>
                    </div>

                    {/* Card CTA Footer */}
                    <div className="flex items-center justify-between text-hprh-sage font-mono text-[10px] uppercase tracking-widest font-bold pt-2">
                      <span>View Case File</span>
                      <span className="transform translate-x-0 group-hover:translate-x-1.5 transition-transform duration-200">
                        &rarr;
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Container>
    </div>
  );
};

export default Adopt;
