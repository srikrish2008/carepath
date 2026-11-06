import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile as firebaseUpdateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { UserProfile, StoredUserAccount } from '../../types';
import { storage } from '../database/storage';
import { getOrCreatePatientJourney } from '../journey/journeyTracker';
import {
  getFirebaseAuth,
  getFirebaseFirestore,
  getFirebaseConfigStatus,
  type FirebaseConfigStatus,
} from '../firebase/firebaseConfig';

const STORAGE_ACCOUNTS_KEY = 'carepath_auth_user_accounts';
const STORAGE_SESSION_KEY = 'carepath_auth_active_session';

/**
 * Maps standard Firebase Authentication error codes to patient-friendly explanations.
 */
export function mapFirebaseAuthError(error: unknown): string {
  if (!error) return 'An unexpected authentication error occurred.';
  const code = (error as { code?: string })?.code || '';

  switch (code) {
    case 'auth/invalid-email':
      return 'The email address is invalid. Please check the spelling and try again.';
    case 'auth/user-not-found':
      return 'No account was found with this email address. Please verify or create an account.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please verify your credentials or use password reset.';
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please verify your credentials.';
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists. Please sign in or reset your password.';
    case 'auth/weak-password':
      return 'The password is too weak. Please use at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Access to this account has been temporarily disabled due to multiple failed login attempts. Please try again later or reset your password.';
    case 'auth/user-disabled':
      return 'This user account has been disabled by an administrator.';
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-in is not enabled in Firebase Console. Please enable the Email/Password sign-in method under Authentication.';
    case 'auth/network-request-failed':
      return 'Network connection error while contacting Firebase Authentication. Please check your connectivity.';
    default:
      return (error as { message?: string })?.message || 'Authentication operation failed.';
  }
}

