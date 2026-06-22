import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Shared Page footer containing site descriptions, quick links, and system indicators.
 */
export const Footer: React.FC = () => {
  return (
    <footer className="bg-hprh-paper-dark border-t-2 border-hprh-pine/10 py-12 text-hprh-pine/70 font-sans mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Brand info */}
          <div className="md:col-span-5">
            <span className="font-display text-lg font-bold text-hprh-pine block mb-1">
              Happy Paws Rescue Haven
            </span>
            <span className="text-[10px] uppercase tracking-widest text-hprh-sage font-bold block mb-4">
              Foster-Based Animal Rescue
            </span>
            <p className="text-xs leading-relaxed max-w-sm text-hprh-pine/80">
              We are a dedicated, foster-based rescue network focused on placing vulnerable animals in loving environments, providing medical care, and matching families with their perfect companions.
            </p>
          </div>

          {/* Links grid */}
          <div className="md:col-span-4 grid grid-cols-2 gap-4">
            <div>
              <h5 className="text-[11px] uppercase tracking-widest font-bold text-hprh-pine mb-3">
                Adopt & Help
              </h5>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link to="/adopt" className="hover:text-hprh-sage transition-colors">Available Pets</Link>
                </li>
                <li>
                  <Link to="/volunteer" className="hover:text-hprh-sage transition-colors">Foster/Volunteer</Link>
                </li>
                <li>
                  <Link to="/donate" className="hover:text-hprh-sage transition-colors">Donate Funds</Link>
                </li>
                <li>
                  <Link to="/transport" className="hover:text-hprh-sage transition-colors">Transport Network</Link>
                </li>
              </ul>
            </div>
            <div>
              <h5 className="text-[11px] uppercase tracking-widest font-bold text-hprh-pine mb-3">
                Resources
              </h5>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link to="/about" className="hover:text-hprh-sage transition-colors">About Us</Link>
                </li>
                <li>
                  <Link to="/resources" className="hover:text-hprh-sage transition-colors">Pet Resources</Link>
                </li>
                <li>
                  <Link to="/events" className="hover:text-hprh-sage transition-colors">Rescue Events</Link>
                </li>
                <li>
                  <Link to="/contact" className="hover:text-hprh-sage transition-colors">Contact Care</Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Tagline / Copyright */}
          <div className="md:col-span-3 flex flex-col md:items-end justify-between h-full text-xs">
            <div className="mb-4 md:text-right font-display italic text-hprh-sage text-sm">
              "Every paw deserves a home."
            </div>
            <div className="md:text-right text-hprh-pine/60">
              <p>&copy; {new Date().getFullYear()} HPRH Network.</p>
              <p className="text-[10px] text-hprh-pine/45 mt-1">
                Built with React + Supabase.
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
