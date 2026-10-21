import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { mockApplicantProfile } from './mock-data';
import { loadApplicantSkills, saveApplicantSkills } from './skills';
import type { ApplicantProfile } from './types';

type ProfileContextValue = {
  profile: ApplicantProfile;
  updateProfile: React.Dispatch<React.SetStateAction<ApplicantProfile>>;
  isSkillsLoading: boolean;
  isSkillsSaving: boolean;
  skillsLoadError: string | null;
  skillsSaveError: string | null;
  reloadSkills: () => Promise<void>;
  saveSkills: (skills: readonly string[]) => Promise<boolean>;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<ApplicantProfile>(mockApplicantProfile);
  const [isSkillsLoading, setIsSkillsLoading] = useState(true);
  const [isSkillsSaving, setIsSkillsSaving] = useState(false);
  const [skillsLoadError, setSkillsLoadError] = useState<string | null>(null);
  const [skillsSaveError, setSkillsSaveError] = useState<string | null>(null);
  const isMounted = useRef(true);
  const saveInProgress = useRef(false);

  const reloadSkills = useCallback(async () => {
    setIsSkillsLoading(true);
    setSkillsLoadError(null);

    try {
      const skills = await loadApplicantSkills(AsyncStorage);
      if (isMounted.current) {
        setProfile((current) => ({ ...current, skills }));
      }
    } catch {
      if (isMounted.current) {
        setSkillsLoadError('Saved skills could not be loaded. Retry before changing them.');
      }
    } finally {
      if (isMounted.current) {
        setIsSkillsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    void loadApplicantSkills(AsyncStorage)
      .then((skills) => {
        if (isMounted.current) {
          setProfile((current) => ({ ...current, skills }));
        }
      })
      .catch(() => {
        if (isMounted.current) {
          setSkillsLoadError('Saved skills could not be loaded. Retry before changing them.');
        }
      })
      .finally(() => {
        if (isMounted.current) {
          setIsSkillsLoading(false);
        }
      });

    return () => {
      isMounted.current = false;
    };
  }, []);

  const saveSkills = async (skills: readonly string[]) => {
    if (saveInProgress.current || isSkillsLoading || skillsLoadError) {
      return false;
    }

    saveInProgress.current = true;
    setIsSkillsSaving(true);
    setSkillsSaveError(null);

    try {
      const savedSkills = await saveApplicantSkills(AsyncStorage, skills);
      setProfile((current) => ({ ...current, skills: savedSkills }));
      return true;
    } catch {
      setSkillsSaveError('Your skills could not be saved. Your previous list is unchanged.');
      return false;
    } finally {
      saveInProgress.current = false;
      setIsSkillsSaving(false);
    }
  };

  return (
    <ProfileContext.Provider
      value={{
        profile,
        updateProfile: setProfile,
        isSkillsLoading,
        isSkillsSaving,
        skillsLoadError,
        skillsSaveError,
        reloadSkills,
        saveSkills,
      }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useApplicantProfile() {
  const context = useContext(ProfileContext);

  if (!context) {
    throw new Error('useApplicantProfile must be used within the ProfileProvider.');
  }

  return context;
}
