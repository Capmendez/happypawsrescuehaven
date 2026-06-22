import React from 'react';
import AdminHeader from './AdminHeader';

interface AdminLayoutProps {
  children: React.ReactNode;
}

/**
 * Layout wrapper for authenticated admin views.
 * Renders the persistent AdminHeader navigation/logout bar at the top of pages.
 */
export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  return (
    <div className="flex-grow flex flex-col bg-hprh-paper">
      <AdminHeader />
      <div className="flex-grow pb-16">
        {children}
      </div>
    </div>
  );
};

export default AdminLayout;
