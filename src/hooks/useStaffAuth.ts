import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Staff } from '../lib/types';

/**
 * Custom hook that checks whether the logged-in user exists in the `staff` table.
 * Subscribes to auth state changes and re-evaluates access.
 */
export const useStaffAuth = () => {
  const [isStaff, setIsStaff] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<any>(null);
  const [staffDetails, setStaffDetails] = useState<Staff | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkStaff = async () => {
      try {
        if (isMounted) setLoading(true);

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          if (isMounted) {
            setIsStaff(false);
            setStaffDetails(null);
            setLoading(false);
          }
          return;
        }

        // Query the staff table where user_id = auth.uid()
        const { data, error: staffError } = await supabase
          .from('staff')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (isMounted) {
          if (staffError) {
            setError(staffError);
            setIsStaff(false);
            setStaffDetails(null);
          } else if (data) {
            setIsStaff(true);
            setStaffDetails(data as Staff);
          } else {
            setIsStaff(false);
            setStaffDetails(null);
          }
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err);
          setIsStaff(false);
          setLoading(false);
        }
      }
    };

    checkStaff();

    // Subscribe to auth session events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkStaff();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { isStaff, loading, error, staffDetails };
};

export default useStaffAuth;
