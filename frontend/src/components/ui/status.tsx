import { Check, Minus, AlertCircle, Clock, X } from 'lucide-react';
import { outcomeLabels, type Outcome, bi } from '@/features/governance/model';
import { useGovernance } from '@/features/governance/store';
const labels = {
  success: bi('Success', 'Réussite'),
  failed: bi('Failed', 'Échec'),
  ...outcomeLabels,
  low: bi('Low', 'Faible'),
  medium: bi('Medium', 'Moyen'),
  high: bi('High', 'Élevé'),
  approved: bi('Approved', 'Approuvé'),
  pending: bi('Pending review', 'En attente'),
  rejected: bi('Changes requested', 'Modifications demandées'),
  open: bi('Open', 'Ouvert'),
  'in-progress': bi('In progress', 'En cours'),
  closed: bi('Closed', 'Fermé'),
  draft: bi('Draft', 'Brouillon'),
  disconnected: bi('Not connected', 'Non connecté'),
};
export function Status({ value }: { value: Outcome | keyof typeof labels }) {
  const { text } = useGovernance();
  const Icon = ['compliant', 'approved', 'closed', 'success'].includes(value)
    ? Check
    : value === 'na'
    ? Minus
    : ['noncompliant', 'high', 'rejected', 'failed'].includes(value)
    ? X
    : value === 'pending'
    ? Clock
    : AlertCircle;
  return (
    <span className={`status status-${value}`}>
      <Icon size={12} aria-hidden="true" />
      {text(labels[value])}
    </span>
  );
}
