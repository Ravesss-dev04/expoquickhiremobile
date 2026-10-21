import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import {
  APPLICANT_PREFERENCES_STORAGE_KEY,
  DEFAULT_APPLICANT_PREFERENCES,
  parseApplicantPreferences,
  updateApplicantPreference,
  type ApplicantPreferenceKey,
  type ApplicantPreferences,
} from './preferences';

type SettingsContextValue = {
  preferences: ApplicantPreferences;
  isLoading: boolean;
  isSaving: boolean;
  hasLoadError: boolean;
  hasSaveError: boolean;
  reloadPreferences: () => Promise<void>;
  savePreference: (key: ApplicantPreferenceKey, value: boolean) => Promise<boolean>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function ApplicantSettingsProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<ApplicantPreferences>({
    ...DEFAULT_APPLICANT_PREFERENCES,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [hasSaveError, setHasSaveError] = useState(false);
  const saveInProgress = useRef(false);

  const readPreferences = useCallback(async () => {
    const storedValue = await AsyncStorage.getItem(APPLICANT_PREFERENCES_STORAGE_KEY);
    return parseApplicantPreferences(storedValue);
  }, []);

  const reloadPreferences = useCallback(async () => {
    setIsLoading(true);
    setHasLoadError(false);

    try {
      setPreferences(await readPreferences());
    } catch {
      setHasLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [readPreferences]);

  useEffect(() => {
    let isMounted = true;

    void readPreferences()
      .then((storedPreferences) => {
        if (isMounted) {
          setPreferences(storedPreferences);
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
  }, [readPreferences]);

  const savePreference = async (key: ApplicantPreferenceKey, value: boolean) => {
    if (saveInProgress.current || isLoading || hasLoadError) {
      return false;
    }

    const nextPreferences = updateApplicantPreference(preferences, key, value);
    if (nextPreferences[key] === preferences[key]) {
      return true;
    }

    saveInProgress.current = true;
    setIsSaving(true);
    setHasSaveError(false);

    try {
      await AsyncStorage.setItem(
        APPLICANT_PREFERENCES_STORAGE_KEY,
        JSON.stringify(nextPreferences),
      );
      setPreferences(nextPreferences);
      return true;
    } catch {
      setHasSaveError(true);
      return false;
    } finally {
      saveInProgress.current = false;
      setIsSaving(false);
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        preferences,
        isLoading,
        isSaving,
        hasLoadError,
        hasSaveError,
        reloadPreferences,
        savePreference,
      }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useApplicantSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useApplicantSettings must be used within the ApplicantSettingsProvider.');
  }
  return context;
}
