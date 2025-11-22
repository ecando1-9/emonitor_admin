// ========================================
// SECURE SUPABASE CLIENT CONFIGURATION
// ========================================
// Uses ANON key (safe for frontend) instead of service key
// All privileged operations go through secure database functions with RLS

import { createClient } from '@supabase/supabase-js';

// Use ANON key (safe to expose in frontend)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// ========================================
// TYPE DEFINITIONS
// ========================================

export interface User {
  id: string;
  email: string;
  adminRole?: string;
  isActive?: boolean;
}

export interface Subscription {
  id: string;
  user_id: string;
  status: 'trialing' | 'active' | 'expired' | 'cancelled' | 'suspended';
  plan_id: string;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  device_hash: string | null;
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  price_original?: number;
  features: string[];
}

export interface Device {
  id: string;
  device_hash: string;
  trial_count: number;
  is_blocked: boolean;
  blocked_reason?: string;
  last_seen: string;
  first_seen: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  admin_id: string;
  action: string;
  details: Record<string, any>;
  created_at: string;
}

// ========================================
// SECURE API FUNCTIONS (via RPC)
// ========================================

export const secureAPI = {
  // === AUTH & ADMIN ===
  
  // **** THIS FUNCTION IS NOW FIXED ****
  // It now calls an RPC function to avoid the infinite RLS loop.
  async getCurrentAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('[Admin] No authenticated user');
      return null;
    }

    console.log('[Admin] Checking admin role for user:', user.id);
    
    // This is the fix:
    // We call the 'get_admin_role' RPC function, which is SECURITY DEFINER
    // and can safely read the admin_roles table without hitting RLS.
    const { data: adminRole, error } = await supabase.rpc('get_admin_role', {
      user_uuid: user.id
    });

    if (error) {
      console.error('[Admin] Error fetching admin role via RPC:', {
        message: error.message,
        details: (error as any).details,
        hint: (error as any).hint,
        code: (error as any).code
      });
      return null;
    }

    if (!adminRole) {
      console.warn('[Admin] No admin role found for user:', user.id);
      return null;
    }

    console.log('[Admin] Admin role found:', adminRole);
    // The RPC function only returns the role, so we assume 'is_active' is true
    // because the function only returns active roles.
    return { ...user, adminRole: adminRole, isActive: true };
  },

  // === SUBSCRIPTIONS & TRIALS ===

  async getUsersWithSubscriptions() {
    try {
      console.log('[RPC] Calling get_users_with_subscriptions...');
      const { data: { user } } = await supabase.auth.getUser();
      console.log('[RPC] Current user:', user?.id);
      
      const { data, error } = await supabase.rpc('get_users_with_subscriptions');
      
      if (error) {
        console.error('[RPC ERROR] get_users_with_subscriptions failed:', {
          message: error.message,
          details: (error as any).details,
          hint: (error as any).hint
        });
        throw error;
      }
      
      console.log('[RPC] Success, returned', data?.length || 0, 'records');
      return data;
    } catch (err) {
      console.error('[RPC CATCH] getUsersWithSubscriptions exception:', err);
      throw err;
    }
  },

  async getSubscriptions() {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*');
    if (error) throw error;
    return data;
  },

  async extendTrialSecure(userId: string, days: number, justification: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase.rpc('extend_trial_secure', {
      target_user_id: userId,
      days_to_add: days,
      justification,
      admin_id: user.id
    });
    if (error) throw error;
    return data;
  },

  async upgradePlanSecure(userId: string, newPlanId: string, justification: string = 'Admin upgrade') {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    try {
      console.log('[RPC] Calling upgrade_plan_secure...', { userId, newPlanId });
      
      const { data, error } = await supabase.rpc('upgrade_plan_secure', {
        target_user_id: userId,
        new_plan_id: newPlanId,
        justification,
        admin_id: user.id
      });

      if (error) {
        console.error('[RPC ERROR] upgrade_plan_secure failed:', {
          message: error.message,
          code: error.code,
          details: (error as any).details
        });
        throw error;
      }

      console.log('[RPC] Plan upgrade successful:', data);
      return data;
    } catch (err: any) {
      console.error('[RPC CATCH] upgradePlanSecure exception:', err);
      throw err;
    }
  },

  // === DEVICES ===

  async getActiveDevices() {
    try {
      console.log('[RPC] Calling get_active_devices...');
      const { data, error } = await supabase.rpc('get_active_devices');
      
      if (error) {
        console.error('[RPC ERROR] get_active_devices failed:', {
          message: error.message,
          details: (error as any).details
        });
        throw error;
      }
      
      console.log('[RPC] Success, returned', data?.length || 0, 'devices');
      return data;
    } catch (err) {
      console.error('[RPC CATCH] getActiveDevices exception:', err);
      throw err;
    }
  },

  async blockDeviceSecure(deviceHash: string, justification: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase.rpc('block_device_secure', {
      target_device_hash: deviceHash,
      justification,
      admin_id: user.id
    });
    if (error) throw error;
    return data;
  },

  // FIX: Added 'justification' parameter
  async unblockDeviceSecure(deviceHash: string, justification: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase.rpc('unblock_device_secure', {
      target_device_hash: deviceHash,
      justification, // <-- Pass it to the RPC
      admin_id: user.id
    });
    if (error) throw error;
    return data;
  },

  // === ADD THIS NEW FUNCTION ===
  async resetDeviceTrialCount(deviceHash: string, justification: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // NOTE: This assumes your RPC function in Supabase is named 'reset_device_trial_secure'
    const { data, error } = await supabase.rpc('reset_device_trial_secure', {
      target_device_hash: deviceHash,
      justification,
      admin_id: user.id
    });
    if (error) throw error;
    return data;
  },
  // ==============================

  // === PLANS ===

  async getPlans() {
    const { data, error } = await supabase
      .from('plans')
      .select('*');
    if (error) throw error;
    return data;
  },
