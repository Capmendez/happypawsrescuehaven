import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Container from '../../components/ui/Container';
import { 
  ClipboardList, 
  FolderHeart, 
  PlusCircle, 
  ShieldAlert,
  Building2,
  CreditCard,
  Truck,
  Loader2
} from 'lucide-react';

interface StatsState {
  pendingApplications: number;
  availablePets: number;
  offMarketPets: number;
  pendingProofs: number;
}

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<StatsState>({
    pendingApplications: 0,
    availablePets: 0,
    offMarketPets: 0,
    pendingProofs: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Fetch pending applications count
        const { count: pendingApps, error: err1 } = await supabase
          .from('adoption_applications')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'PENDING');

        // 2. Fetch available pets count
        const { count: availablePets, error: err2 } = await supabase
          .from('pets')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'AVAILABLE');

        // 3. Fetch other pets (non-available status: PENDING, ADOPTED, MEDICAL_HOLD, NOT_LISTED)
        const { count: offMarketPets, error: err3 } = await supabase
          .from('pets')
          .select('id', { count: 'exact', head: true })
          .neq('status', 'AVAILABLE');

        // 4. Fetch pending payment proofs count
        const { count: pendingProofs, error: err4 } = await supabase
          .from('payment_proofs')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'PENDING_REVIEW');

        if (err1) throw err1;
        if (err2) throw err2;
        if (err3) throw err3;
        if (err4) throw err4;

        setStats({
          pendingApplications: pendingApps || 0,
          availablePets: availablePets || 0,
          offMarketPets: offMarketPets || 0,
          pendingProofs: pendingProofs || 0,
        });
      } catch (err: any) {
        console.error('Error loading dashboard stats:', err);
        setError('Could not retrieve active system database statistics.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="py-20 bg-hprh-paper min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-hprh-sage" />
        <p className="font-mono text-xs uppercase tracking-widest text-hprh-pine/50">Compiling Portal Statistics...</p>
      </div>
    );
  }

  return (
    <div className="py-12 bg-hprh-paper text-hprh-pine font-sans">
      <Container className="space-y-10">
        
        {/* Dashboard Header */}
        <div className="border-b-2 border-dashed border-hprh-pine/20 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-hprh-sage font-bold block mb-1">
              System Overview
            </span>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-hprh-pine">
              Rescue Haven Dashboard
            </h1>
            <p className="text-xs text-hprh-pine/50 mt-1">
              Real-time rescue registry audits and staff operation shortcuts.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-hprh-clay/10 border border-hprh-clay/20 text-hprh-pine p-4 rounded text-xs flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-hprh-clay flex-shrink-0" />
            <div className="space-y-1">
              <span className="font-mono uppercase font-bold text-hprh-clay block">Connection Fault</span>
              <p className="leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Statistics Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Pending Applications */}
          <div className="bg-hprh-paper-dark border border-hprh-pine/15 rounded p-5 relative overflow-hidden flex flex-col justify-between h-32 group select-none shadow-sm">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-hprh-clay"></div>
            <div className="flex justify-between items-start">
              <span className="font-mono text-[9px] uppercase tracking-widest text-hprh-pine/50 font-bold">
                Pending Files
              </span>
              <ClipboardList className="w-4.5 h-4.5 text-hprh-clay" />
            </div>
            <div>
              <div className="font-display text-4xl font-black tracking-tight">{stats.pendingApplications}</div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-hprh-pine/40 font-bold block mt-1">
                Adoption Requests
              </span>
            </div>
          </div>

          {/* Card 2: Available Pets */}
          <div className="bg-hprh-paper-dark border border-hprh-pine/15 rounded p-5 relative overflow-hidden flex flex-col justify-between h-32 group select-none shadow-sm">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-hprh-gold"></div>
            <div className="flex justify-between items-start">
              <span className="font-mono text-[9px] uppercase tracking-widest text-hprh-pine/50 font-bold">
                Listed Kennel
              </span>
              <FolderHeart className="w-4.5 h-4.5 text-hprh-gold" />
            </div>
            <div>
              <div className="font-display text-4xl font-black tracking-tight">{stats.availablePets}</div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-hprh-pine/40 font-bold block mt-1">
                Available Cases
              </span>
            </div>
          </div>

          {/* Card 3: Off-market Pets */}
          <div className="bg-hprh-paper-dark border border-hprh-pine/15 rounded p-5 relative overflow-hidden flex flex-col justify-between h-32 group select-none shadow-sm">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-hprh-sage"></div>
            <div className="flex justify-between items-start">
              <span className="font-mono text-[9px] uppercase tracking-widest text-hprh-pine/50 font-bold">
                Assigned Cases
              </span>
              <FolderHeart className="w-4.5 h-4.5 text-hprh-sage" />
            </div>
            <div>
              <div className="font-display text-4xl font-black tracking-tight">{stats.offMarketPets}</div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-hprh-pine/40 font-bold block mt-1">
                Other Case States
              </span>
            </div>
          </div>

          {/* Card 4: Pending Wire Audits */}
          <div className="bg-hprh-paper-dark border border-hprh-pine/15 rounded p-5 relative overflow-hidden flex flex-col justify-between h-32 group select-none shadow-sm">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-hprh-clay/85"></div>
            <div className="flex justify-between items-start">
              <span className="font-mono text-[9px] uppercase tracking-widest text-hprh-pine/50 font-bold">
                Treasury Triage
              </span>
              <CreditCard className="w-4.5 h-4.5 text-hprh-clay/85" />
            </div>
            <div>
              <div className="font-display text-4xl font-black tracking-tight">{stats.pendingProofs}</div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-hprh-pine/40 block mt-1">
                Pending wire audits
              </span>
            </div>
          </div>
        </div>

        {/* Quick Links / Shortcut Section */}
        <div className="space-y-4">
          <h2 className="font-mono text-xs uppercase tracking-widest font-bold text-hprh-pine/50">
            Operational Dossier Shortcuts
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Shortcut 1: Applications Queue */}
            <Link
              to="/admin/applications"
              className="bg-hprh-paper-dark border border-hprh-pine/15 hover:border-hprh-sage/50 p-6 rounded shadow-sm hover:shadow transition-all duration-300 group flex flex-col justify-between h-44 relative"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-hprh-pine/10 group-hover:bg-hprh-sage transition-colors"></div>
              <div>
                <ClipboardList className="w-7 h-7 text-hprh-sage mb-3" />
                <h3 className="font-display text-lg font-bold text-hprh-pine group-hover:text-hprh-sage transition-colors">
                  Review Applications
                </h3>
                <p className="text-xs text-hprh-pine/60 mt-1 leading-relaxed">
                  Approve or reject pending dossiers filed by prospective pet adopters.
                </p>
              </div>
              <span className="font-mono text-[10px] uppercase font-bold text-hprh-sage self-end flex items-center gap-1 mt-4">
                Open Queue &rarr;
              </span>
            </Link>

            {/* Shortcut 2: Pet Management */}
            <Link
              to="/admin/pets"
              className="bg-hprh-paper-dark border border-hprh-pine/15 hover:border-hprh-sage/50 p-6 rounded shadow-sm hover:shadow transition-all duration-300 group flex flex-col justify-between h-44 relative"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-hprh-pine/10 group-hover:bg-hprh-sage transition-colors"></div>
              <div>
                <FolderHeart className="w-7 h-7 text-hprh-sage mb-3" />
                <h3 className="font-display text-lg font-bold text-hprh-pine group-hover:text-hprh-sage transition-colors">
                  Case Inventory
                </h3>
                <p className="text-xs text-hprh-pine/60 mt-1 leading-relaxed">
                  Browse, update, delete, or retire listed pet case records.
                </p>
              </div>
              <span className="font-mono text-[10px] uppercase font-bold text-hprh-sage self-end flex items-center gap-1 mt-4">
                Open Inventory &rarr;
              </span>
            </Link>

            {/* Shortcut 3: Add New Pet */}
            <Link
              to="/admin/pets/new"
              className="bg-hprh-paper-dark border border-hprh-pine/15 hover:border-hprh-sage/50 p-6 rounded shadow-sm hover:shadow transition-all duration-300 group flex flex-col justify-between h-44 relative"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-hprh-pine/10 group-hover:bg-hprh-sage transition-colors"></div>
              <div>
                <PlusCircle className="w-7 h-7 text-hprh-sage mb-3" />
                <h3 className="font-display text-lg font-bold text-hprh-pine group-hover:text-hprh-sage transition-colors">
                  Register Intake Dossier
                </h3>
                <p className="text-xs text-hprh-pine/60 mt-1 leading-relaxed">
                  Log new incoming rescue animals, details, and initial photographs.
                </p>
              </div>
              <span className="font-mono text-[10px] uppercase font-bold text-hprh-sage self-end flex items-center gap-1 mt-4">
                Create Dossier &rarr;
              </span>
            </Link>

            {/* Shortcut 4: Review Payment Queue */}
            <Link
              to="/admin/payment-proofs"
              className="bg-hprh-paper-dark border border-hprh-pine/15 hover:border-hprh-sage/50 p-6 rounded shadow-sm hover:shadow transition-all duration-300 group flex flex-col justify-between h-44 relative"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-hprh-pine/10 group-hover:bg-hprh-sage transition-colors"></div>
              <div>
                <CreditCard className="w-7 h-7 text-hprh-sage mb-3" />
                <h3 className="font-display text-lg font-bold text-hprh-pine group-hover:text-hprh-sage transition-colors">
                  Review Payment Queue
                </h3>
                <p className="text-xs text-hprh-pine/60 mt-1 leading-relaxed">
                  Audit manual wire transfer proof screenshots from adopters to release transport dispatches.
                </p>
              </div>
              <span className="font-mono text-[10px] uppercase font-bold text-hprh-sage self-end flex items-center gap-1 mt-4">
                Review Payments &rarr;
              </span>
            </Link>

            {/* Shortcut 5: Treasury Settings */}
            <Link
              to="/admin/payment-methods"
              className="bg-hprh-paper-dark border border-hprh-pine/15 hover:border-hprh-sage/50 p-6 rounded shadow-sm hover:shadow transition-all duration-300 group flex flex-col justify-between h-44 relative"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-hprh-pine/10 group-hover:bg-hprh-sage transition-colors"></div>
              <div>
                <Building2 className="w-7 h-7 text-hprh-sage mb-3" />
                <h3 className="font-display text-lg font-bold text-hprh-pine group-hover:text-hprh-sage transition-colors">
                  Payment Methods
                </h3>
                <p className="text-xs text-hprh-pine/60 mt-1 leading-relaxed">
                  Configure active payment methods (Zelle, CashApp, Venmo, Chime, Bank, etc.) and global settings.
                </p>
              </div>
              <span className="font-mono text-[10px] uppercase font-bold text-hprh-sage self-end flex items-center gap-1 mt-4">
                Open Settings &rarr;
              </span>
            </Link>

            {/* Shortcut 6: Transport Settings */}
            <Link
              to="/admin/transport-settings"
              className="bg-hprh-paper-dark border border-hprh-pine/15 hover:border-hprh-sage/50 p-6 rounded shadow-sm hover:shadow transition-all duration-300 group flex flex-col justify-between h-44 relative"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-hprh-pine/10 group-hover:bg-hprh-sage transition-colors"></div>
              <div>
                <Truck className="w-7 h-7 text-hprh-sage mb-3" />
                <h3 className="font-display text-lg font-bold text-hprh-pine group-hover:text-hprh-sage transition-colors">
                  Transport Settings
                </h3>
                <p className="text-xs text-hprh-pine/60 mt-1 leading-relaxed">
                  Manage distance fee tiers and edit security deposit amounts for pet transports.
                </p>
              </div>
              <span className="font-mono text-[10px] uppercase font-bold text-hprh-sage self-end flex items-center gap-1 mt-4">
                Open Settings &rarr;
              </span>
            </Link>

          </div>
        </div>
        
      </Container>
    </div>
  );
};

export default AdminDashboard;
