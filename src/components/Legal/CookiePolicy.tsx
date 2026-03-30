import { Title, Text, Stack, Table, Anchor } from '@mantine/core';
import { Link } from '@tanstack/react-router';
import { LegalPageLayout } from './LegalPageLayout';

const STORAGE_KEYS = [
  { key: 'practiceatlas-obligations', purpose: 'Caches your tracked obligations, deadlines, and compliance requirements for offline access.' },
  { key: 'practiceatlas-notifications', purpose: 'Caches notification preferences and reminder settings (phone, email, channels).' },
  { key: 'practiceatlas-pto', purpose: 'Caches PTO requests, balances, and time-off records for offline access.' },
  { key: 'practiceatlas-pto-config', purpose: 'Caches PTO configuration such as accrual rates and policy settings.' },
  { key: 'practiceatlas-checklists', purpose: 'Caches checklist items and progress for each obligation.' },
  { key: 'practiceatlas-standalone-docs', purpose: 'Caches document metadata for files uploaded outside of obligations.' },
  { key: 'practiceatlas-profile', purpose: 'Caches user profile data such as name, email, phone number, job title, and timezone.' },
  { key: 'practiceatlas-history', purpose: 'Caches user action history entries for offline access.' },
  { key: 'practiceatlas-consent', purpose: 'Stores your privacy consent preferences and timestamp.' },
  { key: 'practiceatlas-docs (IndexedDB)', purpose: 'Caches file contents (blobs) of uploaded documents for offline access.' },
];

export function CookiePolicy() {
  return (
    <LegalPageLayout>
      <Stack gap="lg">
        <Title order={1}>Cookie Policy</Title>
        <Text c="dimmed" size="sm">Last updated: March 29, 2026</Text>

        <section>
          <Title order={2} size="h3" mb="xs">What Are Cookies & Local Storage</Title>
          <Text>
            Cookies are small text files stored on your device by websites you visit. Local storage
            (including localStorage and IndexedDB) is a browser feature that allows websites to store
            data directly on your device. Unlike cookies, local storage data is not sent to servers
            with every request.
          </Text>
          <Text mt="xs">
            The Practice Atlas uses <strong>browser local storage</strong> for offline functionality and
            performance caching. Authoritative data is stored server-side; local storage provides
            a fast, offline-capable experience by caching data in your browser.
          </Text>
        </section>

        <section>
          <Title order={2} size="h3" mb="xs">What We Store</Title>
          <Text mb="xs">
            The following table lists local storage keys used by The Practice Atlas for caching and offline functionality:
          </Text>
          <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Storage Key</Table.Th>
                <Table.Th>Purpose</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {STORAGE_KEYS.map((item) => (
                <Table.Tr key={item.key}>
                  <Table.Td><code>{item.key}</code></Table.Td>
                  <Table.Td>{item.purpose}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </section>

        <section>
          <Title order={2} size="h3" mb="xs">Cookies Set by Our Server</Title>
          <Text mb="xs">
            The Practice Atlas sets the following first-party, HTTP-only cookies for authentication and security purposes. These cookies are essential for the service to function and cannot be disabled.
          </Text>
          <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Cookie Name</Table.Th>
                <Table.Th>Purpose</Table.Th>
                <Table.Th>Duration</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              <Table.Tr>
                <Table.Td><code>session</code></Table.Td>
                <Table.Td>Authenticates your session so you remain signed in.</Table.Td>
                <Table.Td>30 days</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td><code>oauth_state</code></Table.Td>
                <Table.Td>Temporary token used during the Google sign-in flow for security (CSRF protection).</Table.Td>
                <Table.Td>10 minutes</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td><code>oauth_code_verifier</code></Table.Td>
                <Table.Td>Temporary token used during the Google sign-in flow for security (PKCE).</Table.Td>
                <Table.Td>10 minutes</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td><code>oauth_redirect</code></Table.Td>
                <Table.Td>Temporarily stores the page you were on before signing in so you are redirected back after authentication.</Table.Td>
                <Table.Td>10 minutes</Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td><code>pending_2fa</code></Table.Td>
                <Table.Td>Temporary token used during two-factor authentication verification.</Table.Td>
                <Table.Td>5 minutes</Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
          <Text mt="xs" size="sm" c="dimmed">
            All cookies are HTTP-only (not accessible to JavaScript), use the Secure flag in production, and are set with SameSite=Lax to prevent cross-site request forgery.
          </Text>
        </section>

        <section>
          <Title order={2} size="h3" mb="xs">No Third-Party Cookies</Title>
          <Text>
            The Practice Atlas does <strong>not</strong> use any third-party cookies or tracking technologies.
            We do not embed third-party advertising or social media trackers. If you have granted
            analytics consent, we may use first-party analytics to understand usage patterns and
            improve the service. All data storage is first-party.
          </Text>
        </section>

        <section>
          <Title order={2} size="h3" mb="xs">How to Control Storage</Title>
          <Text mb="xs">You have full control over the data cached by The Practice Atlas:</Text>
          <Text>
            <strong>In-App Controls:</strong> Use the "Delete Account" feature in Account Settings to
            remove your account and all Practice Atlas data. You can also manage individual consent
            categories in the Privacy & Consent section of Settings.
          </Text>
          <Text mt="xs">
            <strong>Browser Controls:</strong> You can clear localStorage and IndexedDB data through
            your browser's developer tools or privacy settings. In most browsers, navigate to
            Settings → Privacy → Clear browsing data, and select "Cookies and site data" or
            "Local storage."
          </Text>
          <Text mt="xs">
            <strong>Note:</strong> Clearing local browser caches will remove offline access to your
            data until it is re-synced. Your authoritative data remains stored server-side. We
            recommend exporting your data first using the backup feature in Settings.
          </Text>
          <Text mt="xs">
            For information about your rights under US state privacy laws including the CCPA, please
            see our <Anchor component={Link} to="/privacy">Privacy Policy</Anchor>.
          </Text>
        </section>

        <section>
          <Title order={2} size="h3" mb="xs">Changes to This Policy</Title>
          <Text>
            We may update this Cookie Policy from time to time. Changes will be posted on this page
            with an updated revision date. For details on how we handle your data overall, please
            see our <Anchor component={Link} to="/privacy">Privacy Policy</Anchor>.
          </Text>
        </section>

        <section>
          <Title order={2} size="h3" mb="xs">Contact</Title>
          <Text>
            If you have questions about our use of cookies and local storage, please contact us:
          </Text>
          <Text mt="xs">
            <strong>Data Locality LLC</strong><br />
            Email: privacy@datalocalityllc.com
          </Text>
        </section>
      </Stack>
    </LegalPageLayout>
  );
}
