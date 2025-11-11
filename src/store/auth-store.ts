import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, secureAPI } from '@/lib/supabase';

interface AdminUser {
  id: string;
  email: string;
  role: 'SuperAdmin' | 'SupportAdmin' | 'ReadOnly';
  isActive: boolean;
}

interface AuthState {
  admin: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  canModify: () => boolean;
  canDelete: () => boolean;
  canManageAdmins: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      admin: null,
      isAuthenticated: false,
      isLoading: true,

      signIn: async (email: string, password: string) => {
        try {
          console.log('[SignIn] Starting login for:', email);
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
          });

          if (error) {
            console.error('[SignIn] Auth error:', error);
            throw error;
          }
          
          if (!data.user) {
            console.error('[SignIn] No user returned after auth');
            throw new Error('Authentication failed');
          }

          console.log('[SignIn] User authenticated:', data.user.id);
          const adminInfo = await secureAPI.getCurrentAdmin();
          
          console.log('[SignIn] Admin info retrieved:', adminInfo ? 'Yes' : 'No');
          if (!adminInfo || !adminInfo.isActive) {
            console.warn('[SignIn] User not authorized as admin');
            await supabase.auth.signOut();
            throw new Error('You do not have admin access');
          }

          console.log('[SignIn] Setting authenticated state');
          set({
            admin: {
              id: data.user.id,
              email: data.user.email!,
              role: adminInfo.adminRole,
              isActive: adminInfo.isActive
            },
            isAuthenticated: true,
            isLoading: false
          });
          console.log('[SignIn] Login successful!');
        } catch (error) {
          console.error('[SignIn] Exception caught:', error);
          set({ admin: null, isAuthenticated: false, isLoading: false });
          throw error;
        }
      },

      signOut: async () => {
        await supabase.auth.signOut();
        set({ admin: null, isAuthenticated: false, isLoading: false });
      },

      logout: async () => {
        await supabase.auth.signOut();
        set({ admin: null, isAuthenticated: false, isLoading: false });
      },

      checkSession: async () => {
        try {
          set({ isLoading: true });
          
          const { data: { session } } = await supabase.auth.getSession();
          
          if (!session) {
            console.log('[Auth] No active session');
            set({ admin: null, isAuthenticated: false, isLoading: false });
            return;
          }

          console.log('[Auth] Session found, checking admin role...');
          const adminInfo = await secureAPI.getCurrentAdmin();
          
          if (!adminInfo || !adminInfo.isActive) {
            console.warn('[Auth] User not authorized as admin');
            await supabase.auth.signOut();
            set({ admin: null, isAuthenticated: false, isLoading: false });
            return;
          }

          console.log('[Auth] Admin authenticated successfully:', adminInfo.email);
          set({
            admin: {
              id: session.user.id,
              email: session.user.email!,
              role: adminInfo.adminRole,
              isActive: adminInfo.isActive
            },
            isAuthenticated: true,
            isLoading: false
          });
        } catch (error) {
          console.error('Session check failed:', error);
          set({ admin: null, isAuthenticated: false, isLoading: false });
        }
      },

      canModify: () => {
        const { admin } = get();
        return admin?.role === 'SuperAdmin' || admin?.role === 'SupportAdmin';
      },
      canDelete: () => {
        const { admin } = get();
        return admin?.role === 'SuperAdmin';
      },
      canManageAdmins: () => {
        const { admin } = get();
        return admin?.role === 'SuperAdmin';
      }
    }),
    {
      name: 'emonitor-admin-auth',
      partialize: (state) => ({ 
        isAuthenticated: state.isAuthenticated 
      })
    }
  )
);

supabase.auth.onAuthStateChange(async (event, session) => {
  const store = useAuthStore.getState();
  
  if (event === 'SIGNED_OUT') {
    store.signOut();
  } else if (event === 'SIGNED_IN' && session) {
    store.checkSession();
  }
});
