import type { Profile } from '../../types/profile';
import { getItem, setItem, simulateAsync } from './client';

const KEY = 'lapseless-profile';

const defaultProfile: Profile = {
  name: '',
  email: '',
  phone: '',
  jobTitle: '',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};

export function getProfile(): Promise<Profile> {
  return simulateAsync(() => getItem<Profile>(KEY, defaultProfile));
}

export function updateProfile(updates: Partial<Profile>): Promise<Profile> {
  return simulateAsync(() => {
    const profile = getItem<Profile>(KEY, defaultProfile);
    const updated = { ...profile, ...updates };
    setItem(KEY, updated);
    return updated;
  });
}

export function clearProfile(): Promise<Profile> {
  return simulateAsync(() => {
    setItem(KEY, defaultProfile);
    return defaultProfile;
  });
}
