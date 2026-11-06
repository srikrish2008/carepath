import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { en } from './en';
import { ta } from './ta';
import type { Language } from '../types';

export type Translations = typeof en;

export interface C08AuditEntry {
  id: string;
  key: string;
  requestedLanguage: Language;
  fallbackLanguage: Language;
  fallbackText: string;
  isCritical: boolean;
  timestamp: string;
  simulated: boolean;
}

export interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  c08SimulationActive: boolean;
  setC08SimulationActive: (active: boolean) => void;
  c08MissingKeys: C08AuditEntry[];
  clearC08AuditLog: () => void;
  isKeyFallback: (key: string) => boolean;
  formatNumber: (n: number) => string;
}

const STORAGE_KEY = 'carepath_language_pref';
const STORAGE_C08_SIM_KEY = 'carepath_c08_sim_active';

/**
 * Designated non-critical translation keys used for the C08 demonstration scenario
 */
export const C08_SIMULATED_KEYS = [
  'booking.concurrencyNotice',
  'discovery.staleWarning',
];

/**
 * Critical clinical & safety keys that require heightened protection
 */
export const C08_CRITICAL_KEYS = [
  'app.emergencyNotice',
  'ai.clinicalRefusal',
  'ai.disclaimer',
];

export function isCriticalTranslationKey(key: string): boolean {
  return C08_CRITICAL_KEYS.some((crit) => key.startsWith(crit));
}

/**
 * Creates a recursive proxy that intercepts property accesses and applies C08 fallback resolution
 */
export function createTranslationProxy(
  activeDict: any,
  fallbackDict: any,
  currentPath: string = '',
  options: {
    language: Language;
    isSimulating: boolean;
    onFallback: (entry: Omit<C08AuditEntry, 'id' | 'timestamp'>) => void;
  }
): any {
  return new Proxy(activeDict || {}, {
    get(_target, prop: string | symbol) {
      if (typeof prop !== 'string') {
        return activeDict?.[prop];
      }

      const fullPath = currentPath ? `${currentPath}.${prop}` : prop;
      const fallbackValue = fallbackDict?.[prop];
      const activeValue = activeDict?.[prop];

      // If resolving an object (nested section), return another proxy
      if (
        (fallbackValue && typeof fallbackValue === 'object' && !Array.isArray(fallbackValue)) ||
        (activeValue && typeof activeValue === 'object' && !Array.isArray(activeValue))
      ) {
        return createTranslationProxy(
          activeValue || {},
          fallbackValue || {},
          fullPath,
          options
        );
      }

      // 1. In English mode, resolve directly from fallbackDict (en)
      if (options.language === 'en') {
        return fallbackValue ?? activeValue ?? '';
      }

      // 2. In Tamil mode: Check if C08 Incomplete Translation Simulation is active for this key
      if (options.isSimulating && C08_SIMULATED_KEYS.includes(fullPath)) {
        options.onFallback({
          key: fullPath,
          requestedLanguage: 'ta',
          fallbackLanguage: 'en',
          fallbackText: String(fallbackValue || ''),
          isCritical: isCriticalTranslationKey(fullPath),
          simulated: true,
        });
        return fallbackValue ?? '';
      }

      // 3. Normal verification: Does the active language (ta) contain a non-empty string?
      if (typeof activeValue === 'string' && activeValue.trim().length > 0) {
        return activeValue;
      }

      // If activeValue is an array (e.g. suggested queries), ensure it's not empty
      if (Array.isArray(activeValue) && activeValue.length > 0) {
        return activeValue;
      }

      // 4. C08 Fallback Resolution: Missing or empty in target language -> Use verified English fallback
      const safeFallback = fallbackValue ?? '';
      options.onFallback({
        key: fullPath,
        requestedLanguage: 'ta',
        fallbackLanguage: 'en',
        fallbackText: String(safeFallback),
        isCritical: isCriticalTranslationKey(fullPath),
        simulated: false,
      });

      return safeFallback;
    },
  });
}

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === 'en' || saved === 'ta') return saved;
      }
    } catch {
      // fallback
    }
    return 'en';
  });

  const [c08SimulationActive, setC08SimulationActiveState] = useState<boolean>(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(STORAGE_C08_SIM_KEY) === 'true';
      }
    } catch {
      // fallback
    }
    return false;
  });

  const [c08MissingKeys, setC08MissingKeys] = useState<C08AuditEntry[]>([]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, lang);
      }
    } catch {
      // ignore
    }
  };

  const setC08SimulationActive = (active: boolean) => {
    setC08SimulationActiveState(active);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_C08_SIM_KEY, String(active));
      }
    } catch {
      // ignore
    }
  };

  const handleFallbackDetected = useCallback((entry: Omit<C08AuditEntry, 'id' | 'timestamp'>) => {
    setC08MissingKeys((prev) => {
      if (prev.some((e) => e.key === entry.key && e.simulated === entry.simulated)) {
        return prev;
      }
      const newEntry: C08AuditEntry = {
        ...entry,
        id: 'c08-' + Math.random().toString(36).substring(2, 8),
        timestamp: new Date().toISOString(),
      };
      return [...prev, newEntry];
    });
  }, []);

  const clearC08AuditLog = useCallback(() => {
    setC08MissingKeys([]);
  }, []);

  const isKeyFallback = useCallback(
    (key: string): boolean => {
      if (language === 'en') return false;
      if (c08SimulationActive && C08_SIMULATED_KEYS.includes(key)) return true;
      return c08MissingKeys.some((e) => e.key === key);
    },
    [language, c08SimulationActive, c08MissingKeys]
  );

  const formatNumber = useCallback(
    (n: number): string => {
      return n.toLocaleString(language === 'ta' ? 'ta-IN' : 'en-US');
    },
    [language]
  );

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  // Construct reactive proxy for `t`
  const t: Translations = useMemo(() => {
    return createTranslationProxy(ta, en, '', {
      language,
      isSimulating: c08SimulationActive,
      onFallback: handleFallbackDetected,
    });
  }, [language, c08SimulationActive, handleFallbackDetected]);

  return (
    <I18nContext.Provider
      value={{
        language,
        setLanguage,
        t,
        c08SimulationActive,
        setC08SimulationActive,
        c08MissingKeys,
        clearC08AuditLog,
        isKeyFallback,
        formatNumber,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    return {
      language: 'en',
      setLanguage: () => {},
      t: en,
      c08SimulationActive: false,
      setC08SimulationActive: () => {},
      c08MissingKeys: [],
      clearC08AuditLog: () => {},
      isKeyFallback: () => false,
      formatNumber: (n) => String(n),
    };
  }
  return context;
};

/**
 * Reusable visual badge displaying English fallback status for C08
 */
export const C08FallbackBadge: React.FC<{
  translationKey: string;
  className?: string;
}> = ({ translationKey, className = '' }) => {
  const { isKeyFallback, language } = useI18n();

  if (language === 'en' || !isKeyFallback(translationKey)) {
    return null;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-mono shadow-2xs ${className}`}
      title={`Constraint C08: Incomplete Tamil translation for key '${translationKey}'. English fallback safely displayed without breaking workflow.`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
      <span>EN Fallback (C08)</span>
    </span>
  );
};
