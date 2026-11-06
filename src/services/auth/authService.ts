import type { UserProfile, StoredUserAccount } from '../../types';
import { storage } from '../database/storage';
import { getOrCreatePatientJourney } from '../journey/journeyTracker';

const STORAGE_ACCOUNTS_KEY = 'carepath_auth_user_accounts';
const STORAGE_SESSION_KEY = 'carepath_auth_active_session';

/**
 * Utility: Generates a cryptographically strong random salt
 */
function generateSalt(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Utility: Hashes a password + salt using SHA-256 via Web Crypto API
 */
async function hashPassword(password: string, salt: string): Promise<string> {
  const message = `${salt}:${password}`;
  if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback string hash for headless test environments without crypto.subtle
  let hash = 0;
  for (let i = 0; i < message.length; i++) {
    hash = (hash << 5) - hash + message.charCodeAt(i);
    hash |= 0;
  }
  return 'fallback_' + Math.abs(hash).toString(16);
}

export class AuthService {
  private static instance: AuthService;

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
      AuthService.instance.ensureDefaultAccounts();
    }
    return AuthService.instance;
  }

  private getAccounts(): StoredUserAccount[] {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_ACCOUNTS_KEY);
        if (raw) return JSON.parse(raw);
      }
    } catch {
      // ignore
    }
    return [];
  }

  private saveAccounts(accounts: StoredUserAccount[]): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_ACCOUNTS_KEY, JSON.stringify(accounts));
      }
    } catch {
      // ignore
    }
  }

  /**
   * Seeds demo patient and administrator accounts with hashed credentials
   */
  public async ensureDefaultAccounts(): Promise<void> {
    const existing = this.getAccounts();
    if (existing.length === 0) {
      const patientSalt = generateSalt();
      const patientHash = await hashPassword('Password123!', patientSalt);

      const adminSalt = generateSalt();
      const adminHash = await hashPassword('AdminPass123!', adminSalt);

      const defaultPatient: StoredUserAccount = {
        user: {
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
          createdAt: '2026-11-01T08:00:00Z',
        },
        passwordSalt: patientSalt,
        passwordHash: patientHash,
      };

      const defaultAdmin: StoredUserAccount = {
        user: {
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
        },
        passwordSalt: adminSalt,
        passwordHash: adminHash,
      };

      this.saveAccounts([defaultPatient, defaultAdmin]);
      storage.saveUser(defaultPatient.user);
      storage.saveUser(defaultAdmin.user);
    }
  }

  public async signIn(email: string, password: string): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    await this.ensureDefaultAccounts();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    if (!password) {
      return { success: false, error: 'Password is required.' };
    }

    const accounts = this.getAccounts();
    const account = accounts.find((a) => a.user.email.toLowerCase() === cleanEmail);

    if (!account) {
      return { success: false, error: 'No account found with this email address. Please sign up.' };
    }

    const computedHash = await hashPassword(password, account.passwordSalt);
    if (computedHash !== account.passwordHash) {
      return { success: false, error: 'Invalid password. Please verify your credentials or reset your password.' };
    }

    // Set persistent session
    this.setSession(account.user);
    return { success: true, user: account.user };
  }

  public async signUp(params: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    location?: string;
    preferredService?: string;
    wheelchair?: boolean;
  }): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    await this.ensureDefaultAccounts();
    const cleanEmail = params.email.trim().toLowerCase();
    const cleanName = params.name.trim();

    if (!cleanName || cleanName.length < 2) {
      return { success: false, error: 'Please enter your full name (at least 2 characters).' };
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    if (!params.password || params.password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    const accounts = this.getAccounts();
    const existing = accounts.find((a) => a.user.email.toLowerCase() === cleanEmail);
    if (existing) {
      return { success: false, error: 'An account with this email address already exists. Please sign in.' };
    }

    const salt = generateSalt();
    const hash = await hashPassword(params.password, salt);

    const newUser: UserProfile = {
      id: 'usr-' + Math.random().toString(36).substring(2, 9),
      email: cleanEmail,
      name: cleanName,
      role: 'patient',
      phone: params.phone || '+91 98765 00000',
      location: params.location || 'Metro City',
      preferredLanguage: 'en',
      accessibilityNeeds: {
        wheelchair: Boolean(params.wheelchair),
        audioAssistance: false,
        signLanguage: false,
        lowVision: false,
      },
      preferredService: params.preferredService || 'General Practice',
      referralStatus: 'unknown',
      createdAt: new Date().toISOString(),
    };

    const newAccount: StoredUserAccount = {
      user: newUser,
      passwordSalt: salt,
      passwordHash: hash,
    };

    accounts.push(newAccount);
    this.saveAccounts(accounts);
    storage.saveUser(newUser);

    // Initialize clean patient journey for the new patient
    getOrCreatePatientJourney(newUser.id);

    this.setSession(newUser);
    return { success: true, user: newUser };
  }

  public async requestPasswordReset(email: string): Promise<{ success: boolean; token?: string; error?: string; instructions?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const accounts = this.getAccounts();
    const account = accounts.find((a) => a.user.email.toLowerCase() === cleanEmail);

    if (!account) {
      return { success: false, error: 'No account associated with this email address.' };
    }

    const token = 'CP-RESET-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    account.resetToken = token;
    account.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour validity

    this.saveAccounts(accounts);

    return {
      success: true,
      token,
      instructions: `Password reset token generated: ${token}. In this demo environment, you may now set a new password.`,
    };
  }

  public async confirmPasswordReset(token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    if (!token || !token.trim()) {
      return { success: false, error: 'Reset token is required.' };
    }

    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters long.' };
    }

    const accounts = this.getAccounts();
    const account = accounts.find((a) => a.resetToken === token.trim());

    if (!account) {
      return { success: false, error: 'Invalid or expired password reset token.' };
    }

    if (account.resetTokenExpiry && new Date().getTime() > new Date(account.resetTokenExpiry).getTime()) {
      return { success: false, error: 'Password reset token has expired. Please request a new one.' };
    }

    const salt = generateSalt();
    const hash = await hashPassword(newPassword, salt);

    account.passwordSalt = salt;
    account.passwordHash = hash;
    delete account.resetToken;
    delete account.resetTokenExpiry;

    this.saveAccounts(accounts);
    return { success: true };
  }

  public signOut(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_SESSION_KEY);
      }
    } catch {
      // ignore
    }
  }

  public getCurrentUser(): UserProfile | null {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_SESSION_KEY);
        if (raw) return JSON.parse(raw);
      }
    } catch {
      // ignore
    }
    return null;
  }

  public setSession(user: UserProfile): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(user));
      }
    } catch {
      // ignore
    }
  }
}

export const authService = AuthService.getInstance();
