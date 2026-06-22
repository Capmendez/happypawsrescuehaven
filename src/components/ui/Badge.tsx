import React from 'react';

interface BadgeProps {
  status: 'AVAILABLE' | 'PENDING' | 'ADOPTED' | string;
  className?: string;
}

/**
 * Custom StatusTag / Badge primitive representing a hand-stamped label.
 * Rotated slightly, double/thick bordered, and styled with ink-like colors.
 */
export const Badge: React.FC<BadgeProps> = ({ status, className = '' }) => {
  const normalizedStatus = status.toUpperCase();

  const baseStyle = 'inline-block font-display text-[10px] sm:text-xs font-bold uppercase tracking-widest px-3 py-1 border-2 rounded-sm select-none transition-transform duration-300';
  
  let statusStyle = '';
  let rotateStyle = 'rotate-[-1.5deg]'; // Default slight rotation

  if (normalizedStatus === 'AVAILABLE') {
    // Available uses HPRH gold ONLY
    statusStyle = 'text-hprh-gold border-hprh-gold/60 bg-hprh-gold/5';
    rotateStyle = 'rotate-[1.5deg]';
  } else if (normalizedStatus === 'PENDING') {
    statusStyle = 'text-hprh-sage border-hprh-sage/60 bg-hprh-sage/5';
    rotateStyle = 'rotate-[-1deg]';
  } else if (normalizedStatus === 'ADOPTED') {
    statusStyle = 'text-hprh-clay border-hprh-clay/60 bg-hprh-clay/5';
    rotateStyle = 'rotate-[-2deg]';
  } else if (normalizedStatus === 'MEDICAL_HOLD') {
    statusStyle = 'text-hprh-clay border-hprh-clay/60 bg-hprh-clay/5';
    rotateStyle = 'rotate-[1.5deg]';
  } else if (normalizedStatus === 'NOT_LISTED') {
    statusStyle = 'text-hprh-pine/60 border-hprh-pine/35 bg-hprh-pine/5';
    rotateStyle = 'rotate-[0.5deg]';
  } else {
    statusStyle = 'text-hprh-pine/60 border-hprh-pine/30 bg-hprh-pine/5';
  }

  return (
    <span className={`${baseStyle} ${statusStyle} ${rotateStyle} ${className}`}>
      {status}
    </span>
  );
};

export default Badge;
