import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { showErrorToast, showSuccessToast } from '@/utils/errorHandling';
import { safeAsync } from '@/utils/errorHandler';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signUp: (email: string, password: string) => Promise<{ user: User | null; session: Session | null; error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ user: User | null; session: Session | null; error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const refreshSession = async () => {
    const [, error] = await safeAsync(supabase.auth.refreshSession());
    if (error) {
      console.error("Failed to refresh session:", error);
      // Attempt to sign out if refresh fails, to clear corrupted state
      await signOut(); 
    } 
    // onAuthStateChange will handle setting session and user
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setIsLoading(false); // Stop loading once auth state is determined
        
        if (event === 'SIGNED_IN') {
          navigate('/dashboard');
          // Toast is now handled by the calling component (e.g., Auth.tsx) or safeAsync wrapper
        } else if (event === 'SIGNED_OUT') {
          navigate('/auth');
           // Toast is now handled by the calling component or safeAsync wrapper
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('Auth token refreshed successfully');
        } else if (event === 'USER_UPDATED') {
          console.log('User updated successfully');
          setUser(currentSession?.user ?? null); // Ensure user state is current
        }
      }
    );

    // Initial session check
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (!session) { // only set if not already set by onAuthStateChange
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
      }
      setIsLoading(false);
    });

    // Session expiry check - consider if onAuthStateChange or refreshSession handles this adequately
    const checkInterval = setInterval(() => {
      if (session && session.expires_at && new Date(session.expires_at * 1000) < new Date()) {
        console.log("Session expired, attempting refresh via interval");
        refreshSession();
      }
    }, 60 * 1000); // Check every minute

    return () => {
      subscription.unsubscribe();
      clearInterval(checkInterval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [navigate]); // Keep navigate, remove session to avoid re-triggering on session change from itself

  const signUp = async (email: string, password: string) => {
    const [data, error] = await safeAsync(
      supabase.auth.signUp({ email, password }),
      {
        errorMessage: "Sign up failed. Please try again.",
        showToast: false, // Let Auth.tsx or caller handle specific toasts
      }
    );
    // data = { user, session, error } from Supabase response 
    // if safeAsync catches an error, its `error` is the thrown one.
    // if Supabase call itself has an error (e.g. user exists), data.error will have it
    const supabaseError = data?.error || (error as AuthError | null);
    if (!data?.user || supabaseError) {
        return { user: null, session: null, error: supabaseError || new AuthError("Sign up failed due to an unknown error") };
    }
    // Success: onAuthStateChange will trigger navigation and user/session update.
    return { user: data.user, session: data.session, error: null };
  };

  const signIn = async (email: string, password: string) => {
    const [data, error] = await safeAsync(
      supabase.auth.signInWithPassword({ email, password }),
      {
        errorMessage: "Sign in failed. Please check your credentials.",
        showToast: false, // Let Auth.tsx or caller handle specific toasts
      }
    );
    const supabaseError = data?.error || (error as AuthError | null);
    if (!data?.user || supabaseError) {
      return { user: null, session: null, error: supabaseError || new AuthError("Sign in failed due to an unknown error") };
    }
    // Success: onAuthStateChange will trigger navigation and user/session update.
    return { user: data.user, session: data.session, error: null };
  };

  const signOut = async () => {
    const [, error] = await safeAsync(supabase.auth.signOut(), {
      errorMessage: "Sign out failed. Please try again.",
      showToast: true, // Can show a generic sign-out error toast here
    });
    if (error) {
        return { error: error as AuthError };
    }
    // onAuthStateChange will trigger navigation and clear user/session.
    return { error: null };
  };

  return (
    <AuthContext.Provider value={{ 
      session, 
      user, 
      isLoading, 
      signUp, 
      signIn, 
      signOut,
      refreshSession 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
