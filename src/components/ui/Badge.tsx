import React from 'react';

interface BadgeProps {
  status: string;
  className?: string;
}

/**
 * Custom StatusTag / Badge primitive representing a hand-stamped label.
 * Rotated slightly, double/thick bordered, and styled with ink-like colors.
 */
export const Badge: React.FC<BadgeProps> = ({ status, className = '' }) => {
  const normalizedStatus = status.toUpperCase().trim();

  const baseStyle = 'inline-block font-display text-[10px] sm:text-xs font-bold uppercase tracking-widest px-3 py-1 border-2 rounded-sm select-none transition-transform duration-300';
  
  let statusStyle = '';
  let rotateStyle = 'rotate-[-1.5deg]'; // Default slight rotation

  // Group status mappings:
  
  // 1. Gold for Available and Pending/Action-needed
  const goldStatuses = [
    'AVAILABLE',
    'PENDING',
    'PENDING_REVIEW',
    'SUBMITTED',
    'ASSIGNED',
    'DEPOSIT_PENDING',
    'PREPARING',
    'PENDING AUDIT'
  ];

  // 2. Sage for Success, Paid, Done, Approved
  const sageStatuses = [
    'APPROVED',
    'CONFIRMED',
    'PAID',
    'DELIVERED',
    'ACTIVE',
    'CLEARED',
    'SHIPPED',
    'EN_ROUTE',
    'ARRIVED_AT_HUB',
    'OUT_FOR_DELIVERY',
    'YES'
  ];

  // 3. Clay for Attention Needed, Hold, Cancelled, Adopted, Rejected
  const clayStatuses = [
    'REJECTED',
    'CANCELLED',
    'ON_HOLD',
    'MEDICAL_HOLD',
    'ADOPTED',
    'NO'
  ];

  if (goldStatuses.includes(normalizedStatus)) {
    statusStyle = 'text-hprh-gold border-hprh-gold/60 bg-hprh-gold/5';
    rotateStyle = 'rotate-[1.5deg]';
  } else if (sageStatuses.includes(normalizedStatus)) {
    statusStyle = 'text-hprh-sage border-hprh-sage/60 bg-hprh-sage/5';
    rotateStyle = 'rotate-[-1deg]';
  } else if (clayStatuses.includes(normalizedStatus)) {
    statusStyle = 'text-hprh-clay border-hprh-clay/60 bg-hprh-clay/5';
    rotateStyle = 'rotate-[-2deg]';
  } else if (normalizedStatus === 'NOT_LISTED' || normalizedStatus === 'INACTIVE' || normalizedStatus === 'IN_FOSTER') {
    statusStyle = 'text-hprh-pine/60 border-hprh-pine/35 bg-hprh-pine/5';
    rotateStyle = 'rotate-[0.5deg]';
  } else {
    // Fallback: informational neutral
    statusStyle = 'text-hprh-pine/60 border-hprh-pine/30 bg-hprh-pine/5';
  }

  return (
    <span className={`${baseStyle} ${statusStyle} ${rotateStyle} ${className}`}>
      {status}
    </span>
  );
};

export default Badge;
