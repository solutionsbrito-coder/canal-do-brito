import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  isLoading: boolean;
  roleChecked: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  recheckAdmin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [roleChecked, setRoleChecked] = useState(false);

  const checkAdmin = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });
      setIsAdmin(!!data);
    } catch {
      setIsAdmin(false);
    } finally {
      setRoleChecked(true);
    }
  }, []);

  const recheckAdmin = useCallback(async () => {
    if (!session?.user) return;
    setRoleChecked(false);
    await checkAdmin(session.user.id);
  }, [session, checkAdmin]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session?.user) {
          setRoleChecked(false);
          // Use setTimeout to avoid Supabase deadlock
          setTimeout(() => checkAdmin(session.user.id), 0);
        } else {
          setIsAdmin(false);
          setRoleChecked(true);
        }
        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        checkAdmin(session.user.id);
      } else {
        setRoleChecked(true);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [checkAdmin]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        isAdmin,
        isLoading,
        roleChecked,
        signIn,
        signOut,
        recheckAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
