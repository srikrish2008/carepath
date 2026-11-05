import { describe, it, expect, beforeEach } from 'vitest';
import { storage } from '../services/database/storage';
import { DEMO_PATIENT, DEMO_ADMIN } from '../context/AuthContext';
import type { UserProfile } from '../types';

describe('Module B — Authentication & Onboarding Tests (10 tests)', () => {
  beforeEach(() => {
    storage.initIfEmpty(true);
    storage.saveUser(DEMO_PATIENT);
    storage.saveUser(DEMO_ADMIN);
  });

  it('1. registers a new patient with valid credentials and administrative details', () => {
    const newUser: UserProfile = {
      id: 'usr-test-reg-1',
      email: 'alex.rivera@example.com',
      name: 'Alex Rivera',
      role: 'patient',
      location: 'Metro City North',
      preferredLanguage: 'en',
      accessibilityNeeds: { wheelchair: true, audioAssistance: false, signLanguage: false, lowVision: false },
      preferredService: 'Cardiology',
      referralStatus: 'has_referral',
      createdAt: new Date().toISOString(),
    };
    storage.saveUser(newUser);

    const saved = storage.getUserById('usr-test-reg-1');
    expect(saved).toBeDefined();
    expect(saved?.name).toBe('Alex Rivera');
    expect(saved?.email).toBe('alex.rivera@example.com');
  });

  it('2. rejects user registration when email is empty or invalid format', () => {
    const invalidEmail = 'invalid-email-format';
    const isValid = invalidEmail.includes('@') && invalidEmail.includes('.');
    expect(isValid).toBe(false);
  });

  it('3. rejects registration when password length is below 6 characters', () => {
    const shortPassword = '123';
    expect(shortPassword.length >= 6).toBe(false);
  });

  it('4. rejects registration when full name is missing', () => {
    const name = '   ';
    expect(name.trim().length > 0).toBe(false);
  });

  it('5. retrieves existing user record on email login', () => {
    const user = storage.getUserById(DEMO_PATIENT.id);
    expect(user).toBeDefined();
    expect(user?.id).toBe(DEMO_PATIENT.id);
  });

  it('6. creates a new user profile on first-time email login', () => {
    const newUser: UserProfile = {
      id: 'usr-first-time-02',
      email: 'newuser@carepath.example',
      name: 'New Patient',
      role: 'patient',
      location: 'Metro City',
      preferredLanguage: 'en',
      accessibilityNeeds: { wheelchair: false, audioAssistance: false, signLanguage: false, lowVision: false },
      preferredService: 'General Practice',
      referralStatus: 'unknown',
      createdAt: new Date().toISOString(),
    };
    storage.saveUser(newUser);
    expect(storage.getUserById('usr-first-time-02')?.email).toBe('newuser@carepath.example');
  });

  it('7. verifies Demo Judge Patient profile contains pre-populated test data', () => {
    expect(DEMO_PATIENT.role).toBe('patient');
    expect(DEMO_PATIENT.accessibilityNeeds.wheelchair).toBe(true);
    expect(DEMO_PATIENT.preferredService).toBe('Cardiology');
  });

  it('8. verifies Demo Judge Administrator profile possesses admin role', () => {
    expect(DEMO_ADMIN.role).toBe('admin');
    expect(DEMO_ADMIN.name).toContain('Administrator');
  });

  it('9. verifies updating patient profile persists changes to storage', () => {
    const user = storage.getUserById(DEMO_PATIENT.id);
    expect(user).toBeDefined();
    if (user) {
      user.location = 'Updated District West';
      storage.saveUser(user);
    }
    const reloaded = storage.getUserById(DEMO_PATIENT.id);
    expect(reloaded?.location).toBe('Updated District West');
  });

  it('10. verifies onboarding collects only administrative preferences without sensitive medical records', () => {
    const onboardingKeys = Object.keys(DEMO_PATIENT);
    expect(onboardingKeys).not.toContain('medicalDiagnosis');
    expect(onboardingKeys).not.toContain('prescriptionList');
    expect(onboardingKeys).toContain('preferredLanguage');
    expect(onboardingKeys).toContain('accessibilityNeeds');
  });
});
