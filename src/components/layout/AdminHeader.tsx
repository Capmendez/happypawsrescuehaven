import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { LogOut, LayoutDashboard, ClipboardList, FolderHeart, Building2, FileCheck, Truck, MapPin } from 'lucide-react';

/**
2. Admin Header / Navigation panel specifically for the Staff Portal.
*/
export const AdminHeader: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/admin/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const navItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/applications', label: 'Applications Queue', icon: ClipboardList },
    { path: '/admin/pets', label: 'Pet Inventory', icon: FolderHeart },
    { path: '/admin/payment-methods', label: 'Payment Methods', icon: Building2 },
    { path: '/admin/payment-proofs', label: 'Payment Proofs', icon: FileCheck },
    { path: '/admin/transport-updates', label: 'Transport Updates', icon: MapPin },
    { path: '/admin/transport-settings', label: 'Transport Settings', icon: Truck },
  ];

  const getLinkClass = (path: string) => {
    const isActive = location.pathname === path || (path !== '/admin/dashboard' && location.pathname.startsWith(path));
    return isActive
      ? 'bg-hprh-pine text-hprh-paper font-bold'
      : 'text-hprh-pine/70 hover:text-hprh-sage hover:bg-hprh-pine/5';
  };

  return (
    <header className="bg-hprh-paper-dark border-b border-hprh-pine/15 sticky top-20 z-40 shadow-sm select-none font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 gap-3">
          
          {/* Logo / Staff Badge */}
          <div className="flex items-center gap-2">
            <span className="font-display font-black text-sm sm:text-base tracking-wider text-hprh-pine">
              HPRH Staff Portal
            </span>
            <span className="font-mono text-[9px] uppercase tracking-widest text-hprh-clay font-bold bg-hprh-clay/10 border border-hprh-clay/20 px-2 py-0.5 rounded">
              RESTRICTED ACCESS
            </span>
          </div>

          {/* Navigation & Logout */}
          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 flex-grow sm:flex-grow-0">
            <nav className="flex items-center gap-1.5">
              {navItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-mono font-semibold uppercase tracking-wider px-3 py-2 rounded transition-all duration-200 ${getLinkClass(
                      item.path
                    )}`}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider text-hprh-clay hover:bg-hprh-clay/10 border border-hprh-clay/25 px-3.5 py-2 rounded transition-all duration-200"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
