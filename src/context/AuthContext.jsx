import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [farm, setFarm] = useState(null);
  const [booting, setBooting] = useState(true);
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState('');

  const loadAccount = useCallback(async (user) => {
    if (!user) {
      setProfile(null); setFarm(null); setAccountError(''); setAccountLoading(false);
      return;
    }
    setAccountLoading(true);
    const [p, f] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('farms').select('*').eq('owner_id', user.id).maybeSingle(),
    ]);
    setProfile(p.data ?? null);
    setFarm(f.data ?? null);
    setAccountError(p.error?.message || f.error?.message || (!f.data ? 'We could not find a farm for this account.' : ''));
    setAccountLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadAccount(data.session?.user);
      if (active) setBooting(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        if (s?.user) setAccountLoading(true);
        // Defer: calling Supabase inside this callback can deadlock the auth client.
        setTimeout(() => loadAccount(s?.user), 0);
      }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [loadAccount]);

  const value = useMemo(() => ({
    session,
    user: session?.user ?? null,
    profile,
    farm,
    loading: booting || accountLoading,
    accountError,
    refreshAccount: () => loadAccount(session?.user),
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signUp: ({ email, password, fullName, phone, farmName }) =>
      supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, phone, farm_name: farmName },
          emailRedirectTo: window.location.origin,
        },
      }),
    signOut: () => supabase.auth.signOut(),
    sendReset: (email) =>
      supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` }),
  }), [session, profile, farm, booting, accountLoading, accountError, loadAccount]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
