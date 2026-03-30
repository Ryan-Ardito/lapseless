import { Stack } from '@mantine/core';
import { useAppMode } from '../../contexts/AppModeContext';
import { useOrgContext } from '../../contexts/OrgContext';
import { BillingSection } from './BillingSection';
import { TeamSection } from './TeamSection';
import { OrgSettingsSection } from './OrgSettingsSection';
import { DataManagementSection } from '../Account/DataManagementSection';

export function Settings() {
  const mode = useAppMode();
  const { canManageMembers } = useOrgContext();

  return (
    <Stack gap="lg">
      {mode === 'demo' && (
        <>
          <BillingSection />
          <DataManagementSection mode="demo" />
        </>
      )}

      {mode === 'production' && canManageMembers && <TeamSection />}

      {mode === 'production' && <OrgSettingsSection />}
    </Stack>
  );
}
