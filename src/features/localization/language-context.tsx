import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import {
  LANGUAGE_STORAGE_KEY,
  parseAppLanguage,
  translate,
  type AppLanguage,
  type TranslationKey,
} from './translations';

type LocalizationContextValue = {
  language: AppLanguage;
  isLoading: boolean;
  isSaving: boolean;
  hasLoadError: boolean;
  hasSaveError: boolean;
  reloadLanguage: () => Promise<void>;
  saveLanguage: (language: AppLanguage) => Promise<boolean>;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
};

const LocalizationContext = createContext<LocalizationContextValue | null>(null);

export function LocalizationProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<AppLanguage>('en');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [hasSaveError, setHasSaveError] = useState(false);
  const saveInProgress = useRef(false);

  const reloadLanguage = useCallback(async () => {
    setIsLoading(true);
    setHasLoadError(false);
    try {
      const storedValue = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      setLanguage(parseAppLanguage(storedValue));
    } catch {
      setHasLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    void AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)
      .then((storedValue) => {
        if (isMounted) {
          setLanguage(parseAppLanguage(storedValue));
        }
      })
      .catch(() => {
        if (isMounted) {
          setHasLoadError(true);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const saveLanguage = async (nextLanguage: AppLanguage) => {
    if (saveInProgress.current || isLoading || hasLoadError) {
      return false;
    }
    if (nextLanguage === language) {
      return true;
    }

    saveInProgress.current = true;
    setIsSaving(true);
    setHasSaveError(false);
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
      setLanguage(nextLanguage);
      return true;
    } catch {
      setHasSaveError(true);
      return false;
    } finally {
      saveInProgress.current = false;
      setIsSaving(false);
    }
  };

  const t = useCallback(
    (key: TranslationKey, values?: Record<string, string | number>) =>
      translate(language, key, values),
    [language],
  );

  return (
    <LocalizationContext.Provider
      value={{
        language,
        isLoading,
        isSaving,
        hasLoadError,
        hasSaveError,
        reloadLanguage,
        saveLanguage,
        t,
      }}>
      {children}
    </LocalizationContext.Provider>
  );
}

export function useLocalization() {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error('useLocalization must be used within the LocalizationProvider.');
  }
  return context;
}
