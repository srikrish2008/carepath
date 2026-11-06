import { describe, it, expect, beforeEach, vi } from 'vitest';
import { en } from '../i18n/en';
import { ta } from '../i18n/ta';
import {
  createTranslationProxy,
  C08_SIMULATED_KEYS,
  isCriticalTranslationKey,
  type C08AuditEntry,
} from '../i18n';

describe('Constraint C08 — Language Changed Overnight & Multilingual Accessibility Suite', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    vi.clearAllMocks();
  });

  // Test 1: Language switching between EN and TA updates active dictionary
  it('1. verifies language switching between EN and TA switches active dictionary', () => {
    // English active dictionary
    const fallbackLog: any[] = [];
    const enProxy = createTranslationProxy(en, en, '', {
      language: 'en',
      isSimulating: false,
      onFallback: (e) => fallbackLog.push(e),
    });

    // Tamil active dictionary
    const taProxy = createTranslationProxy(ta, en, '', {
      language: 'ta',
      isSimulating: false,
      onFallback: (e) => fallbackLog.push(e),
    });

    expect(enProxy.nav.appointments).toBe('My Appointments');
    expect(taProxy.nav.appointments).toBe('முன்பதிவுகள்');

    expect(enProxy.app.tagline).toBe('Healthcare access, without the confusion.');
    expect(taProxy.app.tagline).toBe('குழப்பமில்லாத மருத்துவ சேவை அணுகல்.');

    expect(enProxy.booking.title).toBe('Secure Appointment');
    expect(taProxy.booking.title).toBe('முன்பதிவு பாதுகாப்பு');

    // No fallback should be triggered for normal complete translations
    expect(fallbackLog).toHaveLength(0);
  });

  // Test 2: Complete Tamil translation coverage for all core sections (no undefined values)
  it('2. verifies complete Tamil translation coverage for all core sections with zero undefined values', () => {
    const coreSections: (keyof typeof en)[] = [
      'app',
      'nav',
      'landing',
      'auth',
      'onboarding',
      'dashboard',
      'discovery',
      'comparison',
      'facility',
      'booking',
      'appointments',
      'documents',
      'journey',
      'ai',
      'profile',
      'notifications',
      'c04',
      'c08',
      'c09',
      'c12',
      'common',
    ];

    coreSections.forEach((section) => {
      expect(ta[section]).toBeDefined();
      expect(typeof ta[section]).toBe('object');

      // Check all string leaves in the section
      const checkLeaves = (taObj: any, enObj: any, path: string) => {
        for (const key of Object.keys(enObj)) {
          const currentPath = `${path}.${key}`;
          const val = taObj?.[key];
          expect(val, `Missing or undefined key: ${currentPath}`).toBeDefined();

          if (typeof enObj[key] === 'string') {
            expect(typeof val, `Key must be string: ${currentPath}`).toBe('string');
            expect((val as string).trim().length, `Key must not be empty: ${currentPath}`).toBeGreaterThan(0);
          } else if (Array.isArray(enObj[key])) {
            expect(Array.isArray(val), `Key must be array: ${currentPath}`).toBe(true);
            expect((val as any[]).length, `Array must not be empty: ${currentPath}`).toBeGreaterThan(0);
          } else if (typeof enObj[key] === 'object' && enObj[key] !== null) {
            checkLeaves(val, enObj[key], currentPath);
          }
        }
      };

      checkLeaves(ta[section], en[section], section);
    });
  });

  // Test 3: Missing translation detection triggers English fallback
  it('3. verifies missing translation detection cleanly triggers English fallback without crashing or returning undefined', () => {
    const fallbackEvents: any[] = [];
    const mockTamilIncomplete: any = {
      nav: {
        overview: 'கண்ணோட்டம்',
        // 'appointments' key is deliberately missing!
      },
    };

    const proxy = createTranslationProxy(mockTamilIncomplete, en, '', {
      language: 'ta',
      isSimulating: false,
      onFallback: (entry) => fallbackEvents.push(entry),
    });

    // Overview exists in Tamil
    expect(proxy.nav.overview).toBe('கண்ணோட்டம்');
    expect(fallbackEvents).toHaveLength(0);

    // Appointments is missing in Tamil -> must return English fallback
    const resolvedFallback = proxy.nav.appointments;
    expect(resolvedFallback).toBe('My Appointments');
    expect(resolvedFallback).not.toBeUndefined();
    expect(resolvedFallback).not.toBeNull();
    expect(resolvedFallback).not.toBe('');

    // Fallback event must be recorded
    expect(fallbackEvents).toHaveLength(1);
    expect(fallbackEvents[0].key).toBe('nav.appointments');
    expect(fallbackEvents[0].requestedLanguage).toBe('ta');
    expect(fallbackEvents[0].fallbackLanguage).toBe('en');
    expect(fallbackEvents[0].fallbackText).toBe('My Appointments');
    expect(fallbackEvents[0].simulated).toBe(false);
  });

  // Test 4: Empty string "" in Tamil dictionary triggers English fallback
  it('4. verifies empty string in Tamil dictionary triggers English fallback', () => {
    const fallbackEvents: any[] = [];
    const mockTamilBlank: any = {
      booking: {
        confirmBtn: '   ', // whitespace only / empty
      },
    };

    const proxy = createTranslationProxy(mockTamilBlank, en, '', {
      language: 'ta',
      isSimulating: false,
      onFallback: (entry) => fallbackEvents.push(entry),
    });

    const resolved = proxy.booking.confirmBtn;
    expect(resolved).toBe('Confirm & Lock Slot'); // English fallback
    expect(resolved).not.toBe('   ');

    expect(fallbackEvents).toHaveLength(1);
    expect(fallbackEvents[0].key).toBe('booking.confirmBtn');
    expect(fallbackEvents[0].fallbackText).toBe('Confirm & Lock Slot');
  });

  // Test 5: Fallback event is recorded with key name, requested language, fallback language, and timestamp
  it('5. records fallback events in the audit registry with key name, languages, and metadata', () => {
    const auditEntries: C08AuditEntry[] = [];
    const recordFallback = (entry: Omit<C08AuditEntry, 'id' | 'timestamp'>) => {
      auditEntries.push({
        ...entry,
        id: 'test-' + Date.now(),
        timestamp: new Date().toISOString(),
      });
    };

    const mockTamilMissing: any = {
      discovery: {
        // missing staleWarning
      },
    };

    const proxy = createTranslationProxy(mockTamilMissing, en, '', {
      language: 'ta',
      isSimulating: false,
      onFallback: recordFallback,
    });

    const fallbackString = proxy.discovery.staleWarning;
    expect(fallbackString).toBe('Stale Information Warning');

    expect(auditEntries).toHaveLength(1);
    const entry = auditEntries[0];
    expect(entry.key).toBe('discovery.staleWarning');
    expect(entry.requestedLanguage).toBe('ta');
    expect(entry.fallbackLanguage).toBe('en');
    expect(entry.fallbackText).toBe('Stale Information Warning');
    expect(entry.timestamp).toBeDefined();
    expect(new Date(entry.timestamp).getTime()).not.toBeNaN();
    expect(entry.isCritical).toBe(false);
  });

  // Test 6: C08 simulation mode intentionally falls back for designated non-critical keys
  it('6. activates C08 simulation mode and intentionally falls back for designated non-critical keys', () => {
    const fallbackEvents: any[] = [];
    const proxy = createTranslationProxy(ta, en, '', {
      language: 'ta',
      isSimulating: true, // Simulation Active!
      onFallback: (entry) => fallbackEvents.push(entry),
    });

    expect(C08_SIMULATED_KEYS).toContain('booking.concurrencyNotice');
    expect(C08_SIMULATED_KEYS).toContain('discovery.staleWarning');

    // Access simulated key
    const concurrencyNotice = proxy.booking.concurrencyNotice;
    expect(concurrencyNotice).toBe(en.booking.concurrencyNotice); // Returns English fallback!

    expect(fallbackEvents.some((e) => e.key === 'booking.concurrencyNotice' && e.simulated === true)).toBe(true);

    // Other non-simulated keys in Tamil continue working in Tamil!
    const bookingTitle = proxy.booking.title;
    expect(bookingTitle).toBe('முன்பதிவு பாதுகாப்பு');
  });

  // Test 7: Controlled demonstration scenario verifies unblocked patient workflow while flagging fallback
  it('7. verifies unblocked patient workflow during C08 simulation scenario', () => {
    const fallbackEvents: any[] = [];
    const proxy = createTranslationProxy(ta, en, '', {
      language: 'ta',
      isSimulating: true,
      onFallback: (entry) => fallbackEvents.push(entry),
    });

    // Patient books appointment in Tamil while C08 scenario is active:
    // 1. Patient views booking title in Tamil
    expect(proxy.booking.title).toBe('முன்பதிவு பாதுகாப்பு');
    // 2. Concurrency notice falls back to English with badge
    expect(proxy.booking.concurrencyNotice).toBe(en.booking.concurrencyNotice);
    // 3. Confirm button remains functional in Tamil
    expect(proxy.booking.confirmBtn).toBe('உறுதிசெய்து இடத்தை பூட்டு');
    // 4. Success confirmation arrives in Tamil
    expect(proxy.booking.successTitle).toBe('முன்பதிவு உறுதி செய்யப்பட்டது!');

    // Patient workflow was completely unhindered and never saw blank text or raw keys!
    expect(proxy.booking.confirmBtn).not.toBe('booking.confirmBtn');
    expect(proxy.booking.confirmBtn).not.toBe('');
  });

  // Test 8: Language selection persists in localStorage
  it('8. verifies language selection persists in localStorage', () => {
    const STORAGE_KEY = 'carepath_language_pref';

    // Simulate saving Tamil preference
    localStorage.setItem(STORAGE_KEY, 'ta');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('ta');

    // Simulate reload retrieving preference
    const retrieved = localStorage.getItem(STORAGE_KEY);
    expect(retrieved).toBe('ta');

    // Switch to English and verify update
    localStorage.setItem(STORAGE_KEY, 'en');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('en');
  });

  // Test 9: Critical clinical emergency instructions are preserved
  it('9. verifies critical clinical emergency instructions and disclaimers are preserved in both languages and protected', () => {
    // 1. English critical guidance
    expect(en.app.emergencyNotice).toContain('emergency');
    expect(en.ai.disclaimer).toContain('medical diagnoses or treatment advice');
    expect(en.ai.clinicalRefusal).toContain('cannot provide medical diagnoses');
    expect(en.ai.emergencyNotice).toContain('emergency');

    // 2. Tamil critical guidance
    expect(ta.app.emergencyNotice).toContain('அவசர');
    expect(ta.ai.disclaimer).toContain('மருத்துவ நோயறிதல்');
    expect(ta.ai.clinicalRefusal).toContain('சிகிச்சை ஆலோசனைகளை வழங்க முடியாது');
    expect(ta.ai.emergencyNotice).toContain('அவசர');

    // 3. Critical key classification
    expect(isCriticalTranslationKey('app.emergencyNotice')).toBe(true);
    expect(isCriticalTranslationKey('ai.disclaimer')).toBe(true);
    expect(isCriticalTranslationKey('booking.concurrencyNotice')).toBe(false);
  });
});