// START: ADD THIS NEW FUNCTION
  async getPlanAnalytics() {
    const { data, error } = await supabase.rpc('get_plan_analytics');
    if (error) throw error;
    return data;
  },
  // END: ADD THIS NEW FUNCTION
  async getPlanById(planId: string) {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single();
    if (error) throw error;
    return data;
  },

  // === AUDIT LOGS ===

  async getAuditLogsSecure(limit: number = 100) {
    const { data, error } = await supabase.rpc('get_audit_logs_secure', {
      p_limit: limit
    });
    if (error) throw error;
    return data;
  },
  async toggleSenderStatusSecure(senderId: string, isActive: boolean) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase.rpc('toggle_sender_status', {
      sender_id: senderId,
      is_active_val: isActive,
      admin_id: user.id
    });
    
    if (error) throw error;
    return data;
  },
  // START: ADD THIS NEW FUNCTION
  async add_sender_secure(
    email: string,
    server: string,
    port: number,
    password: string
  ) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase.rpc('add_sender_secure', {
      smtp_email_addr: email,
      smtp_server: server,
      smtp_port_num: port,
      smtp_password_val: password,
      admin_id: user.id
    });
    if (error) throw error;
    return data;
  },
  // END: ADD THIS NEW FUNCTION
  // START: ADD THIS NEW FUNCTION
  async assignSenderSecure(userId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase.rpc('assign_sender_secure', {
      target_user_id: userId,
      admin_id: user.id
    });
    if (error) throw error;
    return data;
  },
  // END: ADD THIS NEW FUNCTION
async applyPromotionSecure(userId: string, promoCode: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase.rpc('apply_promotion_secure', {
      target_user_id: userId,
      promo_code: promoCode,
      admin_id: user.id
    });
    if (error) throw error;
    return data;
  },
  // === ADMIN ROLES ===
// START: ADD THIS NEW FUNCTION
  async adminSetUserStatusSecure(userId: string, newStatus: string, justification: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase.rpc('admin_set_user_status_secure', {
      target_user_id: userId,
      new_status: newStatus,
      justification: justification,
      admin_id: user.id
    });
    if (error) throw error;
    return data;
  },
  // END: ADD THIS NEW FUNCTION
  async createAdminRole(userId: string, role: 'SuperAdmin' | 'SupportAdmin' | 'ReadOnly') {
    const { data, error } = await supabase
      .from('admin_roles')
      .insert({
        user_id: userId,
        role,
        is_active: true
      })
      .select();
    if (error) throw error;
    return data?.[0];
  },

  async getAdminRoles() {
    const { data, error } = await supabase
      .from('admin_roles')
      .select('*')
      .eq('is_active', true);
    if (error) throw error;
    return data;
  },

  async updateAdminRole(userId: string, role: 'SuperAdmin' | 'SupportAdmin' | 'ReadOnly') {
    const { data, error } = await supabase
      .from('admin_roles')
      .update({ role })
      .eq('user_id', userId)
      .select();
    if (error) throw error;
    return data?.[0];
  },

  async deactivateAdminRole(userId: string) {
    const { data, error } = await supabase
      .from('admin_roles')
      .update({ is_active: false })
      .eq('user_id', userId)
      .select();
    if (error) throw error;
    return data?.[0];
  }
};