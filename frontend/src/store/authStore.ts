import { create } from 'zustand';

interface AuthState {
  token: string | null;
  userEmail: string | null;
  userName: string | null;
  userAvatar: string | null;
  userId: string | null;
  isAdmin: boolean;
  permissions: string[];
  isAuthenticated: boolean;
  companyId: string | null;
  companyName: string | null;
  organizationId: string | null;
  refreshToken: string | null;
  setToken: (token: string, refreshToken?: string) => void;
  setRefreshToken: (refreshToken: string) => void;
  setUserProfile: (email: string, name?: string, avatar?: string, id?: string | number, permissions?: string[]) => void;
  setIsAdmin: (isAdmin: boolean) => void;
  setPermissions: (permissions: string[]) => void;
  setContext: (id: string | null, name: string | null, orgId: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('procore_token'),
  userEmail: localStorage.getItem('procore_user_email'),
  userName: localStorage.getItem('procore_user_name'),
  userAvatar: localStorage.getItem('procore_user_avatar'),
  userId: localStorage.getItem('procore_user_id'),
  isAdmin: localStorage.getItem('procore_is_admin') === 'true',
  permissions: JSON.parse(localStorage.getItem('procore_permissions') || '[]'),
  isAuthenticated: !!localStorage.getItem('procore_token'),
  companyId: sessionStorage.getItem('CompanyId'),
  companyName: sessionStorage.getItem('CompanyName'),
  organizationId: sessionStorage.getItem('OrganizationId'),
  refreshToken: localStorage.getItem('procore_refresh_token'),
  setToken: (token, refreshToken) => {
    localStorage.setItem('procore_token', token);
    if (refreshToken) {
      localStorage.setItem('procore_refresh_token', refreshToken);
      set({ token, refreshToken, isAuthenticated: true });
    } else {
      set({ token, isAuthenticated: true });
    }
  },
  setRefreshToken: (refreshToken) => {
    localStorage.setItem('procore_refresh_token', refreshToken);
    set({ refreshToken });
  },
  setUserProfile: (email, name, avatar, id, permissions) => {
    localStorage.setItem('procore_user_email', email);
    if (name) localStorage.setItem('procore_user_name', name);
    if (avatar) localStorage.setItem('procore_user_avatar', avatar);
    if (id) localStorage.setItem('procore_user_id', String(id));
    if (permissions) localStorage.setItem('procore_permissions', JSON.stringify(permissions));
    
    set({ 
      userEmail: email, 
      userName: name || null, 
      userAvatar: avatar || null, 
      userId: id ? String(id) : null,
      permissions: permissions || [] 
    });
  },
  setIsAdmin: (isAdmin) => {
    localStorage.setItem('procore_is_admin', String(isAdmin));
    set({ isAdmin });
  },
  setPermissions: (permissions) => {
    localStorage.setItem('procore_permissions', JSON.stringify(permissions));
    set({ permissions });
  },
  setContext: (id, name, orgId) => {
    set((state) => {
      const newCtx = {
        companyId: id ?? state.companyId,
        companyName: name ?? state.companyName,
        organizationId: orgId ?? state.organizationId,
      };

      if (newCtx.companyId) sessionStorage.setItem('CompanyId', newCtx.companyId);
      if (newCtx.companyName) sessionStorage.setItem('CompanyName', newCtx.companyName);
      if (newCtx.organizationId) sessionStorage.setItem('OrganizationId', newCtx.organizationId);

      return newCtx;
    });
  },
  logout: () => {
    localStorage.removeItem('procore_token');
    localStorage.removeItem('procore_user_email');
    localStorage.removeItem('procore_user_name');
    localStorage.removeItem('procore_user_avatar');
    localStorage.removeItem('procore_user_id');
    localStorage.removeItem('procore_is_admin');
    localStorage.removeItem('procore_permissions');
    localStorage.removeItem('procore_refresh_token');
    sessionStorage.removeItem('dest_company_id');
    sessionStorage.removeItem('dest_company_name');
    sessionStorage.removeItem('dest_company_logo');
    set({
      token: null,
      refreshToken: null,
      userEmail: null,
      userName: null,
      userAvatar: null,
      userId: null,
      isAdmin: false,
      permissions: [],
      isAuthenticated: false,
      companyId: null,
      companyName: null,
      organizationId: null
    });
  },
}));
