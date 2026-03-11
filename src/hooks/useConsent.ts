import { useLocalStorage } from './useLocalStorage';

export const CONSENT_VERSION = 2;

export interface ConsentState {
  version: number;
  acceptedAt: string;
  updatedAt: string;
  essential: true;
  documentStorage: boolean;
  notificationData: boolean;
  analytics: boolean;
}

export function useConsent() {
  const [consent, setConsent] = useLocalStorage<ConsentState | null>('lapseless-consent', null);

  const hasConsented = consent !== null && consent.version >= CONSENT_VERSION;
  const isConsentStale = consent !== null && consent.version < CONSENT_VERSION;

  function acceptAll() {
    const now = new Date().toISOString();
    setConsent({
      version: CONSENT_VERSION,
      acceptedAt: now,
      updatedAt: now,
      essential: true,
      documentStorage: true,
      notificationData: true,
      analytics: true,
    });
  }

  function acceptEssentialOnly() {
    const now = new Date().toISOString();
    setConsent({
      version: CONSENT_VERSION,
      acceptedAt: now,
      updatedAt: now,
      essential: true,
      documentStorage: false,
      notificationData: false,
      analytics: false,
    });
  }

  function updateConsent(updates: Partial<Pick<ConsentState, 'documentStorage' | 'notificationData' | 'analytics'>>) {
    setConsent((prev) => {
      const base = prev ?? {
        version: CONSENT_VERSION,
        acceptedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        essential: true as const,
        documentStorage: false,
        notificationData: false,
        analytics: false,
      };
      return {
        ...base,
        ...updates,
        version: CONSENT_VERSION,
        updatedAt: new Date().toISOString(),
      };
    });
  }

  function revokeConsent() {
    setConsent(null);
  }

  return { consent, hasConsented, isConsentStale, acceptAll, acceptEssentialOnly, updateConsent, revokeConsent };
}
