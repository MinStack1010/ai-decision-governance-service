import type { Metadata } from 'next';
import { GovernanceProvider } from '@/features/governance/store';
import { AppShell } from '@/components/layout/app-shell';
import './globals.css';
import { MonitoringProvider } from '@/features/monitoring/hooks/monitoring-provider';
export const metadata: Metadata = {
  title: 'AI Governance Hub',
  description:
    'A local demonstration workspace for AI system governance, compliance assessment, and human oversight.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <GovernanceProvider>
          <MonitoringProvider>
            <AppShell>{children}</AppShell>
          </MonitoringProvider>
        </GovernanceProvider>
      </body>
    </html>
  );
}
