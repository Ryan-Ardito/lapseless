import { useCallback, useMemo } from 'react';
import { useLocalStorage } from './useLocalStorage';
import type { Profile } from '../types/profile';

const defaultProfile: Profile = {
  name: '',
  email: '',
  phone: '',
  jobTitle: '',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};

export function useProfile() {
  const [profile, setProfile] = useLocalStorage<Profile>('lapseless-profile', defaultProfile);

  const updateProfile = useCallback(
    (partial: Partial<Profile>) => {
      setProfile((prev) => ({ ...prev, ...partial }));
    },
    [setProfile],
  );

  const clearProfile = useCallback(() => {
    setProfile(defaultProfile);
  }, [setProfile]);

  const initials = useMemo(() => {
    const parts = profile.name.trim().split(/\s+/);
    if (parts.length === 0 || parts[0] === '') return '';
    return parts
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join('');
  }, [profile.name]);

  const hasProfile = profile.name.trim().length > 0;

  return { profile, updateProfile, clearProfile, initials, hasProfile };
}
