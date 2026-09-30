"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import type { User, UserRole } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

interface LoginResult {
  success: boolean;
  error?: string;
  role?: UserRole;
}

interface AuthContextType {
  /** Current logged-in user */
  user: User | null;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Loading state */
  isLoading: boolean;
  /** Login with email and password using Supabase */
  login: (email: string, password: string) => Promise<LoginResult>;
  /** Register new client with Supabase */
  signUp: (
    email: string, 
    password: string, 
    fullName: string, 
    phone?: string,
    birthDate?: string
  ) => Promise<{ success: boolean; error?: string }>;
  /** Update current user profile */
  updateProfile: (data: { full_name?: string; phone?: string; birth_date?: string }) => Promise<{ success: boolean; error?: string }>;
  /** Login as a specific role (for development & demo testing) */
  loginAsRole: (role: UserRole) => void;
  /** Logout */
  logout: () => Promise<void>;
  /** Check if user has a specific role */
  hasRole: (role: UserRole) => boolean;
}

function clearLegacyClientRegistry() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('autospa_registered_clients');
  } catch {}
}

function extractCleanName(profileName?: string | null, metaName?: string | null, email?: string | null): string {
  const p = (profileName || "").trim().replace(/\s+/g, ' ');
  if (p) return p;
  const m = (metaName || "").trim().replace(/\s+/g, ' ');
  if (m) return m;
  if (email && email.includes('@')) {
    const fromEmail = email.split('@')[0].replace(/[._-]/g, ' ').trim();
    if (fromEmail) return fromEmail.charAt(0).toUpperCase() + fromEmail.slice(1);
  }
  return 'Cliente';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  // Load user session on mount
  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          const fullName = extractCleanName(
            profile?.full_name,
            session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.user_metadata?.fullName,
            session.user.email
          );
          const phone = (profile?.phone || session.user.user_metadata?.phone || '').trim();
          const birthDate = profile?.birth_date || session.user.user_metadata?.birth_date || null;
          const role = (profile?.role || session.user.user_metadata?.role || 'client') as UserRole;

          // If profile does not exist in public.profiles table, create it immediately
          if (!profile) {
            try {
              await supabase.from('profiles').upsert({
                id: session.user.id,
                email: session.user.email || '',
                full_name: fullName,
                phone: phone,
                birth_date: birthDate,
                role: role,
                updated_at: new Date().toISOString(),
              });
            } catch (pErr) {
              console.warn('Could not auto-insert profile:', pErr);
            }
          }

          clearLegacyClientRegistry();

          setUser({
            id: session.user.id,
            email: session.user.email || '',
            full_name: fullName,
            phone: phone,
            birth_date: birthDate,
            role: role,
            avatar_url: profile?.avatar_url,
          });
        }
      } catch (err) {
        console.error('Error loading session:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        const fullName = extractCleanName(
          profile?.full_name,
          session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.user_metadata?.fullName,
          session.user.email
        );
        const phone = (profile?.phone || session.user.user_metadata?.phone || '').trim();
        const birthDate = profile?.birth_date || session.user.user_metadata?.birth_date || null;
        const role = (profile?.role || session.user.user_metadata?.role || 'client') as UserRole;

        if (!profile) {
          try {
            await supabase.from('profiles').upsert({
              id: session.user.id,
              email: session.user.email || '',
              full_name: fullName,
              phone: phone,
              birth_date: birthDate,
              role: role,
              updated_at: new Date().toISOString(),
            });
          } catch (pErr) {
            console.warn('Could not auto-insert profile on auth change:', pErr);
          }
        }

        clearLegacyClientRegistry();

        setUser({
          id: session.user.id,
          email: session.user.email || '',
          full_name: fullName,
          phone: phone,
          birth_date: birthDate,
          role: role,
          avatar_url: profile?.avatar_url,
        });
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    try {
      // 1. Try Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        setIsLoading(false);
        let errorMsg = error.message;
        if (error.message.includes("Invalid login credentials")) {
          errorMsg = "Correo o contraseña incorrectos. Verifica tus datos o regístrate.";
        } else if (error.message.includes("Email not confirmed")) {
          errorMsg = "Debes confirmar tu correo antes de ingresar. (En Supabase Dashboard: Authentication -> Providers -> Email -> Confirm email: OFF)";
        }
        return { success: false, error: errorMsg };
      }

      if (data?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();

        const role = (profile?.role || data.user.user_metadata?.role || 'client') as UserRole;
        const fullName = extractCleanName(
          profile?.full_name,
          data.user.user_metadata?.full_name || data.user.user_metadata?.name || data.user.user_metadata?.fullName,
          data.user.email || email
        );
        const phone = (profile?.phone || data.user.user_metadata?.phone || '').trim();
        const birthDate = profile?.birth_date || data.user.user_metadata?.birth_date || null;

        if (!profile) {
          try {
            await supabase.from('profiles').upsert({
              id: data.user.id,
              email: data.user.email || email,
              full_name: fullName,
              phone: phone,
              birth_date: birthDate,
              role: role,
              updated_at: new Date().toISOString(),
            });
          } catch (pErr) {
            console.warn('Could not insert profile on login:', pErr);
          }
        }

        clearLegacyClientRegistry();

        const loggedUser: User = {
          id: data.user.id,
          email: data.user.email || email,
          full_name: fullName,
          phone: phone,
          birth_date: birthDate,
          role: role,
          avatar_url: profile?.avatar_url,
        };

        setUser(loggedUser);
        setIsLoading(false);
        return { success: true, role };
      }

      setIsLoading(false);
      return { success: false, error: "No se pudo iniciar sesión" };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || "Error al iniciar sesión" };
    }
  }, [supabase]);

  const signUp = useCallback(async (
    email: string, 
    password: string, 
    fullName: string, 
    phone?: string,
    birthDate?: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanFullName = extractCleanName(fullName, null, cleanEmail);
      const cleanPhone = (phone || '').trim();
      const cleanBirthDate = (birthDate || '').trim();

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanFullName,
            phone: cleanPhone,
            birth_date: cleanBirthDate,
            role: 'client',
          },
        },
      });

      if (error) {
        setIsLoading(false);
        return { success: false, error: error.message };
      }

      if (data.user) {
        try {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email: data.user.email || cleanEmail,
            full_name: cleanFullName,
            phone: cleanPhone,
            birth_date: cleanBirthDate || null,
            role: 'client',
            updated_at: new Date().toISOString(),
          });
        } catch (pErr) {
          console.warn('Could not insert profile on signUp:', pErr);
        }

        clearLegacyClientRegistry();

        setUser({
          id: data.user.id,
          email: data.user.email || cleanEmail,
          full_name: cleanFullName,
          phone: cleanPhone,
          birth_date: cleanBirthDate,
          role: 'client',
        });
      }

      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'Error al registrar usuario' };
    }
  }, [supabase]);

  const updateProfile = useCallback(async (updates: { full_name?: string; phone?: string; birth_date?: string }) => {
    if (!user) return { success: false, error: 'No hay usuario autenticado' };
    try {
      // 1. Update Supabase user metadata
      const { error: authErr } = await supabase.auth.updateUser({
        data: {
          full_name: updates.full_name ?? user.full_name,
          phone: updates.phone ?? user.phone,
          birth_date: updates.birth_date ?? user.birth_date,
        }
      });

      if (authErr) throw authErr;

      // 2. Update Supabase profiles table
      try {
        await supabase
          .from('profiles')
          .update({
            full_name: updates.full_name ?? user.full_name,
            phone: updates.phone ?? user.phone,
            birth_date: updates.birth_date ?? user.birth_date,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);
      } catch (profileErr) {
        console.warn('Profiles table update warning:', profileErr);
      }

      // 3. Update local state
      setUser((prev) => prev ? {
        ...prev,
        full_name: updates.full_name ?? prev.full_name,
        phone: updates.phone ?? prev.phone,
        birth_date: updates.birth_date ?? prev.birth_date,
      } : null);

      return { success: true };
    } catch (err: any) {
      console.error('Error updating profile:', err);
      return { success: false, error: err.message || 'Error al actualizar perfil' };
    }
  }, [user, supabase]);

  const loginAsRole = useCallback((_role: UserRole) => {
    // Disabled in real mode
  }, []);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    }
    setUser(null);
  }, []);

  const hasRole = useCallback(
    (role: UserRole) => {
      if (!user) return false;
      if (user.role === "superadmin") return true;
      return user.role === role;
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signUp,
        updateProfile,
        loginAsRole,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
