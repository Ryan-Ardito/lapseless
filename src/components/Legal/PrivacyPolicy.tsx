import { Title, Text, Stack, List, Anchor } from '@mantine/core';
import { Link } from 'react-router-dom';
import { LegalPageLayout } from './LegalPageLayout';

export function PrivacyPolicy() {
  return (
    <LegalPageLayout>
      <Stack gap="lg">
        <Title order={1}>Privacy Policy</Title>
        <Text c="dimmed" size="sm">Last updated: March 11, 2026</Text>

        <section>
          <Title order={2} size="h3" mb="xs">Who We Are</Title>
          <Text>
            Lapseless is operated by Data Locality LLC ("we", "us", "our"). We provide a compliance
            and obligation tracking platform that helps businesses manage deadlines, documents, and
            team resources. We are committed to protecting your privacy and handling your data in
            accordance with the General Data Protection Regulation (GDPR), the California Consumer
            Privacy Act as amended by the California Privacy Rights Act (CCPA/CPRA), and other
            applicable US state and international privacy laws.
          </Text>
          <Text mt="xs">
            <strong>Data Controller:</strong> Data Locality LLC<br />
            <strong>Contact:</strong> privacy@datalocalityllc.com
          </Text>
        </section>

        <section>
          <Title order={2} size="h3" mb="xs">Data We Collect</Title>
          <Text mb="xs">We collect and process the following categories of personal data:</Text>
          <List spacing="xs">
            <List.Item><strong>Account Information:</strong> Name, email address, and phone number provided during registration.</List.Item>
            <List.Item><strong>Obligation Data:</strong> Compliance requirements, deadlines, renewal dates, and status information you enter into the platform.</List.Item>
            <List.Item><strong>Documents:</strong> Files you upload and attach to obligations, stored securely on our servers with local caching for offline access.</List.Item>
            <List.Item><strong>PTO & Team Data:</strong> Time-off requests, balances, and team member information.</List.Item>
            <List.Item><strong>Notification Preferences:</strong> Your phone number, email, and preferred notification channels (SMS, email) for deadline reminders.</List.Item>
            <List.Item><strong>Usage Data:</strong> How you interact with the platform, including features used, pages visited, and session duration.</List.Item>
            <List.Item><strong>Device & Browser Data:</strong> Browser type, operating system, and screen resolution for service optimization.</List.Item>
          </List>
        </section>

        <section>
          <Title order={2} size="h3" mb="xs">How We Use Your Data</Title>
          <List spacing="xs">
            <List.Item><strong>Service Delivery:</strong> To provide obligation tracking, document management, PTO tracking, and checklist features.</List.Item>
            <List.Item><strong>Notifications:</strong> To send SMS and email reminders about upcoming deadlines and obligation status changes.</List.Item>
            <List.Item><strong>Analytics:</strong> To understand usage patterns and improve the platform experience.</List.Item>
            <List.Item><strong>Service Improvement:</strong> To develop new features, fix bugs, and optimize performance.</List.Item>
            <List.Item><strong>Support:</strong> To respond to your inquiries and provide technical assistance.</List.Item>
          </List>
        </section>

        <section>
          <Title order={2} size="h3" mb="xs">Legal Basis for Processing (GDPR)</Title>
          <Text mb="xs">For users in GDPR jurisdictions, we process your personal data under the following legal bases:</Text>
          <List spacing="xs">
            <List.Item><strong>Consent (Art. 6(1)(a) GDPR):</strong> For optional data categories such as document storage and notification preferences. You may withdraw consent at any time through your account settings.</List.Item>
            <List.Item><strong>Contractual Necessity (Art. 6(1)(b) GDPR):</strong> To provide the services you have requested, including obligation tracking and deadline management.</List.Item>
            <List.Item><strong>Legitimate Interest (Art. 6(1)(f) GDPR):</strong> For analytics, service improvement, and security purposes, where our interests do not override your fundamental rights.</List.Item>
          </List>
        </section>

        <section>
          <Title order={2} size="h3" mb="xs">Data Storage & Security</Title>
          <List spacing="xs">
            <List.Item><strong>Server-Side Storage:</strong> Your data is stored on our servers with local browser caching for offline access and performance optimization.</List.Item>
            <List.Item><strong>Encryption:</strong> All data transmitted between your browser and our servers is encrypted using TLS 1.3.</List.Item>
            <List.Item><strong>Hosting:</strong> Server-side components are hosted within the United States. For users outside the US, we implement appropriate safeguards for cross-border data transfers, including standard contractual clauses where required.</List.Item>
            <List.Item><strong>Retention:</strong> Your data is retained for as long as your account is active. Upon account deletion, all data is permanently erased within 30 days.</List.Item>
          </List>
        </section>

        <section>
          <Title order={2} size="h3" mb="xs">Data Sharing & Third Parties</Title>
          <Text mb="xs">We share data with the following third-party processors only as necessary to provide our services:</Text>
          <List spacing="xs">
            <List.Item><strong>Twilio:</strong> For SMS notification delivery. Only your phone number and message content are shared.</List.Item>
            <List.Item><strong>SendGrid:</strong> For email notification delivery. Only your email address and message content are shared.</List.Item>
          </List>
          <Text mt="xs">
            We do <strong>not</strong> sell, rent, or trade your personal data to any third parties.
            We do not "sell" or "share" your personal information as those terms are defined by the
            CCPA/CPRA. All third-party processors are bound by data processing agreements that ensure
            compliance with applicable privacy laws.
          </Text>
        </section>

        <section>
          <Title order={2} size="h3" mb="xs">Your Rights Under GDPR</Title>
          <Text mb="xs">As a data subject, you have the following rights:</Text>
          <List spacing="xs">
            <List.Item><strong>Right of Access (Art. 15):</strong> Request a copy of all personal data we hold about you.</List.Item>
            <List.Item><strong>Right to Rectification (Art. 16):</strong> Request correction of inaccurate or incomplete data.</List.Item>
            <List.Item><strong>Right to Erasure (Art. 17):</strong> Request deletion of your personal data ("right to be forgotten").</List.Item>
            <List.Item><strong>Right to Data Portability (Art. 20):</strong> Receive your data in a structured, machine-readable format.</List.Item>
            <List.Item><strong>Right to Restriction (Art. 18):</strong> Request that we limit how we process your data.</List.Item>
            <List.Item><strong>Right to Object (Art. 21):</strong> Object to processing based on legitimate interests.</List.Item>
            <List.Item><strong>Right to Withdraw Consent:</strong> Withdraw any previously given consent at any time without affecting the lawfulness of prior processing.</List.Item>
          </List>
        </section>

        <section>
          <Title order={2} size="h3" mb="xs">Your Rights Under US State Privacy Laws</Title>
          <Text mb="xs">
            If you are a California resident, the California Consumer Privacy Act as amended by the
            California Privacy Rights Act (CCPA/CPRA) provides you with the following rights:
          </Text>
          <List spacing="xs">
            <List.Item><strong>Right to Know:</strong> You may request that we disclose the categories and specific pieces of personal information we have collected about you.</List.Item>
            <List.Item><strong>Right to Delete:</strong> You may request deletion of personal information we have collected from you, subject to certain exceptions.</List.Item>
            <List.Item><strong>Right to Opt-Out of Sale/Sharing:</strong> You have the right to opt out of the "sale" or "sharing" of your personal information. We do not sell or share your personal information.</List.Item>
            <List.Item><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising any of your CCPA/CPRA rights.</List.Item>
            <List.Item><strong>Right to Correct:</strong> You may request correction of inaccurate personal information we maintain about you.</List.Item>
            <List.Item><strong>Right to Limit Use of Sensitive Personal Information:</strong> You may limit our use of sensitive personal information to purposes necessary to provide the Service.</List.Item>
          </List>
          <Text mt="md" mb="xs"><strong>Do Not Sell or Share My Personal Information:</strong> We do not sell or share your personal information as defined by the CCPA/CPRA. No opt-out is necessary, but you may contact us at any time to confirm this.</Text>
          <Text mb="xs"><strong>Categories of Personal Information Collected:</strong> Under CCPA categories, we may collect:</Text>
          <List spacing="xs">
            <List.Item><strong>Identifiers:</strong> Name, email address, phone number.</List.Item>
            <List.Item><strong>Commercial Information:</strong> Records of services obtained (obligation and compliance data).</List.Item>
            <List.Item><strong>Internet or Electronic Network Activity:</strong> Usage data, browser type, and interaction with the Service.</List.Item>
          </List>
          <Text mt="xs">
            We will respond to verifiable consumer requests within 45 days, as required by the CCPA.
          </Text>
          <Text mt="md" size="sm" c="dimmed">
            Residents of Colorado, Connecticut, Virginia, and other states with comprehensive privacy
            laws may also have similar rights under their respective state laws. Please contact us at
            privacy@datalocalityllc.com to exercise your rights.
          </Text>
        </section>

        <section>
          <Title order={2} size="h3" mb="xs">How to Exercise Your Rights</Title>
          <List spacing="xs">
            <List.Item><strong>Export Your Data:</strong> Use the "Export All Data" feature in Settings to download a complete JSON backup of your data.</List.Item>
            <List.Item><strong>Delete Your Data:</strong> Use the "Delete All My Data" option in Settings to permanently erase all your data.</List.Item>
            <List.Item><strong>Manage Consent:</strong> Update your consent preferences at any time through the Privacy & Consent section in Settings.</List.Item>
            <List.Item><strong>Contact Us:</strong> Email privacy@datalocalityllc.com for any data subject request. We will respond within 30 days.</List.Item>
          </List>
        </section>

        <section>
          <Title order={2} size="h3" mb="xs">Cookies & Local Storage</Title>
          <Text>
            Lapseless uses browser localStorage and IndexedDB as an offline cache and for performance
            optimization. We do not use third-party tracking cookies. For full details on what
            data is cached locally and how to manage it, please see
            our <Anchor component={Link} to="/cookies">Cookie Policy</Anchor>.
          </Text>
        </section>

        <section>
          <Title order={2} size="h3" mb="xs">Data Retention</Title>
          <Text>
            Your data is retained while your account is active. Upon account deletion, all data
            is permanently erased within 30 days. Backups are purged within 90 days. Local browser
            caches are supplemental and can be cleared independently through your browser settings
            or the in-app deletion feature.
          </Text>
        </section>

        <section>
          <Title order={2} size="h3" mb="xs">Children's Privacy</Title>
          <Text>
            Lapseless is not directed at individuals under the age of 16. We do not knowingly
            collect personal data from children. If we become aware that we have collected data
            from a child under 16, we will take steps to delete it promptly.
          </Text>
        </section>

        <section>
          <Title order={2} size="h3" mb="xs">Changes to This Policy</Title>
          <Text>
            We may update this Privacy Policy from time to time. We will notify you of material
            changes by displaying a notice within the application or by email. Your continued use
            of Lapseless after changes take effect constitutes acceptance of the updated policy.
          </Text>
        </section>

        <section>
          <Title order={2} size="h3" mb="xs">Contact</Title>
          <Text>
            If you have questions about this Privacy Policy or wish to exercise your data rights,
            please contact us:
          </Text>
          <Text mt="xs">
            <strong>Data Locality LLC</strong><br />
            Email: privacy@datalocalityllc.com
          </Text>
          <Text mt="xs" size="sm" c="dimmed">
            You also have the right to lodge a complaint with your local data protection supervisory
            authority if you believe your data has been processed unlawfully.
          </Text>
        </section>
      </Stack>
    </LegalPageLayout>
  );
}
