import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import supabase from '../../lib/supabase';
import type { Pet } from '../../lib/types';
import Container from '../../components/ui/Container';
import Badge from '../../components/ui/Badge';
import { 
  ArrowLeft, 
  MapPin, 
  DollarSign, 
  Check, 
  ShieldAlert,
  Calendar,
  Heart,
  Baby,
  Users,
  AlertCircle
} from 'lucide-react';

export const PetDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePhoto, setActivePhoto] = useState<string>('');

  useEffect(() => {
    const fetchPetDetails = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const { data, error: dbError } = await supabase
          .from('pets')
          .select('*')
          .eq('id', id)
          .single();

        if (dbError) throw dbError;
        setPet(data);
        
        // Initialize active photo
        if (data) {
          const primary = (data.photos && data.photos.length > 0) ? data.photos[0] : data.photo_url;
          setActivePhoto(primary || '');
        }
      } catch (err: any) {
        console.error('Error fetching pet details:', err);
        setError(err.message || 'Pet record not found.');
      } finally {
        setLoading(false);
      }
    };

    fetchPetDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="py-20 bg-hprh-paper min-h-screen flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 border-4 border-hprh-sage border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="font-mono text-xs uppercase tracking-widest text-hprh-pine/50">Retrieving Case File...</p>
        </div>
      </div>
    );
  }

  if (error || !pet) {
    return (
      <div className="py-20 bg-hprh-paper min-h-screen flex items-center">
        <Container className="max-w-md mx-auto text-center space-y-6">
          <div className="inline-flex p-4 bg-hprh-clay/10 text-hprh-clay rounded-full">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="font-display text-2xl font-bold text-hprh-pine">Case File Archive Error</h2>
          <p className="text-sm text-hprh-pine/60 leading-relaxed">
            The requested kennel record could not be found or retrieved. It may have been archived or deleted.
          </p>
          <Link
            to="/adopt"
            className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest font-bold text-hprh-sage hover:underline"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Browse
          </Link>
        </Container>
      </div>
    );
  }

  // Setup Fallback Values
  const petAge = pet.age_years !== null && pet.age_years !== undefined
    ? `${pet.age_years} ${pet.age_years === 1 ? 'year' : 'years'}`
    : (pet.age || 'N/A');
    
  const petSex = pet.sex || pet.gender || 'Unknown';
  const petSize = pet.size 
    ? pet.size.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
    : 'Unknown';
    
  const intakeDateFormatted = new Date(pet.intake_date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="py-12 md:py-20 bg-hprh-paper min-h-screen text-hprh-pine">
      <Container className="max-w-4xl space-y-8">
        {/* Back Link */}
        <div>
          <Link
            to="/adopt"
            className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest font-bold text-hprh-sage hover:text-hprh-sage/80 transition-colors"
          >
            <ArrowLeft className="w-4.5 h-4.5" /> Back to Case Catalog
          </Link>
        </div>

        {/* Signature Case File Folder */}
        <div
          className="bg-hprh-paper-dark border-2 border-hprh-pine/20 rounded shadow-lg p-6 md:p-8 relative overflow-hidden"
          style={{
            backgroundImage: 'radial-gradient(#1f2a1e05 1px, transparent 0)',
            backgroundSize: '16px 16px',
          }}
        >
          {/* Top accent line */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-hprh-sage/40"></div>

          {/* Case Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-dashed border-hprh-pine/20 pb-5 mb-6 gap-3">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs uppercase tracking-widest text-hprh-pine/50">Case File:</span>
              <span className="font-mono text-sm font-bold tracking-widest text-hprh-pine bg-hprh-pine/5 px-2.5 py-0.5 rounded border border-hprh-pine/10">
                {pet.case_number}
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs text-hprh-pine/70 uppercase tracking-wide">
              <Calendar className="w-4 h-4 text-hprh-sage" />
              <span>Intake Date:</span>
              <span className="font-bold underline decoration-hprh-sage/40 decoration-wavy">{intakeDateFormatted}</span>
            </div>
          </div>

          {/* Main Dossier Content */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Gallery Column */}
            <div className="md:col-span-5 space-y-4">
              <div className="relative bg-white p-3 border border-hprh-pine/10 shadow-md rotate-[-1deg] hover:rotate-0 transition-transform duration-300">
                {/* Polaroid Main Image */}
                <div className="aspect-square bg-hprh-paper border border-hprh-pine/5 overflow-hidden relative mb-3">
                  {activePhoto ? (
                    <img
                      src={activePhoto}
                      alt={pet.name}
                      className="w-full h-full object-cover filter contrast-[1.03] sepia-[0.03]"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-hprh-paper-dark text-hprh-pine/30 p-4 text-center">
                      <span className="font-mono text-xs uppercase tracking-wider">No Photo Filed</span>
                    </div>
                  )}
                </div>

                {/* Stamped Status Badge */}
                <div className="absolute top-5 right-5">
                  <Badge status={pet.status} className="shadow-sm" />
                </div>

                <div className="text-center font-display text-xl font-bold text-hprh-pine/90 tracking-wide mt-2">
                  {pet.name}
                </div>
              </div>

              {/* Photo Thumbnails */}
              {pet.photos && pet.photos.length > 1 && (
                <div className="flex flex-wrap gap-2 justify-center">
                  {pet.photos.map((photo, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActivePhoto(photo)}
                      className={`w-12 h-12 rounded border overflow-hidden p-0.5 bg-white transition-all ${
                        activePhoto === photo 
                          ? 'border-hprh-sage shadow-md scale-105' 
                          : 'border-hprh-pine/10 hover:border-hprh-pine/30'
                      }`}
                    >
                      <img src={photo} alt={`${pet.name} thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details Column */}
            <div className="md:col-span-7 space-y-6">
              {/* Profile Data Table */}
              <div className="grid grid-cols-2 gap-y-4 gap-x-6 border border-hprh-pine/10 bg-hprh-paper/60 p-5 rounded font-mono text-xs">
                <div>
                  <span className="block text-[10px] text-hprh-pine/50 uppercase tracking-widest mb-0.5">Name</span>
                  <span className="font-display text-lg font-bold text-hprh-pine">{pet.name}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-hprh-pine/50 uppercase tracking-widest mb-0.5">Species</span>
                  <span className="font-bold uppercase text-hprh-sage text-sm">{pet.species}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-hprh-pine/50 uppercase tracking-widest mb-0.5">Breed</span>
                  <span className="font-semibold text-hprh-pine/90 text-sm truncate block">{pet.breed || 'Unknown'}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-hprh-pine/50 uppercase tracking-widest mb-0.5">Age</span>
                  <span className="font-semibold text-hprh-pine/90 text-sm block">{petAge}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-hprh-pine/50 uppercase tracking-widest mb-0.5">Sex</span>
                  <span className="font-semibold text-hprh-pine/90 text-sm capitalize block">{petSex}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-hprh-pine/50 uppercase tracking-widest mb-0.5">Size</span>
                  <span className="font-semibold text-hprh-pine/90 text-sm block">{petSize}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-hprh-pine/50 uppercase tracking-widest mb-0.5">Current Location</span>
                  <span className="font-semibold text-hprh-pine/90 text-sm truncate block flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-hprh-sage flex-shrink-0" />
                    {pet.current_location || 'Shelter Facility'}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-hprh-pine/50 uppercase tracking-widest mb-0.5">Adoption Fee</span>
                  <span className="font-bold text-hprh-clay text-sm flex items-center gap-0.5">
                    <DollarSign className="w-3.5 h-3.5" />
                    {pet.adoption_fee} {pet.currency || 'USD'}
                  </span>
                </div>
              </div>

              {/* Assessment / Foster Notes */}
              <div className="border border-hprh-pine/10 bg-[#faf8f3] p-5 rounded relative shadow-sm">
                <div className="absolute left-0 top-0 w-1.5 h-full bg-hprh-clay/35 rounded-l"></div>
                <h4 className="font-mono text-xs text-hprh-clay uppercase tracking-widest font-bold mb-2 pl-2">
                  Intake Assessment & Foster Notes:
                </h4>
                <p className="text-sm font-sans leading-relaxed text-hprh-pine/80 italic pl-2">
                  "{pet.foster_notes || pet.description || 'No special assessments registered for this pet.'}"
                </p>
              </div>

              {/* Temperament Checks (Only show if true) */}
              {(pet.good_with_kids || pet.good_with_dogs || pet.good_with_cats) && (
                <div className="space-y-2">
                  <h4 className="font-mono text-[10px] uppercase tracking-widest font-bold text-hprh-pine/50">
                    Temperament Assessment
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {pet.good_with_kids && (
                      <span className="inline-flex items-center gap-1.5 bg-hprh-sage/10 text-hprh-sage font-mono text-[10px] uppercase tracking-wider px-3 py-1 rounded border border-hprh-sage/20">
                        <Baby className="w-3.5 h-3.5" /> Good With Kids
                      </span>
                    )}
                    {pet.good_with_dogs && (
                      <span className="inline-flex items-center gap-1.5 bg-hprh-sage/10 text-hprh-sage font-mono text-[10px] uppercase tracking-wider px-3 py-1 rounded border border-hprh-sage/20">
                        <Users className="w-3.5 h-3.5" /> Good With Dogs
                      </span>
                    )}
                    {pet.good_with_cats && (
                      <span className="inline-flex items-center gap-1.5 bg-hprh-sage/10 text-hprh-sage font-mono text-[10px] uppercase tracking-wider px-3 py-1 rounded border border-hprh-sage/20">
                        <Heart className="w-3.5 h-3.5" /> Good With Cats
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Medical Assessment Checklist */}
              <div className="space-y-2">
                <h4 className="font-mono text-[10px] uppercase tracking-widest font-bold text-hprh-pine/50">
                  Medical Clearance Check
                </h4>
                <div className="grid grid-cols-3 gap-2 font-mono text-[10px] text-hprh-pine/80">
                  <div className="flex items-center gap-1.5">
                    <span className={`p-0.5 rounded-full ${pet.vaccinated ? 'bg-hprh-sage/20 text-hprh-sage' : 'bg-hprh-pine/5 text-hprh-pine/30'}`}>
                      <Check className="w-3.5 h-3.5" />
                    </span>
                    <span className={pet.vaccinated ? 'font-bold' : 'opacity-50'}>Vaccinated</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`p-0.5 rounded-full ${pet.spayed_neutered ? 'bg-hprh-sage/20 text-hprh-sage' : 'bg-hprh-pine/5 text-hprh-pine/30'}`}>
                      <Check className="w-3.5 h-3.5" />
                    </span>
                    <span className={pet.spayed_neutered ? 'font-bold' : 'opacity-50'}>Spayed/Neutered</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`p-0.5 rounded-full ${pet.microchipped ? 'bg-hprh-sage/20 text-hprh-sage' : 'bg-hprh-pine/5 text-hprh-pine/30'}`}>
                      <Check className="w-3.5 h-3.5" />
                    </span>
                    <span className={pet.microchipped ? 'font-bold' : 'opacity-50'}>Microchipped</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Requirements Section & Action CTA */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
          {/* Boilerplate Adoption Requirements */}
          <div className="md:col-span-7 bg-hprh-paper-dark border border-hprh-pine/10 p-6 rounded space-y-4">
            <h3 className="font-display text-lg font-bold text-hprh-pine">Adoption Requirements</h3>
            <ul className="space-y-2 text-xs text-hprh-pine/80 font-sans leading-relaxed list-disc pl-4">
              <li>Adopter must be at least 18 years of age and present a valid photo ID.</li>
              <li>Must provide proof of landlord approval if renting a house, apartment, or condo.</li>
              <li>A veterinary check is conducted for adopters with existing pets to verify current vaccinations.</li>
              <li>Must agree to a follow-up home screening post-adoption to check pet integration.</li>
              <li>Adoption contract must be signed, and the stated fee paid upon application approval.</li>
            </ul>
          </div>

          {/* Action CTA Panel */}
          <div className="md:col-span-5 bg-hprh-paper-dark border-2 border-hprh-pine/20 rounded p-6 flex flex-col justify-center text-center space-y-4">
            <div className="space-y-1">
              <span className="font-mono text-[9px] uppercase tracking-widest text-hprh-pine/40 font-bold block">
                Case Status Actions
              </span>
              <p className="text-xs text-hprh-pine/70 leading-relaxed font-sans">
                Submitting an application registers your interest with our staff. Applications are reviewed in order of submission.
              </p>
            </div>

            {/* Dynamic Buttons depending on status */}
            {pet.status.toUpperCase() === 'AVAILABLE' ? (
              <Link
                to={`/adopt/${pet.id}/apply`}
                className="w-full bg-hprh-clay text-hprh-paper hover:bg-hprh-clay/95 text-xs font-mono font-bold py-3.5 px-6 rounded uppercase tracking-wider block transition-colors text-center active:scale-[0.98]"
              >
                Apply to Adopt {pet.name}
              </Link>
            ) : pet.status.toUpperCase() === 'PENDING' ? (
              <div className="space-y-3">
                <button
                  disabled
                  className="w-full bg-hprh-sage/35 text-hprh-pine/50 border-2 border-dashed border-hprh-sage/50 text-xs font-mono font-bold py-3.5 px-6 rounded uppercase tracking-wider block cursor-not-allowed text-center"
                >
                  Application Pending
                </button>
                <div className="inline-flex items-center gap-1.5 text-[10px] font-mono text-hprh-sage uppercase tracking-wider font-bold">
                  <ShieldAlert className="w-3.5 h-3.5" /> Under Active Review
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  disabled
                  className="w-full bg-hprh-pine/10 text-hprh-pine/40 border-2 border-dashed border-hprh-pine/20 text-xs font-mono font-bold py-3.5 px-6 rounded uppercase tracking-wider block cursor-not-allowed text-center"
                >
                  Adopted Case File
                </button>
                <p className="text-[10px] font-mono text-hprh-clay uppercase tracking-wider font-bold">
                  This pet has found their home!
                </p>
              </div>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
};

export default PetDetail;
