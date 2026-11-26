import { bi, type Workspace, type Requirement } from './model';
export const requirements: Requirement[] = [
  {
    id: 'REQ-01',
    policyId: 'POL-01',
    title: bi('Impact assessment', 'Évaluation de l’impact'),
    description: bi(
      'Document the intended use, affected groups, and impact level before deployment.',
      'Documenter l’usage prévu, les groupes touchés et le niveau d’impact avant le déploiement.',
    ),
  },
  {
    id: 'REQ-02',
    policyId: 'POL-01',
    title: bi('Meaningful explanation', 'Explication pertinente'),
    description: bi(
      'Provide a clear explanation of decisions and the factors that informed them.',
      'Fournir une explication claire des décisions et des facteurs qui les ont éclairées.',
    ),
  },
  {
    id: 'REQ-03',
    policyId: 'POL-01',
    title: bi('Human intervention', 'Intervention humaine'),
    description: bi(
      'Name an accountable reviewer and provide a documented escalation path.',
      'Nommer un responsable de l’examen et documenter une procédure d’escalade.',
    ),
  },
  {
    id: 'REQ-04',
    policyId: 'POL-02',
    title: bi('Data minimization', 'Minimisation des données'),
    description: bi(
      'Keep only the personal information required for the approved purpose.',
      'Conserver uniquement les renseignements personnels nécessaires à la finalité approuvée.',
    ),
  },
  {
    id: 'REQ-05',
    policyId: 'POL-03',
    title: bi('Ongoing monitoring', 'Surveillance continue'),
    description: bi(
      'Define monitoring thresholds, review intervals, and a remediation owner.',
      'Définir les seuils de surveillance, les intervalles d’examen et un responsable des correctifs.',
    ),
  },
];
export function seedWorkspace(empty = false): Workspace {
  const systems: Workspace['systems'] = [
    {
      id: 'SYS-001',
      name: bi('Benefits eligibility assistant', 'Assistant d’admissibilité aux prestations'),
      owner: 'Sarah Chen',
      department: bi('Service delivery', 'Prestation de services'),
      risk: 'high',
      status: 'partial',
      purpose: bi(
        'Supports case officers in reviewing benefit applications.',
        'Aide les agents à examiner les demandes de prestations.',
      ),
      updated: '2026-11-24',
    },
    {
      id: 'SYS-002',
      name: bi('Document classification', 'Classification des documents'),
      owner: 'Marc Dubois',
      department: bi('Information management', 'Gestion de l’information'),
      risk: 'low',
      status: 'compliant',
      purpose: bi(
        'Routes incoming documents to the appropriate team.',
        'Achemine les documents entrants vers l’équipe appropriée.',
      ),
      updated: '2026-11-23',
    },
    {
      id: 'SYS-003',
      name: bi('Fraud detection model', 'Modèle de détection de fraude'),
      owner: 'Amira Patel',
      department: bi('Program integrity', 'Intégrité des programmes'),
      risk: 'high',
      status: 'noncompliant',
      purpose: bi(
        'Flags applications for further human review.',
        'Signale les demandes nécessitant un examen humain approfondi.',
      ),
      updated: '2026-11-22',
    },
    {
      id: 'SYS-004',
      name: bi('Public inquiry assistant', 'Assistant aux demandes du public'),
      owner: 'James Wilson',
      department: bi('Client services', 'Services à la clientèle'),
      risk: 'medium',
      status: 'insufficient',
      purpose: bi(
        'Drafts responses for review by service agents.',
        'Prépare des réponses à examiner par les agents de service.',
      ),
      updated: '2026-11-21',
    },
    {
      id: 'SYS-005',
      name: bi('Translation support', 'Aide à la traduction'),
      owner: 'Sophie Martin',
      department: bi('Communications', 'Communications'),
      risk: 'low',
      status: 'compliant',
      purpose: bi(
        'Assists with internal bilingual correspondence.',
        'Aide à la correspondance bilingue interne.',
      ),
      updated: '2026-11-20',
    },
    {
      id: 'SYS-006',
      name: bi('Resource forecasting', 'Prévision des ressources'),
      owner: 'David Lee',
      department: bi('Operations', 'Opérations'),
      risk: 'medium',
      status: 'compliant',
      purpose: bi(
        'Forecasts staffing needs from aggregate data.',
        'Prévoit les besoins en personnel à partir de données agrégées.',
      ),
      updated: '2026-11-20',
    },
    {
      id: 'SYS-007',
      name: bi('Records deduplication', 'Déduplication des dossiers'),
      owner: 'Nora Tremblay',
      department: bi('Information management', 'Gestion de l’information'),
      risk: 'low',
      status: 'na',
      purpose: bi(
        'Matches internal non-personal reference records.',
        'Rapproche les dossiers de référence internes non personnels.',
      ),
      updated: '2026-11-19',
    },
    {
      id: 'SYS-008',
      name: bi('Application triage', 'Triage des demandes'),
      owner: 'Sarah Chen',
      department: bi('Service delivery', 'Prestation de services'),
      risk: 'high',
      status: 'partial',
      purpose: bi(
        'Prioritizes a queue for review by case officers.',
        'Priorise une file de demandes à examiner par les agents.',
      ),
      updated: '2026-11-18',
    },
  ];
  const policies: Workspace['policies'] = [
    {
      id: 'POL-01',
      name: bi('Automated decision-making', 'Prise de décision automatisée'),
      version: '2.1',
      state: 'pending',
      owner: 'Policy office',
    },
    {
      id: 'POL-02',
      name: bi('Privacy & information handling', 'Confidentialité et gestion de l’information'),
      version: '1.3',
      state: 'approved',
      owner: 'Privacy office',
    },
    {
      id: 'POL-03',
      name: bi('Responsible AI standard', 'Norme sur l’IA responsable'),
      version: '1.0',
      state: 'approved',
      owner: 'AI governance team',
    },
  ];
  const assessments: Workspace['assessments'] = systems.slice(0, 6).map((s, i) => ({
    id: `ASM-00${i + 1}`,
    systemId: s.id,
    date: `2026-11-${24 - i}T14:30:00Z`,
    reviewer: ['Sarah Chen', 'Marc Dubois', 'Amira Patel'][i % 3],
    state: i === 0 || i === 2 || i === 3 ? 'pending' : 'approved',
    findings: requirements.map((r, j) => ({
      id: `F-${i}-${j}`,
      requirementId: r.id,
      outcome: j === 1 ? s.status : j === 4 && i === 3 ? 'insufficient' : 'compliant',
      reason:
        s.status === 'compliant' || j !== 1
          ? bi(
              'Reviewed against the linked supporting record.',
              'Examiné à partir du document justificatif lié.',
            )
          : bi(
              'The explanation record does not yet demonstrate all required decision factors.',
              'Le dossier d’explication ne démontre pas encore tous les facteurs de décision requis.',
            ),
    })),
  }));
  const evidence: Workspace['evidence'] = [
    {
      id: 'EVD-001',
      name: 'Impact-assessment-v3.pdf',
      systemId: 'SYS-001',
      requirementId: 'REQ-01',
      type: 'Document',
      date: '2026-11-23',
      owner: 'Sarah Chen',
    },
    {
      id: 'EVD-002',
      name: 'Classification-validation.csv',
      systemId: 'SYS-002',
      requirementId: 'REQ-02',
      type: 'Test report',
      date: '2026-11-22',
      owner: 'Marc Dubois',
    },
    {
      id: 'EVD-003',
      name: 'Human-review-procedure.pdf',
      systemId: 'SYS-001',
      requirementId: 'REQ-03',
      type: 'Record',
      date: '2026-11-21',
      owner: 'Sarah Chen',
    },
  ];
  const tasks: Workspace['tasks'] = [
    {
      id: 'REM-001',
      systemId: 'SYS-001',
      title: bi(
        'Complete decision explanation record',
        'Compléter le dossier d’explication de la décision',
      ),
      owner: 'Sarah Chen',
      due: '2026-12-02',
      state: 'open',
    },
    {
      id: 'REM-002',
      systemId: 'SYS-003',
      title: bi('Document escalation procedure', 'Documenter la procédure d’escalade'),
      owner: 'Amira Patel',
      due: '2026-11-30',
      state: 'in-progress',
    },
    {
      id: 'REM-003',
      systemId: 'SYS-004',
      title: bi('Attach monitoring validation', 'Joindre la validation de surveillance'),
      owner: 'James Wilson',
      due: '2026-12-05',
      state: 'open',
    },
  ];
  return {
    systems: empty ? [] : systems,
    policies,
    assessments: empty ? [] : assessments,
    evidence: empty ? [] : evidence,
    tasks: empty ? [] : tasks,
    audit: empty
      ? []
      : [
          {
            id: 'EVT-001',
            date: '2026-11-24T14:30:00Z',
            actor: 'Sarah Chen',
            action: bi('Assessment submitted for review', 'Évaluation soumise à l’examen'),
            resource: 'ASM-001',
            result: 'Success',
            correlationId: 'corr-demo-2401',
          },
          {
            id: 'EVT-002',
            date: '2026-11-24T13:15:00Z',
            actor: 'Policy office',
            action: bi('Policy revision proposed', 'Révision de politique proposée'),
            resource: 'POL-01',
            result: 'Success',
            correlationId: 'corr-demo-2402',
          },
          {
            id: 'EVT-003',
            date: '2026-11-23T16:10:00Z',
            actor: 'Sarah Chen',
            action: bi('Evidence reference added', 'Référence de preuve ajoutée'),
            resource: 'EVD-001',
            result: 'Success',
            correlationId: 'corr-demo-2301',
          },
        ],
    integrations: [
      { id: 'INT-01', name: 'Document repository', connected: false, synced: null },
      { id: 'INT-02', name: 'Model registry', connected: false, synced: null },
      { id: 'INT-03', name: 'Issue tracker', connected: false, synced: null },
    ],
  };
}
