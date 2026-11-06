import { describe, it, expect, beforeEach } from 'vitest';
import { authService } from '../services/auth/authService';
import { storage } from '../services/database/storage';

describe('Authentication & Patient Identity Experience', () => {
  beforeEach(async () => {
    localStorage.clear();
    storage.initIfEmpty(true);
    await authService.ensureDefaultAccounts();
  });

  it('signs in successfully with seeded demo patient credentials', async () => {
    const res = await authService.signIn('patient@carepath.example', 'Password123!');
    expect(res.success).toBe(true);
    expect(res.user).toBeDefined();
    expect(res.user?.email).toBe('patient@carepath.example');
    expect(res.user?.role).toBe('patient');

    const session = authService.getCurrentUser();
    expect(session?.email).toBe('patient@carepath.example');
  });

  it('rejects sign in with an incorrect password', async () => {
    const res = await authService.signIn('patient@carepath.example', 'WrongPassword!');
    expect(res.success).toBe(false);
    expect(res.error).toContain('Invalid password');
  });

  it('rejects sign in for a non-existent email', async () => {
    const res = await authService.signIn('nobody@carepath.example', 'Password123!');
    expect(res.success).toBe(false);
    expect(res.error).toContain('No account found');
  });

  it('signs up a new patient with validation and creates isolated session', async () => {
    const signupRes = await authService.signUp({
      name: 'Maya Lin',
      email: 'maya.lin@example.com',
      password: 'SecurePass2026!',
      location: 'Metro City, West',
      phone: '+91 91234 56789',
    });

    expect(signupRes.success).toBe(true);
    expect(signupRes.user).toBeDefined();
    expect(signupRes.user?.name).toBe('Maya Lin');
    expect(signupRes.user?.id).toMatch(/^usr-/);

    // Verify session
    const active = authService.getCurrentUser();
    expect(active?.email).toBe('maya.lin@example.com');

    // Verify can sign in with newly created password
    authService.signOut();
    const loginRes = await authService.signIn('maya.lin@example.com', 'SecurePass2026!');
    expect(loginRes.success).toBe(true);
  });

  it('prevents duplicate sign up with the same email', async () => {
    await authService.signUp({
      name: 'User One',
      email: 'duplicate.test@example.com',
      password: 'Password123!',
    });

    const duplicateRes = await authService.signUp({
      name: 'User Two',
      email: 'duplicate.test@example.com',
      password: 'AnotherPassword123!',
    });

    expect(duplicateRes.success).toBe(false);
    expect(duplicateRes.error).toContain('already exists');
  });

  it('rejects passwords shorter than 6 characters during registration', async () => {
    const res = await authService.signUp({
      name: 'Short Pass',
      email: 'short@example.com',
      password: '123',
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain('at least 6 characters');
  });

  it('supports the complete forgot password and reset workflow', async () => {
    const resetReq = await authService.requestPasswordReset('patient@carepath.example');
    expect(resetReq.success).toBe(true);
    expect(resetReq.token).toBeDefined();

    // Confirm password reset
    const confirmRes = await authService.confirmPasswordReset(resetReq.token!, 'BrandNewPassword2026!');
    expect(confirmRes.success).toBe(true);

    // Verify old password fails
    const oldLogin = await authService.signIn('patient@carepath.example', 'Password123!');
    expect(oldLogin.success).toBe(false);

    // Verify new password succeeds
    const newLogin = await authService.signIn('patient@carepath.example', 'BrandNewPassword2026!');
    expect(newLogin.success).toBe(true);
  });

  it('clears session on sign out', () => {
    authService.setSession({
      id: 'test-user',
      email: 'test@example.com',
      name: 'Test',
      role: 'patient',
      location: 'City',
      preferredLanguage: 'en',
      accessibilityNeeds: { wheelchair: false, audioAssistance: false, signLanguage: false, lowVision: false },
      preferredService: 'General',
      referralStatus: 'unknown',
      createdAt: new Date().toISOString(),
    });

    expect(authService.getCurrentUser()).not.toBeNull();
    authService.signOut();
    expect(authService.getCurrentUser()).toBeNull();
  });

  it('translates Firebase error codes to patient-friendly explanations', async () => {
    const { mapFirebaseAuthError } = await import('../services/auth/authService');

    expect(mapFirebaseAuthError({ code: 'auth/user-not-found' })).toContain('No account was found');
    expect(mapFirebaseAuthError({ code: 'auth/wrong-password' })).toContain('Incorrect password');
    expect(mapFirebaseAuthError({ code: 'auth/invalid-credential' })).toContain('Invalid email or password');
    expect(mapFirebaseAuthError({ code: 'auth/email-already-in-use' })).toContain('already exists');
    expect(mapFirebaseAuthError({ code: 'auth/weak-password' })).toContain('at least 6 characters');
    expect(mapFirebaseAuthError({ code: 'auth/network-request-failed' })).toContain('Network connection error');
  });

  it('accurately reports Firebase configuration status when unconfigured in offline mode', () => {
    const status = authService.getConfigStatus();
    expect(status.mode).toBe('offline_demo');
    expect(status.isConfigured).toBe(false);
    expect(status.missingKeys).toContain('VITE_FIREBASE_API_KEY');
    expect(authService.isFirebaseLive()).toBe(false);
  });
});
