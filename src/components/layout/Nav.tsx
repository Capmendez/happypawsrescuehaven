import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

/**
 * Shared Header / Navigation bar containing HPRH logo and primary site navigation.
 */
export const Nav: React.FC = () => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const links = [
    { path: '/', label: 'Home' },
    { path: '/adopt', label: 'Adopt' },
    { path: '/transport', label: 'Transport' },
    { path: '/volunteer', label: 'Volunteer' },
    { path: '/donate', label: 'Donate' },
    { path: '/about', label: 'About' },
    { path: '/contact', label: 'Contact' },
  ];

  const getLinkClass = (path: string) => {
    const isExactMatch = location.pathname === path;
    return isExactMatch
      ? 'text-hprh-clay border-b-2 border-hprh-clay md:border-b-2 font-bold'
      : 'text-hprh-pine/70 hover:text-hprh-sage hover:border-b-2 hover:border-hprh-sage/30';
  };

  const getMobileLinkClass = (path: string) => {
    const isExactMatch = location.pathname === path;
    return isExactMatch
      ? 'bg-hprh-pine/5 text-hprh-clay font-bold pl-3 border-l-4 border-hprh-clay'
      : 'text-hprh-pine/70 hover:text-hprh-sage hover:bg-hprh-pine/5 pl-3 border-l-4 border-transparent';
  };

  return (
    <nav className="bg-hprh-paper border-b border-hprh-pine/10 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Nav Bar Row */}
        <div className="flex justify-between h-20">
          
          {/* Logo Branding */}
          <div className="flex items-center">
            <Link to="/" className="flex flex-col group select-none">
              <span className="font-display text-xl sm:text-2xl font-bold text-hprh-pine tracking-wide leading-tight group-hover:text-hprh-clay transition-colors duration-150">
                Happy Paws
              </span>
              <span className="text-[10px] uppercase tracking-widest text-hprh-sage font-bold leading-none -mt-0.5">
                Rescue Haven
              </span>
            </Link>
          </div>

          {/* Navigation Links (Desktop) */}
          <div className="hidden md:flex items-center space-x-6">
            {links.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-xs uppercase tracking-wider py-2 transition-all duration-150 font-semibold ${getLinkClass(
                  link.path
                )}`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/admin/dashboard"
              className="bg-hprh-pine text-hprh-paper text-[10px] uppercase tracking-widest px-3.5 py-1.5 rounded hover:bg-hprh-sage transition-all duration-200 font-semibold"
            >
              Staff Portal
            </Link>
          </div>

          {/* Hamburger toggle button (Mobile only) */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-hprh-pine/70 hover:text-hprh-pine p-1.5 border border-hprh-pine/15 rounded bg-hprh-paper hover:bg-hprh-pine/5 focus:outline-none transition-colors"
              aria-label="Toggle navigation menu"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>

        {/* Collapsible Mobile Navigation Menu Dropdown */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-hprh-pine/10 py-3 space-y-1.5 animate-in fade-in duration-150">
            <div className="flex flex-col gap-1">
              {links.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`text-xs uppercase tracking-wider py-2.5 rounded font-mono font-semibold transition-all duration-150 ${getMobileLinkClass(
                    link.path
                  )}`}
                >
                  {link.label}
                </Link>
              ))}
              
              <div className="pt-2 border-t border-hprh-pine/10 mt-1">
                <Link
                  to="/admin/dashboard"
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-1.5 bg-hprh-pine text-hprh-paper text-xs uppercase tracking-wider py-2.5 rounded hover:bg-hprh-sage transition-all duration-200 font-mono font-bold"
                >
                  Staff Portal
                </Link>
              </div>
            </div>
          </div>
        )}

      </div>
    </nav>
  );
};

export default Nav;
