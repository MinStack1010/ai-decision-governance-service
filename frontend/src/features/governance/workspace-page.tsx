'use client';
import { MonitoringDashboard } from '../monitoring/components/dashboard';
import { Overview, Registry } from './overview-registry';
import { Policies, Assessments, Impact } from './policies-assessments';
import {
  EvidencePage,
  Remediation,
  Risks,
  AuditLogs,
  Integrations,
  Reports,
  SettingsPage,
} from './evidence-operations';
import { Traceability } from './traceability';
import { useGovernance } from './store';
export function WorkspacePage({ module }: { module: string }) {
  const { org } = useGovernance();
  return <WorkspaceContent key={org} module={module} />;
}
function WorkspaceContent({ module }: { module: string }) {
  switch (module) {
    case 'dashboard':
      return <Overview />;
    case 'monitoring':
      return <MonitoringDashboard />;
    case 'registry':
      return <Registry />;
    case 'policies':
      return <Policies />;
    case 'assessments':
      return <Assessments />;
    case 'impact':
      return <Impact />;
    case 'evidence':
      return <EvidencePage />;
    case 'traceability':
      return <Traceability />;
    case 'risks':
      return <Risks />;
    case 'reviews':
      return <Assessments reviewQueue />;
    case 'remediation':
      return <Remediation />;
    case 'audit':
      return <AuditLogs />;
    case 'integrations':
      return <Integrations />;
    case 'reports':
      return <Reports />;
    case 'settings':
      return <SettingsPage />;
    default:
      return null;
  }
}
