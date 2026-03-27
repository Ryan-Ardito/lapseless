import {
  Html, Head, Body, Container, Section, Text, Img, Hr, Link, Preview, Font,
} from '@react-email/components';
import type { ReactNode } from 'react';
import { env } from '../../env';

interface LayoutProps {
  preview: string;
  children: ReactNode;
}

const baseUrl = env.FRONTEND_URL;

export function Layout({ preview, children }: LayoutProps) {
  return (
    <Html>
      <Head>
        <Font
          fontFamily="Inter"
          fallbackFontFamily="Helvetica"
          webFont={{
            url: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hiA.woff2',
            format: 'woff2',
          }}
          fontWeight={400}
          fontStyle="normal"
        />
        <Font
          fontFamily="Inter"
          fallbackFontFamily="Helvetica"
          webFont={{
            url: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fAZ9hiA.woff2',
            format: 'woff2',
          }}
          fontWeight={600}
          fontStyle="normal"
        />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Link href={baseUrl}>
              <Img
                src={`${baseUrl}/greenlogo.png`}
                alt="The Practice Atlas"
                height={32}
                style={{ display: 'block' }}
              />
            </Link>
          </Section>

          <Section style={content}>
            {children}
          </Section>

          <Hr style={divider} />

          <Section style={footer}>
            <Text style={footerText}>
              <Link href={baseUrl} style={footerLink}>The Practice Atlas</Link>
            </Text>
            <Text style={footerMuted}>
              You received this email because you have an account at thepracticeatlas.com
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const body = {
  backgroundColor: '#faf8f5',
  fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
  margin: '0',
  padding: '24px 0',
};

const container = {
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  maxWidth: '560px',
  margin: '0 auto',
};

const header = {
  padding: '24px 24px 0',
};

const content = {
  padding: '24px',
};

const divider = {
  borderColor: '#c5d9cc',
  margin: '0 24px',
};

const footer = {
  padding: '16px 24px 24px',
};

const footerText = {
  color: '#406d50',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '0',
};

const footerLink = {
  color: '#406d50',
  textDecoration: 'none',
};

const footerMuted = {
  color: '#999',
  fontSize: '12px',
  lineHeight: '18px',
  margin: '4px 0 0',
};
