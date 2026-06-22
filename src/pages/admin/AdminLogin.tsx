import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useStaffAuth } from '../../hooks/useStaffAuth';
import Container from '../../components/ui/Container';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { ShieldAlert, Loader2, KeyRound } from 'lucide-react';

export const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { isStaff, loading: checkingAuth } = useStaffAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Automatically redirect authenticated staff members to dashboard
  useEffect(() => {
    if (!checkingAuth && isStaff) {
      navigate('/admin/dashboard');
    }
  }, [isStaff, checkingAuth, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      // Step 1: Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        // Handle invalid credentials or custom error mappings gracefully
        if (authError.message === 'Invalid login credentials') {
          throw new Error('Invalid email or password. Please verify your credentials.');
        }
        if (authError.message === 'Email not confirmed') {
          throw new Error('This email address has not been confirmed. Please check your inbox.');
        }
        throw authError;
      }

      const user = authData?.user;
      if (!user) {
        throw new Error('Authentication returned an empty user session.');
      }

      // Step 2: Query staff table to verify permissions
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (staffError) {
        throw staffError;
      }

      if (!staffData) {
        // Successful auth but NOT a staff member: sign out immediately
        await supabase.auth.signOut();
        throw new Error("Your account doesn't have staff access — contact the rescue admin");
      }

      // Success: redirect to staff dashboard
      navigate('/admin/dashboard');
    } catch (err: any) {
      console.error('Login flow error:', err);
      setErrorMsg(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="py-20 bg-hprh-paper min-h-screen flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 border-4 border-hprh-sage border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="font-mono text-xs uppercase tracking-widest text-hprh-pine/50">Checking Authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-16 md:py-24 bg-hprh-paper flex-grow flex items-center text-hprh-pine font-sans">
      <Container className="max-w-md mx-auto">
        <div
          className="bg-hprh-paper-dark border-2 border-hprh-pine/20 rounded shadow-lg p-6 md:p-8 relative overflow-hidden"
          style={{
            backgroundImage: 'radial-gradient(#1f2a1e05 1px, transparent 0)',
            backgroundSize: '16px 16px',
          }}
        >
          {/* File Accent Header line */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-hprh-clay"></div>

          {/* Form Branding */}
          <div className="border-b-2 border-dashed border-hprh-pine/20 pb-5 mb-6 text-center">
            <span className="font-mono text-[9px] uppercase tracking-widest text-hprh-pine/40 font-bold block mb-1">
              Authorized Personnel Only
            </span>
            <h1 className="font-display text-3xl font-extrabold text-hprh-pine">Staff Portal Login</h1>
            <p className="text-xs text-hprh-pine/50 mt-1">
              Enter your credentials to manage kennel intake dossiers & adoption applications.
            </p>
          </div>

          {errorMsg && (
            <div className="bg-hprh-clay/10 border border-hprh-clay/20 text-hprh-pine p-4 rounded text-xs mb-6 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-hprh-clay flex-shrink-0" />
              <div className="space-y-1">
                <span className="font-mono uppercase font-bold text-hprh-clay block">Access Blocked</span>
                <p className="leading-relaxed">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Staff Email"
              type="email"
              placeholder="e.g. administrator@happypaws.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              required
            />

            <Input
              label="Secret Credentials / Password"
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              required
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                disabled={submitting}
                className="w-full py-3.5 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying Case Access...
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    Authenticate Account
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </Container>
    </div>
  );
};

export default AdminLogin;
