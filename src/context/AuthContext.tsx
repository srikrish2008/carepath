import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserProfile, UserRole, Language } from '../types';
import { storage } from '../services/database/storage';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  isAuthenticated: boolean;
  loginAsDemo: (role: UserRole) => void;
  loginWithEmail: (email: string, name?: string) => Promise<boolean>;
  register: (profile: Partial<UserProfile>) => Promise<boolean>;
  logout: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
}

const STORAGE_AUTH_USER = 'carepath_current_user';

export const DEMO_PATIENT: UserProfile = {
  id: 'usr-demo-patient-01',
  email: 'judgedemo.patient@carepath.example',
  name: 'Alex Rivera (Demo Patient)',
  role: 'patient',
  location: 'Metro City, Central',
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
  email: 'judgedemo.admin@carepath.example',
  name: 'Dr. Sarah Chen (Healthcare Administrator)',
  role: 'admin',
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
    try {
      const saved = localStorage.getItem(STORAGE_AUTH_USER);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    // Default to DEMO_PATIENT for immediate judge exploration!
    return DEMO_PATIENT;
  });

  useEffect(() => {
    if (user) {
      storage.saveUser(user);
      try {
        localStorage.setItem(STORAGE_AUTH_USER, JSON.stringify(user));
      } catch {
        // ignore
      }
    } else {
      try {
        localStorage.removeItem(STORAGE_AUTH_USER);
      } catch {
        // ignore
      }
    }
  }, [user]);

  const loginAsDemo = (role: UserRole) => {
    const profile = role === 'admin' ? DEMO_ADMIN : DEMO_PATIENT;
    setUser(profile);
  };

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

  const register = async (profile: Partial<UserProfile>): Promise<boolean> => {
    if (!profile.email || !profile.email.includes('@')) return false;
    const newUser: UserProfile = {
      id: 'usr-' + Math.random().toString(36).substring(2, 9),
      email: profile.email,
      name: profile.name || 'New Patient',
      role: profile.role || 'patient',
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
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);
    storage.saveUser(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || 'patient',
        isAuthenticated: !!user,
        loginAsDemo,
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
      user: DEMO_PATIENT,
      role: 'patient',
      isAuthenticated: true,
      loginAsDemo: () => {},
      loginWithEmail: async () => true,
      register: async () => true,
      logout: () => {},
      updateProfile: () => {},
    };
  }
  return ctx;
};
