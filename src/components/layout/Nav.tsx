import React from 'react';
import { Link, useLocation } from 'react-router-dom';

/**
 * Shared Header / Navigation bar containing HPRH logo and primary site navigation.
 */
export const Nav: React.FC = () => {
  const location = useLocation();

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
      ? 'text-hprh-clay border-b-2 border-hprh-clay font-bold'
      : 'text-hprh-pine/70 hover:text-hprh-sage hover:border-b-2 hover:border-hprh-sage/30';
  };

  return (
    <nav className="bg-hprh-paper border-b-2 border-hprh-pine/10 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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

          {/* Navigation Links (Mobile quick links) */}
          <div className="md:hidden flex items-center gap-2">
            <Link
              to="/adopt"
              className="text-[9px] uppercase tracking-widest text-hprh-clay font-bold border border-hprh-clay/35 px-2.5 py-1 rounded"
            >
              Adopt
            </Link>
            <Link
              to="/admin/dashboard"
              className="text-[9px] uppercase tracking-widest text-hprh-pine/70 border border-hprh-pine/25 px-2.5 py-1 rounded"
            >
              Staff
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Nav;
