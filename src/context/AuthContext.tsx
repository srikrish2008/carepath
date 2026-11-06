import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserProfile, UserRole, Language } from '../types';
import { storage } from '../services/database/storage';
import { authService } from '../services/auth/authService';
import type { FirebaseConfigStatus } from '../services/firebase/firebaseConfig';

export interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  isAuthenticated: boolean;
  isFirebaseLive: boolean;
  firebaseStatus: FirebaseConfigStatus;
  loginAsDemo: (role: UserRole) => Promise<void>;
  loginWithPassword: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  registerWithPassword: (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    location?: string;
    preferredService?: string;
    wheelchair?: boolean;
  }) => Promise<{ success: boolean; error?: string }>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; token?: string; error?: string; instructions?: string }>;
  confirmPasswordReset: (token: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  loginWithEmail: (email: string, name?: string) => Promise<boolean>;
  register: (profile: Partial<UserProfile>) => Promise<boolean>;
  logout: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
}

const STORAGE_AUTH_USER = 'carepath_current_user';

export const DEMO_PATIENT: UserProfile = {
  id: 'usr-demo-patient-01',
  email: 'patient@carepath.example',
  name: 'Alex Rivera',
  role: 'patient',
  phone: '+91 98765 43210',
  location: 'Metro City, Central District',
  preferredLanguage: 'en',
  accessibilityNeeds: {
    wheelchair: true,
    audioAssistance: false,
    signLanguage: false,
    lowVision: false,
  },
  preferredService: 'Cardiology',
  referralStatus: 'has_referral',
  preferredDateRange: {
    startDate: '2026-11-09',
    endDate: '2026-11-15',
  },
  createdAt: '2026-11-01T08:00:00Z',
};

export const DEMO_ADMIN: UserProfile = {
  id: 'usr-demo-admin-01',
  email: 'admin@carepath.example',
  name: 'Dr. Sarah Chen (Healthcare Administrator)',
  role: 'admin',
  phone: '+91 98765 00000',
  location: 'Metro City Regional Authority',
  preferredLanguage: 'en',
  accessibilityNeeds: {
    wheelchair: false,
    audioAssistance: false,
    signLanguage: false,
    lowVision: false,
  },
  preferredService: 'System Administration',
  referralStatus: 'has_referral',
  createdAt: '2026-10-15T08:00:00Z',
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    // Check authService session first, then fallback to stored user
    const currentSession = authService.getCurrentUser();
    if (currentSession) return currentSession;
    try {
      const saved = localStorage.getItem(STORAGE_AUTH_USER);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return null;
  });

  useEffect(() => {
    // Listen to live Firebase Auth state transitions
    const unsubscribe = authService.subscribeToAuthState((firebaseProfile) => {
      if (firebaseProfile) {
        setUser(firebaseProfile);
      }
    });
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user) {
      storage.saveUser(user);
      authService.setSession(user);
      try {
        localStorage.setItem(STORAGE_AUTH_USER, JSON.stringify(user));
      } catch {
        // ignore
      }
    } else {
      authService.signOut();
      try {
        localStorage.removeItem(STORAGE_AUTH_USER);
      } catch {
        // ignore
      }
    }
  }, [user]);

  const loginAsDemo = async (role: UserRole) => {
    const email = role === 'admin' ? 'admin@carepath.example' : 'patient@carepath.example';
    const password = role === 'admin' ? 'AdminPass123!' : 'Password123!';
    const res = await authService.signIn(email, password);
    if (res.success && res.user) {
      setUser(res.user);
    } else {
      // Fallback
      setUser(role === 'admin' ? DEMO_ADMIN : DEMO_PATIENT);
    }
  };

  const loginWithPassword = async (email: string, password: string) => {
    const res = await authService.signIn(email, password);
    if (res.success && res.user) {
      setUser(res.user);
      return { success: true };
    }
    return { success: false, error: res.error || 'Authentication failed.' };
  };

  const registerWithPassword = async (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    location?: string;
    preferredService?: string;
    wheelchair?: boolean;
  }) => {
    const res = await authService.signUp(data);
    if (res.success && res.user) {
      setUser(res.user);
      return { success: true };
    }
    return { success: false, error: res.error || 'Registration failed.' };
  };

  const requestPasswordReset = async (email: string) => {
    return authService.requestPasswordReset(email);
  };

  const confirmPasswordReset = async (token: string, newPassword: string) => {
    return authService.confirmPasswordReset(token, newPassword);
  };

  // Backward compatibility method for existing tests
  const loginWithEmail = async (email: string, name?: string): Promise<boolean> => {
    if (!email || !email.includes('@')) return false;
    const existing = storage.getUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      setUser(existing);
    } else {
      const newUser: UserProfile = {
        id: 'usr-' + Math.random().toString(36).substring(2, 9),
        email,
        name: name || email.split('@')[0],
        role: 'patient',
        phone: '+91 98765 00000',
        location: 'Metro City',
        preferredLanguage: 'en',
        accessibilityNeeds: { wheelchair: false, audioAssistance: false, signLanguage: false, lowVision: false },
        preferredService: 'General Practice',
        referralStatus: 'unknown',
        createdAt: new Date().toISOString(),
      };
      storage.saveUser(newUser);
      setUser(newUser);
    }
    return true;
  };

  // Backward compatibility method for existing tests
  const register = async (profile: Partial<UserProfile>): Promise<boolean> => {
    if (!profile.email || !profile.email.includes('@')) return false;
    const newUser: UserProfile = {
      id: 'usr-' + Math.random().toString(36).substring(2, 9),
      email: profile.email,
      name: profile.name || 'New Patient',
      role: profile.role || 'patient',
      phone: profile.phone || '+91 98765 00000',
      location: profile.location || 'Metro City',
      preferredLanguage: (profile.preferredLanguage as Language) || 'en',
      accessibilityNeeds: profile.accessibilityNeeds || {
        wheelchair: false,
        audioAssistance: false,
        signLanguage: false,
        lowVision: false,
      },
      preferredService: profile.preferredService || 'Cardiology',
      referralStatus: profile.referralStatus || 'unknown',
      createdAt: new Date().toISOString(),
    };
    storage.saveUser(newUser);
    setUser(newUser);
    return true;
  };

  const logout = () => {
    setUser(null);
    authService.signOut();
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);
    storage.saveUser(updated);
  };

  const firebaseStatus = authService.getConfigStatus();
  const isFirebaseLive = authService.isFirebaseLive();

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || 'patient',
        isAuthenticated: !!user,
        isFirebaseLive,
        firebaseStatus,
        loginAsDemo,
        loginWithPassword,
        registerWithPassword,
        requestPasswordReset,
        confirmPasswordReset,
        loginWithEmail,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      user: null,
      role: 'patient',
      isAuthenticated: false,
      isFirebaseLive: false,
      firebaseStatus: {
        isConfigured: false,
        missingKeys: ['VITE_FIREBASE_API_KEY'],
        mode: 'offline_demo',
      },
      loginAsDemo: async () => {},
      loginWithPassword: async () => ({ success: false, error: 'No auth context' }),
      registerWithPassword: async () => ({ success: false, error: 'No auth context' }),
      requestPasswordReset: async () => ({ success: false, error: 'No auth context' }),
      confirmPasswordReset: async () => ({ success: false, error: 'No auth context' }),
      loginWithEmail: async () => true,
      register: async () => true,
      logout: () => {},
      updateProfile: () => {},
    };
  }
  return ctx;
};
