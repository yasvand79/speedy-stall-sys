import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  is_active: boolean;
  branch_id: string | null;
  status: string | null;
  invite_code_used: string | null;
  approved_at: string | null;
  approved_by: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; status?: string }>;
  signUp: (email: string, password: string, fullName: string, role?: AppRole, branchId?: string, inviteCode?: string) => Promise<{ error: Error | null; autoApproved?: boolean }>;
  signOut: () => Promise<void>;
  isDeveloper: boolean;
  isCentralAdmin: boolean;
  isBranchAdmin: boolean;
  isAdmin: boolean;
  isBilling: boolean;
  isApproved: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer fetching profile and role using setTimeout
        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchUserData(userId: string) {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      setProfile(profileData);

      // Fetch role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      setRole(roleData?.role ?? null);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error as Error };
    }

    // Check user approval status
    if (data.user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('status')
        .eq('user_id', data.user.id)
        .maybeSingle();

      const status = profileData?.status;

      // If not approved, sign out and return status
      if (status !== 'approved') {
        await supabase.auth.signOut();
        return { error: null, status };
      }
    }

    return { error: null, status: 'approved' };
  };

  const signUp = async (
    email: string, 
    password: string, 
    fullName: string, 
    role: AppRole = 'billing', 
    branchId?: string,
    inviteCode?: string
  ) => {
    const redirectUrl = `${window.location.origin}/`;
    
    // Determine if this will be auto-approved
    // Users with invite codes or developer role are auto-approved
    const willBeAutoApproved = !!inviteCode || role === 'developer';
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          role: role,
          branch_id: branchId || null,
          invite_code: inviteCode || null,
        },
      },
    });
    
    // Always sign out after signup - user needs to log in explicitly
    if (!error) {
      await supabase.auth.signOut();
    }
    
    return { error: error as Error | null, autoApproved: willBeAutoApproved };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRole(null);
  };

  const isApproved = profile?.status === 'approved';

  const value = {
    user,
    session,
    profile,
    role,
    loading,
    signIn,
    signUp,
    signOut,
    isDeveloper: role === 'developer',
    isCentralAdmin: role === 'central_admin',
    isBranchAdmin: role === 'branch_admin',
    isAdmin: role === 'branch_admin' || role === 'central_admin' || role === 'developer',
    isBilling: role === 'billing',
    isApproved,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}