/**
 * Utility: Generates a cryptographically strong random salt for demo offline accounts
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
 * Utility: Hashes a password + salt for offline evaluation mode
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
  let hash = 0;
  for (let i = 0; i < message.length; i++) {
    hash = (hash << 5) - hash + message.charCodeAt(i);
    hash |= 0;
  }
  return 'fallback_' + Math.abs(hash).toString(16);
}

export class AuthService {
  private static instance: AuthService;
  private unsubscribeAuthListener: (() => void) | null = null;

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
      AuthService.instance.ensureDefaultAccounts();
    }
    return AuthService.instance;
  }

  public getConfigStatus(): FirebaseConfigStatus {
    return getFirebaseConfigStatus();
  }

  public isFirebaseLive(): boolean {
    return getFirebaseConfigStatus().isConfigured;
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
   * Seeds demo patient and administrator accounts for evaluation mode
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

  /**
   * Genuine Firebase Authentication Sign In with offline evaluation fallback
   */
  public async signIn(
    email: string,
    password: string
  ): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    if (!password) {
      return { success: false, error: 'Password is required.' };
    }

    const firebaseAuth = getFirebaseAuth();

    // 1. LIVE FIREBASE AUTHENTICATION MODE
    if (firebaseAuth) {
      try {
        const userCredential = await signInWithEmailAndPassword(firebaseAuth, cleanEmail, password);
        const fbUser = userCredential.user;

        // Fetch or hydrate user profile from Cloud Firestore
        const profile = await this.fetchOrCreateFirestoreProfile(fbUser);
        this.setSession(profile);
        return { success: true, user: profile };
      } catch (err: unknown) {
        return { success: false, error: mapFirebaseAuthError(err) };
      }
    }

    // 2. OFFLINE EVALUATION / DEMO FALLBACK MODE
    await this.ensureDefaultAccounts();
    const accounts = this.getAccounts();
    const account = accounts.find((a) => a.user.email.toLowerCase() === cleanEmail);

    if (!account) {
      return { success: false, error: 'No account found with this email address. Please sign up.' };
    }

    const computedHash = await hashPassword(password, account.passwordSalt);
    if (computedHash !== account.passwordHash) {
      return { success: false, error: 'Invalid password. Please verify your credentials or reset your password.' };
    }

    this.setSession(account.user);
    return { success: true, user: account.user };
  }

  /**
   * Genuine Firebase Authentication Sign Up with offline evaluation fallback
   */
  public async signUp(params: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    location?: string;
    preferredService?: string;
    wheelchair?: boolean;
  }): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
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

    const firebaseAuth = getFirebaseAuth();

    // 1. LIVE FIREBASE AUTHENTICATION MODE
    if (firebaseAuth) {
      try {
        const userCredential = await createUserWithEmailAndPassword(firebaseAuth, cleanEmail, params.password);
        const fbUser = userCredential.user;

        try {
          await firebaseUpdateProfile(fbUser, { displayName: cleanName });
        } catch {
          // ignore display name update warning
        }

        const newUser: UserProfile = {
          id: fbUser.uid,
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

        // Persist to Cloud Firestore under users/{uid}
        const db = getFirebaseFirestore();
        if (db) {
          try {
            await setDoc(doc(db, 'users', fbUser.uid), newUser);
          } catch (dbErr) {
            console.warn('Could not write user profile to Firestore (check rules):', dbErr);
          }
        }

        storage.saveUser(newUser);
        getOrCreatePatientJourney(newUser.id);
        this.setSession(newUser);

        return { success: true, user: newUser };
      } catch (err: unknown) {
        return { success: false, error: mapFirebaseAuthError(err) };
      }
    }

    // 2. OFFLINE EVALUATION / DEMO FALLBACK MODE
    await this.ensureDefaultAccounts();
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

    getOrCreatePatientJourney(newUser.id);
    this.setSession(newUser);
    return { success: true, user: newUser };
  }

  /**
   * Password reset: Genuine Firebase sendPasswordResetEmail in live mode, or token in demo mode
   */
  public async requestPasswordReset(
    email: string
  ): Promise<{ success: boolean; token?: string; error?: string; instructions?: string }> {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    const firebaseAuth = getFirebaseAuth();

    // 1. LIVE FIREBASE AUTHENTICATION MODE
    if (firebaseAuth) {
      try {
        await sendPasswordResetEmail(firebaseAuth, cleanEmail);
        return {
          success: true,
          instructions:
            'A secure password reset link has been dispatched to your email address by Firebase Authentication. Please check your inbox and follow the instructions to set your new password.',
        };
      } catch (err: unknown) {
        return { success: false, error: mapFirebaseAuthError(err) };
      }
    }

    // 2. OFFLINE EVALUATION / DEMO FALLBACK MODE
    const accounts = this.getAccounts();
    const account = accounts.find((a) => a.user.email.toLowerCase() === cleanEmail);

    if (!account) {
      return { success: false, error: 'No account associated with this email address.' };
    }

    const token = 'CP-RESET-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    account.resetToken = token;
    account.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    this.saveAccounts(accounts);

    return {
      success: true,
      token,
      instructions: `Evaluation Mode: In live deployment with Firebase, a secure reset email is dispatched. In this offline evaluation mode, token ${token} was generated locally. You may now set a new password.`,
    };
  }

  /**
   * Confirms password reset in demo mode (live Firebase handles this via email action link)
   */
  public async confirmPasswordReset(
    token: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
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

  public async signOut(): Promise<void> {
    const firebaseAuth = getFirebaseAuth();
    if (firebaseAuth) {
      try {
        await firebaseSignOut(firebaseAuth);
      } catch {
        // ignore
      }
    }

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

  /**
   * Helper: Fetches user profile from Firestore or creates it from Firebase user record
   */
  private async fetchOrCreateFirestoreProfile(fbUser: FirebaseUser): Promise<UserProfile> {
    const db = getFirebaseFirestore();
    if (db) {
      try {
        const userDocRef = doc(db, 'users', fbUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const profile = userDocSnap.data() as UserProfile;
          storage.saveUser(profile);
          return profile;
        }
      } catch (err) {
        console.warn('Could not read user profile from Firestore:', err);
      }
    }

    // Check local storage fallback
    const localUser = storage.getUserById(fbUser.uid);
    if (localUser) return localUser;

    // Create minimal profile from Firebase user info
    const isAlex = fbUser.email === 'patient@carepath.example';
    const isAdmin = fbUser.email === 'admin@carepath.example';

    const newProfile: UserProfile = {
      id: fbUser.uid,
      email: fbUser.email || 'patient@carepath.example',
      name: fbUser.displayName || (isAdmin ? 'Dr. Sarah Chen' : isAlex ? 'Alex Rivera' : 'CarePath Patient'),
      role: isAdmin ? 'admin' : 'patient',
      phone: fbUser.phoneNumber || '+91 98765 00000',
      location: 'Metro City',
      preferredLanguage: 'en',
      accessibilityNeeds: {
        wheelchair: isAlex,
        audioAssistance: false,
        signLanguage: false,
        lowVision: false,
      },
      preferredService: isAdmin ? 'System Administration' : 'Cardiology',
      referralStatus: 'unknown',
      createdAt: new Date().toISOString(),
    };

    if (db) {
      try {
        await setDoc(doc(db, 'users', fbUser.uid), newProfile);
      } catch {
        // ignore
      }
    }

    storage.saveUser(newProfile);
    return newProfile;
  }

  /**
   * Listens to live Firebase Auth state transitions
   */
  public subscribeToAuthState(callback: (user: UserProfile | null) => void): () => void {
    const firebaseAuth = getFirebaseAuth();
    if (!firebaseAuth) {
      return () => {};
    }

    if (this.unsubscribeAuthListener) {
      this.unsubscribeAuthListener();
    }

    this.unsubscribeAuthListener = onAuthStateChanged(firebaseAuth, async (fbUser) => {
      if (fbUser) {
        const profile = await this.fetchOrCreateFirestoreProfile(fbUser);
        this.setSession(profile);
        callback(profile);
      } else {
        callback(null);
      }
    });

    return () => {
      if (this.unsubscribeAuthListener) {
        this.unsubscribeAuthListener();
        this.unsubscribeAuthListener = null;
      }
    };
  }
}

export const authService = AuthService.getInstance();
