import { Title, Text, Stack, List, Anchor } from '@mantine/core';
import { Link } from 'react-router-dom';
import { LegalPageLayout } from './LegalPageLayout';

export function TermsOfService() {
  return (
    <LegalPageLayout>
      <Stack gap="lg">
        <Title order={1}>Terms of Service</Title>
        <Text c="dimmed" size="sm">Last updated: March 11, 2026</Text>

        <section>
          <Title order={2} size="h3" mb="xs">1. Acceptance of Terms</Title>
          <Text>
            By accessing or using Lapseless ("the Service"), operated by Data Locality LLC ("we",
            "us", "our"), you agree to be bound by these Terms of Service ("Terms"). If you do not
            agree to these Terms, you must not use the Service. These Terms constitute a legally
            binding agreement between you and Data Locality LLC.
          </Text>
        </section>

        <section>
          <Title order={2} size="h3" mb="xs">2. Description of Service</Title>
          <Text>
            Lapseless is a compliance and obligation tracking platform that enables users to manage
            deadlines, upload and organize documents, track PTO, create checklists, and receive
            notifications about upcoming obligations. Lapseless is a web application with server-side
            data storage and offline functionality through browser caching.
          </Text>
        </section>

        <section>
          <Title order={2} size="h3" mb="xs">3. Account Registration</Title>
          <Text>
            To access certain features, you may be required to create an account. You agree to
            provide accurate, current, and complete information during registration and to keep your
            account information up to date. You are responsible for maintaining the confidentiality
            of your account credentials and for all activities that occur under your account.
          </Text>
        </section>

        <section>
          <Title order={2} size="h3" mb="xs">4. Acceptable Use</Title>
          <Text mb="xs">You agree not to:</Text>
          <List spacing="xs">
            <List.Item>Use the Service for any unlawful purpose or in violation of any applicable laws or regulations.</List.Item>
            <List.Item>Upload malicious files, viruses, or any content that could harm the Service or other users.</List.Item>
            <List.Item>Attempt to gain unauthorized access to any part of the Service or its related systems.</List.Item>
            <List.Item>Interfere with or disrupt the integrity or performance of the Service.</List.Item>
            <List.Item>Use the Service to store or transmit content that infringes on the intellectual property rights of others.</List.Item>
            <List.Item>Reverse engineer, decompile, or disassemble any part of the Service.</List.Item>
          </List>
        </section>

        <section>
          <Title order={2} size="h3" mb="xs">5. Intellectual Property</Title>
          <Text>
            The Service, including its design, code, features, and branding, is the intellectual
            property of Data Locality LLC and is protected by copyright, trademark, and other
            intellectual property laws. You are granted a limited, non-exclusive, non-transferable
            license to use the Service for its intended purpose. This license does not permit you
            to copy, modify, distribute, or create derivative works of the Service.
          </Text>
        </section>

        <section>
          <Title order={2} size="h3" mb="xs">6. User Data & Privacy</Title>
          <Text>
            Your use of the Service is also governed by
            our <Anchor component={Link} to="/privacy">Privacy Policy</Anchor>, which describes how
            we collect, use, and protect your personal data. Our Privacy Policy describes your rights
            under applicable laws, including the California Consumer Privacy Act (CCPA/CPRA) and the
            General Data Protection Regulation (GDPR). By using the Service, you consent to the data
            practices described in the Privacy Policy. You retain ownership of all data you input
            into the Service.
          </Text>
        </section>

        <section>
          <Title order={2} size="h3" mb="xs">7. Data Portability</Title>
          <Text>
            You may export your data at any time using the built-in export feature. Exported data is
            provided in a structured, machine-readable JSON format. You may also delete all your
            data at any time through the Settings page. We are committed to ensuring you maintain
            full control over your data.
          </Text>
        </section>

        <section>
          <Title order={2} size="h3" mb="xs">8. Disclaimers</Title>
          <Text>
            The Service is provided "as is" and "as available" without warranties of any kind,
            whether express or implied, including but not limited to warranties of merchantability,
            fitness for a particular purpose, and non-infringement. We do not warrant that the
            Service will be uninterrupted, error-free, or secure. We do not guarantee that the
            Service will meet your specific compliance or regulatory requirements.
          </Text>
        </section>

        <section>
          <Title order={2} size="h3" mb="xs">9. Limitation of Liability</Title>
          <Text>
            To the maximum extent permitted by law, Data Locality LLC shall not be liable for any
            indirect, incidental, special, consequential, or punitive damages, including but not
            limited to loss of data, loss of profits, or business interruption, arising out of or
            related to your use of the Service. Our total liability for any claim arising from these
            Terms shall not exceed the amount you paid us in the twelve (12) months preceding the claim.
          </Text>
        </section>

        <section>
          <Title order={2} size="h3" mb="xs">10. Termination</Title>
          <Text>
            We may suspend or terminate your access to the Service at any time, with or without
            cause, upon reasonable notice. You may terminate your account at any time by deleting
            your data and ceasing to use the Service. Upon termination, your right to use the
            Service ceases immediately. Provisions that by their nature should survive termination
            (including limitations of liability and intellectual property) shall survive.
          </Text>
        </section>

        <section>
          <Title order={2} size="h3" mb="xs">11. Governing Law</Title>
          <Text>
            These Terms shall be governed by and construed in accordance with the laws of the
            State of Delaware, United States, without regard to its conflict of law provisions.
            Any disputes arising under these Terms shall be resolved in the state or federal courts
            located in Delaware. For users in the European Union, nothing in these Terms affects
            your rights under applicable consumer protection laws of your country of residence.
          </Text>
        </section>

        <section>
          <Title order={2} size="h3" mb="xs">12. Changes to These Terms</Title>
          <Text>
            We reserve the right to modify these Terms at any time. We will notify you of material
            changes by posting updated Terms within the application or by email. Your continued use
            of the Service after changes take effect constitutes acceptance of the revised Terms.
            If you do not agree to the updated Terms, you must stop using the Service.
          </Text>
        </section>

        <section>
          <Title order={2} size="h3" mb="xs">13. Contact</Title>
          <Text>
            If you have questions about these Terms of Service, please contact us:
          </Text>
          <Text mt="xs">
            <strong>Data Locality LLC</strong><br />
            Email: legal@datalocalityllc.com
          </Text>
        </section>
      </Stack>
    </LegalPageLayout>
  );
}
