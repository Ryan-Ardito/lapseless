import type { Profile } from '../../types/profile';
import { apiFetch } from './client';

export function getProfile(): Promise<Profile> {
  return apiFetch('/api/profile');
}

export function updateProfile(updates: Partial<Profile>): Promise<Profile> {
  return apiFetch('/api/profile', {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export function clearProfile(): Promise<Profile> {
  // No-op in HTTP mode — profile persists on server
  return getProfile();
}
