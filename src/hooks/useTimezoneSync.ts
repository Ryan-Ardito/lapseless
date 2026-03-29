import { useEffect, useRef } from 'react';
import { useProfile } from './useProfile';

/**
 * Auto-detects the user's browser timezone and updates their profile
 * if they're still on the default ('America/New_York').
 * Only runs once per session to avoid unnecessary API calls.
 */
export function useTimezoneSync() {
  const { profile, updateProfile } = useProfile();
  const synced = useRef(false);

  useEffect(() => {
    if (synced.current || !profile.timezone) return;
    synced.current = true;

    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (profile.timezone === 'America/New_York' && detected && detected !== 'America/New_York') {
      updateProfile({ timezone: detected });
    }
  }, [profile.timezone]); // eslint-disable-line react-hooks/exhaustive-deps
}
