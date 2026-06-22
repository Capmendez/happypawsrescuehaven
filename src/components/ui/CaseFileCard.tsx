import React from 'react';
import Badge from './Badge';
import type { Pet } from '../../lib/types';

interface CaseFileCardProps {
  pet: Pet;
  className?: string;
}

/**
 * Signature Kennel Case File Card.
 * Uses a grid background pattern, physical polaroid photograph aesthetics,
 * rubber stamp tags, typewriter-like metadata tables, and intake descriptions.
 */
export const CaseFileCard: React.FC<CaseFileCardProps> = ({ pet, className = '' }) => {
  // Format intake date
  const formattedDate = new Date(pet.intake_date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      className={`bg-hprh-paper-dark border-2 border-hprh-pine/20 rounded shadow-md p-6 relative overflow-hidden font-sans text-hprh-pine ${className}`}
      style={{
        backgroundImage: 'radial-gradient(#1f2a1e05 1px, transparent 0)',
        backgroundSize: '16px 16px',
      }}
    >
      {/* Decorative Folder Accent Tab */}
      <div className="absolute top-0 left-0 w-full h-1 bg-hprh-sage/40"></div>
      
      {/* Case Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-dashed border-hprh-pine/20 pb-4 mb-4 gap-2">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-hprh-pine/50">Case File:</span>
          <span className="font-mono text-xs font-bold tracking-widest text-hprh-pine bg-hprh-pine/5 px-2 py-0.5 rounded border border-hprh-pine/10">
            {pet.case_number}
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] text-hprh-pine/70 uppercase tracking-wide">
          <span>Intake Date:</span>
          <span className="font-semibold underline decoration-hprh-sage/40 decoration-wavy">{formattedDate}</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        {/* Photo Column */}
        <div className="md:col-span-5 flex justify-center items-center">
          <div className="relative bg-white p-3 border border-hprh-pine/10 shadow-md rotate-[-1.5deg] hover:rotate-0 transition-transform duration-300 w-full max-w-[210px] sm:max-w-[240px]">
            {/* Polaroid Photo Frame */}
            <div className="aspect-square bg-hprh-paper border border-hprh-pine/5 overflow-hidden relative mb-2.5">
              {pet.photo_url ? (
                <img
                  src={pet.photo_url}
                  alt={pet.name}
                  className="w-full h-full object-cover filter contrast-[1.03] sepia-[0.03]"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-hprh-paper-dark text-hprh-pine/30 p-4 text-center">
                  <span className="font-mono text-[9px] uppercase tracking-wider">No Photo Filed</span>
                </div>
              )}
            </div>
            
            {/* Status stamp overlaying the polaroid */}
            <div className="absolute top-2 right-2">
              <Badge status={pet.status} />
            </div>
            
            <div className="text-center font-display text-base font-bold text-hprh-pine/90 tracking-wide mt-1">
              {pet.name}
            </div>
          </div>
        </div>

        {/* Details Column */}
        <div className="md:col-span-7 flex flex-col justify-between">
          <div>
            {/* Typewriter details list */}
            <div className="grid grid-cols-2 gap-y-3 gap-x-4 border border-hprh-pine/10 bg-hprh-paper/50 p-4 rounded mb-4 font-mono text-xs">
              <div>
                <span className="block text-[9px] text-hprh-pine/50 uppercase tracking-widest">Pet Name</span>
                <span className="font-display text-base font-bold text-hprh-pine">{pet.name}</span>
              </div>
              <div>
                <span className="block text-[9px] text-hprh-pine/50 uppercase tracking-widest">Species</span>
                <span className="font-semibold uppercase text-hprh-sage">{pet.species}</span>
              </div>
              <div>
                <span className="block text-[9px] text-hprh-pine/50 uppercase tracking-widest">Breed</span>
                <span className="font-semibold text-hprh-pine/90 truncate block">{pet.breed || 'Unknown'}</span>
              </div>
              <div>
                <span className="block text-[9px] text-hprh-pine/50 uppercase tracking-widest">Age / Gender</span>
                <span className="font-semibold text-hprh-pine/90">
                  {pet.age || 'N/A'} • {pet.gender || 'Unknown'}
                </span>
              </div>
            </div>

            {/* Description Notes Box */}
            <div className="border border-hprh-pine/10 bg-[#faf8f3] p-4 rounded-sm relative">
              {/* Card clipping line */}
              <div className="absolute left-0 top-0 w-1.5 h-full bg-hprh-clay/35 rounded-l-sm"></div>
              <h4 className="font-mono text-[9px] text-hprh-clay uppercase tracking-widest font-bold mb-1.5 pl-1.5">
                Intake Notes & Assessment:
              </h4>
              <p className="text-xs sm:text-sm font-sans leading-relaxed text-hprh-pine/80 italic pl-1.5">
                "{pet.description || 'No intake notes registered for this case.'}"
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaseFileCard;
