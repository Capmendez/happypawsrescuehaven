import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useStaffAuth } from '../../hooks/useStaffAuth';

interface RequireStaffProps {
  children: React.ReactNode;
}

/**
 * Route guard component that restricts access to authenticated Staff users.
 * Redirects unauthorized requests to the Admin Login page while saving intent.
 */
export const RequireStaff: React.FC<RequireStaffProps> = ({ children }) => {
  const { isStaff, loading } = useStaffAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-hprh-paper flex flex-col items-center justify-center p-4">
        {/* Spinner using HPRH brand colors */}
        <div className="w-10 h-10 border-4 border-hprh-sage/30 border-t-hprh-clay rounded-full animate-spin mb-4"></div>
        <p className="text-xs tracking-wider text-hprh-sage uppercase font-semibold">Verifying Staff Credentials...</p>
      </div>
    );
  }

  if (!isStaff) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default RequireStaff;
