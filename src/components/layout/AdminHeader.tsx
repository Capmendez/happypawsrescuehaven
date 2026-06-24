import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  LogOut, 
  LayoutDashboard, 
  ClipboardList, 
  FolderHeart, 
  Building2, 
  FileCheck, 
  Truck, 
  MapPin, 
  Heart, 
  HeartHandshake,
  Menu,
  X
} from 'lucide-react';

/**
 * Admin Header / Navigation panel specifically for the Staff Portal.
 */
export const AdminHeader: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
    { path: '/admin/foster-applications', label: 'Foster Queue', icon: HeartHandshake },
    { path: '/admin/pets', label: 'Pet Inventory', icon: FolderHeart },
    { path: '/admin/payment-methods', label: 'Payment Methods', icon: Building2 },
    { path: '/admin/payment-proofs', label: 'Payment Proofs', icon: FileCheck },
    { path: '/admin/donations', label: 'Donations', icon: Heart },
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
        
        {/* Main Bar */}
        <div className="flex items-center justify-between py-3">
          {/* Logo / Staff Badge */}
          <div className="flex items-center gap-2">
            <span className="font-display font-black text-sm sm:text-base tracking-wider text-hprh-pine">
              HPRH Staff Portal
            </span>
            <span className="font-mono text-[9px] uppercase tracking-widest text-hprh-clay font-bold bg-hprh-clay/10 border border-hprh-clay/20 px-2 py-0.5 rounded">
              RESTRICTED
            </span>
          </div>

          {/* Toggle Menu Button (Mobile only) */}
          <div className="flex md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-hprh-pine/70 hover:text-hprh-pine p-1.5 border border-hprh-pine/15 rounded bg-hprh-paper hover:bg-hprh-pine/5 focus:outline-none transition-colors"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex flex-wrap items-center justify-between pb-3 gap-3 border-t border-hprh-pine/10 pt-3">
          <nav className="flex flex-wrap items-center gap-1.5">
            {navItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`inline-flex items-center gap-1.5 text-[10px] lg:text-xs font-mono font-semibold uppercase tracking-wider px-3 py-2 rounded transition-all duration-200 ${getLinkClass(
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
            className="inline-flex items-center gap-1.5 text-[10px] lg:text-xs font-mono font-bold uppercase tracking-wider text-hprh-clay hover:bg-hprh-clay/10 border border-hprh-clay/25 px-3.5 py-2 rounded transition-all duration-200"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>
        </div>

        {/* Mobile Navigation Dropdown Links */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-hprh-pine/15 py-3 space-y-1.5">
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center gap-2.5 text-xs font-mono font-semibold uppercase tracking-wider px-4 py-2.5 rounded transition-all duration-200 ${getLinkClass(
                      item.path
                    )}`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="pt-2 border-t border-hprh-pine/10">
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center justify-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-hprh-clay hover:bg-hprh-clay/10 border border-hprh-clay/25 py-2.5 rounded transition-all duration-200"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </header>
  );
};

export default AdminHeader;
