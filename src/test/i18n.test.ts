import { describe, it, expect } from 'vitest';
import { en } from '../i18n/en';
import { ta } from '../i18n/ta';

describe('Module J — Internationalization & Tamil Language Switching Tests (7 tests)', () => {
  it('1. verifies default English language configuration and tagline', () => {
    expect(en.app.name).toBe('CarePath');
    expect(en.app.tagline).toBe('Healthcare access, without the confusion.');
    expect(en.landing.heroTitle).toBe('Healthcare access, without the confusion.');
  });

  it('2. verifies complete Tamil translation for app identity and tagline', () => {
    expect(ta.app.name).toContain('கேர்பாத்');
    expect(ta.app.tagline).toContain('குழப்பமில்லாத மருத்துவ சேவை அணுகல்');
  });

  it('3. translates all core navigation items into Tamil', () => {
    expect(ta.nav.overview).toBe('கண்ணோட்டம்');
    expect(ta.nav.findCare).toBe('சிகிச்சை தேடல்');
    expect(ta.nav.appointments).toBe('முன்பதிவுகள்');
    expect(ta.nav.documents).toBe('ஆவணங்கள்');
    expect(ta.nav.journey).toBe('எனது பயணம்');
    expect(ta.nav.aiAssistant).toBe('கேர்பாத் AI');
    expect(ta.nav.adminConsole).toBe('நிர்வாக மையம்');
  });

  it('4. translates all 7 patient journey stages into Tamil', () => {
    for (let s = 1; s <= 7; s++) {
      const stage = ta.journey.stages[s as 1 | 2 | 3 | 4 | 5 | 6 | 7];
      expect(stage).toBeDefined();
      expect(stage.name.length).toBeGreaterThan(0);
      expect(stage.desc.length).toBeGreaterThan(0);
    }
  });

  it('5. translates C09 concurrency terms and race condition notices into Tamil', () => {
    expect(ta.booking.concurrencyNotice).toContain('C09');
    expect(ta.booking.concurrencyNotice).toContain('இரட்டை முன்பதிவைத் தடுக்கிறது');
    expect(ta.admin.concurrencyLab.title).toContain('இரண்டு நபர்கள், ஒரு ஆதாரம்');
  });

  it('6. translates C02 truth conflict and source reconciliation notices into Tamil', () => {
    expect(ta.admin.conflictLab.title).toContain('உண்மை முரண்படுகிறது');
    expect(ta.discovery.conflictWarning).toContain('முரண்பாடு');
  });

  it('7. verifies key parity between English and Tamil translation dictionaries', () => {
    const enNavKeys = Object.keys(en.nav).sort();
    const taNavKeys = Object.keys(ta.nav).sort();
    expect(enNavKeys).toEqual(taNavKeys);

    const enLandingKeys = Object.keys(en.landing.features).sort();
    const taLandingKeys = Object.keys(ta.landing.features).sort();
    expect(enLandingKeys).toEqual(taLandingKeys);
  });
});
