'use client';
import { useState, useEffect, useId, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FileText, Check, GitCompareArrows, Upload, Bot, RefreshCw, ShieldCheck } from 'lucide-react';
import { useGovernance } from './store';
import {
  bi,
  outcomes,
  outcomeLabels,
  assessmentOutcome,
  type Workspace,
  type Assessment,
  type Outcome,
} from './model';
import { requirements } from './fixtures';
import { addAssessment, reviewFinding, recordDecision, applyAutomatedAssessment } from './workflows';
import { PageHeader, Notice, RecordForm, DateText, useOutcomeFilter } from './shared';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { Status } from '@/components/ui/status';
import { DataTable } from '@/components/ui/data-table';
import { OutcomeChart } from './overview-registry';
import { isSupportedPolicyDocument, policyDocumentType } from './policy-documents';
export function Policies() {
  const { data, t, text, mutate } = useGovernance();
  const [selected, setSelected] = useState('POL-01');
  const [tab, setTab] = useState('requirements');
  const [approve, setApprove] = useState(false);
  const [addPolicy, setAddPolicy] = useState(false);
  const policyQuery = useSearchParams().toString();
  useEffect(() => {
    const p = new URLSearchParams(policyQuery);
    if (p.get('record') && data.policies.some((row) => row.id === p.get('record')))
      setSelected(p.get('record')!);
    if (p.get('tab') === 'history') setTab('history');
  }, [policyQuery]);
  const policy = data.policies.find((p) => p.id === selected)!;
  return (
    <>
      <PageHeader
        title={t('Policies & controls', 'Politiques et contrôles')}
        description={t(
          'Manage policy documents, requirements, and approval history.',
          'Gérez les documents de politique, les exigences et l’historique d’approbation.',
        )}
        action={
          <div className="page-actions">
            <Button variant="primary" onClick={() => setAddPolicy(true)}>
              <Upload size={15} />
              {t('Add policy document', 'Ajouter un document de politique')}
            </Button>
            <Link className="button button-outline" href="/impact">
              <GitCompareArrows size={15} />
              {t('Compare revision', 'Comparer la révision')}
            </Link>
          </div>
        }
      />
      <Notice>
        {t(
          'Illustrative policy controls for product demonstration. These records are not official Canadian legal or regulatory guidance.',
          'Contrôles de politique illustratifs pour la démonstration. Ces fiches ne constituent pas des directives juridiques ou réglementaires officielles du Canada.',
        )}
      </Notice>
      <div className="split-workspace">
        <section className="panel" aria-label={t('Policy documents', 'Documents de politique')}>
          {data.policies.map((p) => (
            <button
              className="document-item"
              aria-pressed={selected === p.id}
              key={p.id}
              onClick={() => setSelected(p.id)}
            >
              <div className="small muted">
                {p.id} · v{p.version}
              </div>
              <strong>{text(p.name)}</strong>
              <p>
                <Status value={p.state} />
              </p>
              {p.sourceFile && (
                <p className="small muted">
                  {p.sourceFile.type} · {p.sourceFile.name}
                </p>
              )}
            </button>
          ))}
        </section>
        <section>
          <div className="section-header">
            <div>
              <p className="eyebrow">
                {policy.id} · v{policy.version}
              </p>
              <h2>{text(policy.name)}</h2>
            </div>
            {policy.state === 'pending' ? (
              <Button variant="primary" onClick={() => setApprove(true)}>
                <Check size={15} />
                {t('Approve revision', 'Approuver la révision')}
              </Button>
            ) : (
              <Status value="approved" />
            )}
          </div>
          <div className="tabs" aria-label={t('Policy sections', 'Sections de la politique')}>
            {[
              { id: 'requirements', label: t('Requirements & controls', 'Exigences et contrôles') },
              { id: 'history', label: t('Version history', 'Historique des versions') },
            ].map((tabItem) => (
              <button
                key={tabItem.id}
                className="tab"
                aria-pressed={tab === tabItem.id}
                onClick={() => setTab(tabItem.id)}
              >
                {tabItem.label}
              </button>
            ))}
          </div>
          {tab === 'requirements' ? (
            <DataTable
              rows={requirements.filter((r) => r.policyId === selected)}
              caption={t('Policy requirements', 'Exigences de la politique')}
              searchText={(r) => `${r.id} ${text(r.title)} ${text(r.description)}`}
              columns={[
                {
                  id: 'id',
                  title: t('Control', 'Contrôle'),
                  value: (r) => r.id,
                  render: (r) => <span className="nums">{r.id}</span>,
                },
                {
                  id: 'title',
                  title: t('Requirement', 'Exigence'),
                  render: (r) => (
                    <>
                      <div className="table-primary">{text(r.title)}</div>
                      <p className="table-meta">{text(r.description)}</p>
                    </>
                  ),
                },
              ]}
            />
          ) : (
            <div className="panel panel-content">
              <div className="version-row">
                <FileText size={18} className="muted" aria-hidden="true" />
                <div>
                  <h3>
                    v{policy.version} · {t('Current revision', 'Révision actuelle')}
                  </h3>
                  <p className="muted small">{policy.owner}</p>
                  <p className="section-gap">
                    <Status value={policy.state} />
                  </p>
                </div>
              </div>
              {policy.id === 'POL-01' && (
                <div className="version-row">
                  <FileText size={18} className="muted" aria-hidden="true" />
                  <div>
                    <h3>v2.0 · {t('Previous version', 'Version précédente')}</h3>
                    <p className="muted small">
                      {t(
                        'Clarified explanation requirements and review intervals.',
                        'Exigences d’explication et intervalles d’examen précisés.',
                      )}
                    </p>
                    <Link href="/impact" className="text-link small">
                      {t('View changes', 'Voir les changements')}
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
      {approve && (
        <RecordForm
          title={t('Approve policy revision', 'Approuver la révision')}
          description={`${text(policy.name)} · v${policy.version}`}
          fields={[
            {
              key: 'rationale',
              label: t('Approval rationale', 'Motif de l’approbation'),
              type: 'textarea',
            },
          ]}
          submitLabel={t('Approve revision', 'Approuver la révision')}
          onClose={() => setApprove(false)}
          onSave={(v) =>
            mutate(
              (d) => {
                d.policies.find((p) => p.id === selected)!.state = 'approved';
              },
              bi(`Policy revision approved: ${v.rationale}`, `Révision approuvée : ${v.rationale}`),
              selected,
            )
          }
        />
      )}
      {addPolicy && (
        <AddPolicyDialog
          onClose={() => setAddPolicy(false)}
          onSaved={(id) => {
            setSelected(id);
            setTab('requirements');
          }}
        />
      )}
    </>
  );
}

function AddPolicyDialog({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const { t, mutate } = useGovernance();
  const formId = useId();
  const [error, setError] = useState('');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const name = String(values.get('name') || '').trim();
    const version = String(values.get('version') || '').trim();
    const owner = String(values.get('owner') || '').trim();
    const file = values.get('document');
    if (!(file instanceof File) || !file.name) {
      setError(
        t('Choose a PDF, Word, or Excel file.', 'Choisissez un fichier PDF, Word ou Excel.'),
      );
      return;
    }
    const type = policyDocumentType(file.name);
    if (!type || !isSupportedPolicyDocument(file.name)) {
      setError(
        t(
          'Supported formats: PDF, DOC, DOCX, XLS, XLSX.',
          'Formats acceptés : PDF, DOC, DOCX, XLS, XLSX.',
        ),
      );
      return;
    }
    if (!name || !version || !owner) {
      setError(t('Complete all required fields.', 'Remplissez tous les champs obligatoires.'));
      return;
    }
    const id = `POL-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    mutate(
      (draft) => {
        draft.policies.unshift({
          id,
          name: bi(name),
          version,
          state: 'pending',
          owner,
          sourceFile: {
            name: file.name,
            type,
            size: file.size,
            lastModified: file.lastModified ? new Date(file.lastModified).toISOString() : undefined,
          },
        });
      },
      bi(`Policy document added: ${file.name}`, `Document de politique ajouté : ${file.name}`),
      id,
    );
    onSaved(id);
    onClose();
  }
  return (
    <Dialog
      open
      onClose={onClose}
      title={t('Add policy document', 'Ajouter un document de politique')}
      description={t(
        'Upload a policy source for this local demonstration. The file is not sent to a server.',
        'Importez une source de politique pour cette démonstration locale. Le fichier n’est pas envoyé à un serveur.',
      )}
      footer={
        <>
          <Button onClick={onClose}>{t('Cancel', 'Annuler')}</Button>
          <Button variant="primary" type="submit" form={formId}>
            {t('Add document', 'Ajouter le document')}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit}>
        <div className="field">
          <label htmlFor={`${formId}-name`}>{t('Policy name', 'Nom de la politique')}</label>
          <Input id={`${formId}-name`} name="name" required />
        </div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor={`${formId}-version`}>{t('Version', 'Version')}</label>
            <Input id={`${formId}-version`} name="version" defaultValue="1.0" required />
          </div>
          <div className="field">
            <label htmlFor={`${formId}-owner`}>{t('Owner', 'Responsable')}</label>
            <Input id={`${formId}-owner`} name="owner" defaultValue="Policy office" required />
          </div>
        </div>
        <div className="field">
          <label htmlFor={`${formId}-document`}>{t('Policy file', 'Fichier de politique')}</label>
          <Input
            id={`${formId}-document`}
            name="document"
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            required
          />
          <p className="field-hint">
            {t('Accepted: PDF, DOC, DOCX, XLS, XLSX.', 'Acceptés : PDF, DOC, DOCX, XLS, XLSX.')}
          </p>
        </div>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </Dialog>
  );
}
export function Assessments({ reviewQueue = false }: { reviewQueue?: boolean }) {
  const { data, t, text, mutate } = useGovernance();
  const [create, setCreate] = useState(false);
  const [systemId, setSystemId] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [editFinding, setEditFinding] = useState<string | null>(null);
  const [decision, setDecision] = useState<'approved' | 'rejected' | null>(null);
  const [runningSystemId, setRunningSystemId] = useState<string | null>(null);
  const [engineError, setEngineError] = useState('');
  const filter = useOutcomeFilter();
  const query = useSearchParams().toString();
  useEffect(() => {
    const p = new URLSearchParams(query);
    if (p.get('record')) setSelected(p.get('record'));
    if (p.get('system')) {
      const existing = data.assessments.find(
        (a) => a.systemId === p.get('system') && a.state === 'pending',
      );
      if (existing) setSelected(existing.id);
      else {
        setSystemId(p.get('system')!);
        setCreate(true);
      }
    }
  }, [query]);
  const rows = reviewQueue
    ? data.assessments.filter((a) => a.state === 'pending')
    : data.assessments;
  const assessment = data.assessments.find((a) => a.id === selected);
  const finding = assessment?.findings.find((f) => f.id === editFinding);
  const system = data.systems.find((s) => s.id === assessment?.systemId);
  const availableSystems = data.systems.filter(
    (s) => !data.assessments.some((a) => a.systemId === s.id && a.state === 'pending'),
  );
  async function runAssessment(targetSystemId: string, trigger: 'on_demand' | 'scheduled' | 'change_detected' = 'on_demand') {
    setRunningSystemId(targetSystemId);
    setEngineError('');
    try {
      const response = await fetch('/api/assessments/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ workspace: data, systemId: targetSystemId, trigger }),
      });
      const payload = (await response.json()) as { assessment?: Assessment; error?: string };
      if (!response.ok || !payload.assessment) throw new Error(payload.error || 'Assessment engine failed');
      mutate((draft) => applyAutomatedAssessment(draft, payload.assessment!), bi('Automated assessment completed', 'Évaluation automatisée terminée'), payload.assessment.id);
      setSelected(payload.assessment.id);
      setCreate(false);
    } catch (error) {
      setEngineError(error instanceof Error ? error.message : 'Assessment engine failed');
    } finally {
      setRunningSystemId(null);
    }
  }
  return (
    <>
      <PageHeader
        title={
          reviewQueue
            ? t('Human review', 'Examen humain')
            : t('Compliance assessments', 'Évaluations de conformité')
        }
        description={
          reviewQueue
            ? t(
                'Confirm findings and record an accountable human decision.',
                'Confirmez les constats et consignez une décision humaine responsable.',
              )
            : t(
                'Run evidence-based AI assessments and send explainable findings for human review.',
                'Lancez des évaluations IA fondées sur les preuves et soumettez les constats explicables à l’examen humain.',
              )
        }
        action={
          !reviewQueue && (
            <Button
              variant="primary"
              disabled={!availableSystems.length}
              onClick={() => setCreate(true)}
            >
              <Bot size={16} />
              {t('Run AI assessment', 'Lancer l’évaluation IA')}
            </Button>
          )
        }
      />
      {!reviewQueue && (
        <div className="dashboard-grid">
          <section className="panel">
            <div className="panel-heading">
              <h2>{t('Five-outcome distribution', 'Répartition des cinq résultats')}</h2>
            </div>
            <OutcomeChart assessments />
          </section>
          <section>
            <h2>{t('Assessment process', 'Processus d’évaluation')}</h2>
            <div className="progress-row">
              <span>{t('1. Collect data and evidence', '1. Recueillir les données et les preuves')}</span>
              <span className="small muted">{t('Assessment engine', 'Moteur d’évaluation')}</span>
            </div>
            <div className="progress-row">
              <span>{t('2. Evaluate controls and generate findings', '2. Évaluer les contrôles et générer les constats')}</span>
              <span className="small muted">{t('Rules and configured AI provider', 'Règles et fournisseur IA configuré')}</span>
            </div>
            <div className="progress-row">
              <span>{t('3. Human review before approval', '3. Examen humain avant approbation')}</span>
              <span className="small muted">{t('Reviewer', 'Responsable de l’examen')}</span>
            </div>
            <p className="small muted section-gap">
              {t(
                'Outcomes reflect recorded findings. No automated legal determination is performed.',
                'Les résultats reflètent les constats consignés. Aucune détermination juridique automatique n’est effectuée.',
              )}
            </p>
            <Notice>
              {t(
                'Assessments collect linked governance data and evidence references automatically. No PDF, CSV or Word upload is required. Human review is still required before approval.',
                'Les évaluations recueillent automatiquement les données de gouvernance et les références de preuve liées. Aucun téléversement PDF, CSV ou Word n’est requis. Un examen humain reste obligatoire avant l’approbation.',
              )}
            </Notice>
          </section>
        </div>
      )}
      {engineError && <Notice>{engineError}</Notice>}
      {runningSystemId && (
        <div className="notice" aria-live="polite">
          <RefreshCw size={16} className="spin" aria-hidden="true" />
          {t('Assessment engine is collecting data and evaluating controls on the server…', 'Le moteur d’évaluation recueille les données et évalue les contrôles sur le serveur…')}
        </div>
      )}
      <DataTable
        rows={rows}
        caption={
          reviewQueue
            ? t('Human review queue', 'File d’examen humain')
            : t('Assessments', 'Évaluations')
        }
        searchText={(a) =>
          `${a.id} ${text(data.systems.find((s) => s.id === a.systemId)?.name || a.systemId)} ${
            a.reviewer
          }`
        }
        filter={{ ...filter, getValue: assessmentOutcome }}
        columns={[
          {
            id: 'system',
            title: t('System / assessment', 'Système / évaluation'),
            value: (a) => text(data.systems.find((s) => s.id === a.systemId)?.name || a.systemId),
            render: (a) => (
              <>
                <button className="text-link table-primary" onClick={() => setSelected(a.id)}>
                  {text(data.systems.find((s) => s.id === a.systemId)?.name || a.systemId)}
                </button>
                <div className="table-meta">{a.id}</div>
              </>
            ),
          },
          {
            id: 'outcome',
            title: t('Outcome', 'Résultat'),
            render: (a) => <Status value={assessmentOutcome(a)} />,
          },
          {
            id: 'reviewer',
            title: t('Reviewer', 'Responsable'),
            value: (a) => a.reviewer,
            render: (a) => a.reviewer,
          },
          {
            id: 'date',
            title: t('Date', 'Date'),
            value: (a) => a.date,
            render: (a) => <DateText value={a.date} />,
          },
          {
            id: 'state',
            title: t('Review status', 'État de l’examen'),
            render: (a) => <Status value={a.state} />,
          },
        ]}
      />
      {assessment && (
        <Dialog
          open
          onClose={() => setSelected(null)}
          title={assessment.id}
          description={text(system?.name || assessment.systemId)}
          drawer
        >
          <div className="page-actions">
            <Status value={assessmentOutcome(assessment)} />
            <Status value={assessment.state} />
            <Button
              disabled={runningSystemId === assessment.systemId}
              onClick={() => void runAssessment(assessment.systemId, 'change_detected')}
            >
              <RefreshCw size={15} />
              {t('Reassess system', 'Réévaluer le système')}
            </Button>
          </div>
          <dl className="metadata-grid">
            <div>
              <dt>{t('Reviewer', 'Responsable')}</dt>
              <dd>{assessment.reviewer}</dd>
            </div>
            <div>
              <dt>{t('Date', 'Date')}</dt>
              <dd>
                <DateText value={assessment.date} />
              </dd>
            </div>
          </dl>
          <h3>{t('Control findings', 'Constats par contrôle')}</h3>
          {assessment.findings.map((f) => {
            const req = requirements.find((r) => r.id === f.requirementId)!;
            const refs = data.evidence.filter(
              (e) => e.systemId === assessment.systemId && e.requirementId === f.requirementId,
            );
            return (
              <section className="section-gap" key={f.id}>
                <p className="eyebrow">{req.id}</p>
                <h3>{text(req.title)}</h3>
                <p className="small muted" style={{ margin: '8px 0' }}>
                  {text(f.reason)}
                </p>
                <Status value={f.outcome} />
                <div className="assessment-analysis section-gap">
                  <p><strong>{t('AI analysis', 'Analyse IA')}</strong></p>
                  <p className="small">{f.analysis ? text(f.analysis) : t('No automated analysis was recorded.', 'Aucune analyse automatisée n’a été consignée.')}</p>
                  <p className="small muted">
                    {t('Confidence', 'Niveau de confiance')}: {f.confidence === null || f.confidence === undefined ? t('Not available: insufficient evidence', 'Non disponible : preuves insuffisantes') : `${Math.round(f.confidence * 100)}%`}
                  </p>
                  <p className="small muted">
                    {t('Evidence sources', 'Sources de preuve')}: {f.evidenceSourceIds?.length ? f.evidenceSourceIds.join(', ') : t('None collected for this control', 'Aucune preuve recueillie pour ce contrôle')}
                  </p>
                  {f.recommendedActions?.length ? <p className="small muted">{t('Recommended action', 'Mesure recommandée')}: {text(f.recommendedActions[0])}</p> : null}
                </div>
                <p className="small muted" style={{ margin: '8px 0' }}>
                  {t('Evidence references', 'Références de preuve')}:{' '}
                  {refs.length
                    ? refs.map((e) => e.name).join(', ')
                    : t('None linked', 'Aucune référence liée')}
                </p>
                <Button
                  disabled={assessment.state !== 'pending'}
                  onClick={() => setEditFinding(f.id)}
                >
                  {t('Review finding', 'Examiner le constat')}
                </Button>
              </section>
            );
          })}
          {assessment.state === 'pending' ? (
            <div className="page-actions section-gap">
              <Button variant="primary" onClick={() => setDecision('approved')}>
                {t('Approve assessment', 'Approuver l’évaluation')}
              </Button>
              <Button onClick={() => setDecision('rejected')}>
                {t('Request changes', 'Demander des modifications')}
              </Button>
            </div>
          ) : (
            <div>
              <p className="notice section-gap">
                {assessment.rationale ||
                  t('Review decision recorded.', 'Décision d’examen consignée.')}
              </p>
              {assessment.state === 'rejected' && (
                <Button
                  onClick={() =>
                    mutate(
                      (d) => {
                        d.assessments.find((a) => a.id === assessment.id)!.state = 'pending';
                      },
                      bi('Assessment reopened for revision', 'Évaluation rouverte pour révision'),
                      assessment.id,
                    )
                  }
                >
                  {t('Reopen for revision', 'Rouvrir pour révision')}
                </Button>
              )}
            </div>
          )}
          {assessment.stageEvents?.length ? (
            <section className="section-gap">
              <h3>{t('Assessment execution', 'Exécution de l’évaluation')}</h3>
              <div className="progress-list">
                {assessment.stageEvents.map((stage) => (
                  <div className="progress-row" key={stage.stage}>
                    <span><ShieldCheck size={15} aria-hidden="true" /> {stage.stage.replaceAll('_', ' ')}</span>
                    <span className="small muted">{stage.completedAt ? t('Completed', 'Terminée') : t('Running', 'En cours')} · {stage.sourceCount} {t('sources', 'sources')}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
          <Link
            href="/evidence"
            className="text-link small section-gap"
            style={{ display: 'inline-block' }}
          >
            {t('Manage supporting evidence', 'Gérer les preuves')}
          </Link>
        </Dialog>
      )}
      {create && (
        <RecordForm
          title={t('Run AI assessment', 'Lancer l’évaluation IA')}
          description={t(
            'The engine collects linked governance data, evaluates controls and creates explainable findings. No document upload is required.',
            'Le moteur recueille les données de gouvernance liées, évalue les contrôles et crée des constats explicables. Aucun document n’est requis.',
          )}
          fields={[
            {
              key: 'system',
              label: t('AI system', 'Système IA'),
              type: 'select',
              defaultValue: systemId,
              options: availableSystems.map((s) => ({ value: s.id, label: text(s.name) })),
            },
          ]}
          onClose={() => setCreate(false)}
          submitLabel={t('Run assessment', 'Lancer l’évaluation')}
          onSave={(v) => {
            setSystemId('');
            void runAssessment(v.system);
          }}
        />
      )}
      {finding && assessment && (
        <RecordForm
          title={t('Review control finding', 'Examiner le constat')}
          description={text(requirements.find((r) => r.id === finding.requirementId)!.title)}
          fields={[
            {
              key: 'outcome',
              label: t('Outcome', 'Résultat'),
              type: 'select',
              defaultValue: finding.outcome,
              options: outcomes.map((value) => ({ value, label: text(outcomeLabels[value]) })),
            },
            {
              key: 'rationale',
              label: t('Finding rationale', 'Motif du constat'),
              type: 'textarea',
              defaultValue: text(finding.reason),
            },
          ]}
          onClose={() => setEditFinding(null)}
          onSave={(v) =>
            mutate(
              (d) => reviewFinding(d, assessment.id, finding.id, v.outcome as Outcome, v.rationale),
              bi('Control finding reviewed', 'Constat de contrôle examiné'),
              finding.id,
            )
          }
        />
      )}
      {decision && assessment && (
        <RecordForm
          title={
            decision === 'approved'
              ? t('Approve assessment', 'Approuver l’évaluation')
              : t('Request changes', 'Demander des modifications')
          }
          description={t(
            'Record your rationale. Approval acknowledges the findings and does not change their compliance outcomes.',
            'Consignez votre motif. L’approbation reconnaît les constats sans modifier leurs résultats de conformité.',
          )}
          fields={[
            {
              key: 'rationale',
              label: t('Decision rationale', 'Motif de la décision'),
              type: 'textarea',
            },
          ]}
          onClose={() => setDecision(null)}
          submitLabel={t('Record decision', 'Consigner la décision')}
          onSave={(v) =>
            mutate(
              (d) => recordDecision(d, assessment.id, decision, v.rationale),
              bi(
                decision === 'approved' ? 'Assessment approved' : 'Assessment changes requested',
                decision === 'approved'
                  ? 'Évaluation approuvée'
                  : 'Modifications de l’évaluation demandées',
              ),
              assessment.id,
            )
          }
        />
      )}
    </>
  );
}
export function Impact() {
  const { data, t, text, mutate } = useGovernance();
  const [queue, setQueue] = useState(false);
  const [risk, setRisk] = useState('all');
  const affected = data.systems.filter(
    (s) => s.risk !== 'low' && (risk === 'all' || s.risk === risk),
  );
  return (
    <>
      <PageHeader
        title={t('Policy impact analysis', 'Analyse de l’impact des politiques')}
        description={t(
          'Compare a policy revision and identify systems requiring reassessment.',
          'Comparez une révision de politique et repérez les systèmes à réévaluer.',
        )}
        action={
          <Button variant="primary" disabled={!affected.length} onClick={() => setQueue(true)}>
            {t('Queue reassessments', 'Planifier les réévaluations')}
          </Button>
        }
      />
      <Notice>
        {t(
          'Demo impact rule: the explanation and monitoring changes apply to medium- and high-risk systems. Review scope manually before scheduling.',
          'Règle de démonstration : les changements d’explication et de surveillance touchent les systèmes à risque moyen et élevé. Vérifiez la portée avant de planifier.',
        )}
      </Notice>
      <section className="panel">
        <div className="panel-heading">
          <h2>{t('Automated decision-making', 'Prise de décision automatisée')}</h2>
          <span className="small muted">POL-01</span>
        </div>
        <div className="compare">
          <section>
            <p className="eyebrow">v2.0 · {t('Previous', 'Précédente')}</p>
            <h3>{t('Decision explanation', 'Explication de la décision')}</h3>
            <div className="diff">
              <strong>{t('Modified · REQ-02', 'Modifié · REQ-02')}</strong>
              <p>
                {t(
                  'Keep a record of the decision outcome.',
                  'Conserver une trace du résultat de la décision.',
                )}
              </p>
            </div>
            <div className="diff diff-removed">
              <strong>
                {t('Removed · blanket review interval', 'Supprimé · intervalle d’examen unique')}
              </strong>
              <p>
                {t('Review every system once a year.', 'Examiner chaque système une fois par an.')}
              </p>
            </div>
          </section>
          <section>
            <p className="eyebrow">
              v2.1 ·{' '}
              {data.policies[0].state === 'approved'
                ? t('Approved', 'Approuvée')
                : t('Proposed', 'Proposée')}
            </p>
            <h3>{t('Explanation & ongoing monitoring', 'Explication et surveillance continue')}</h3>
            <div className="diff">
              <strong>{t('Modified · REQ-02', 'Modifié · REQ-02')}</strong>
              <p>
                {t(
                  'Record the outcome and the factors that informed the decision.',
                  'Consigner le résultat et les facteurs ayant éclairé la décision.',
                )}
              </p>
            </div>
            <div className="diff diff-added">
              <strong>{t('Added · REQ-05', 'Ajouté · REQ-05')}</strong>
              <p>
                {t(
                  'Set monitoring thresholds and a review interval appropriate to the system’s risk.',
                  'Définir des seuils de surveillance et un intervalle d’examen adaptés au risque.',
                )}
              </p>
            </div>
          </section>
        </div>
      </section>
      <section className="section-gap">
        <div className="section-header">
          <h2>{t('Affected systems', 'Systèmes touchés')}</h2>
          <Select
            aria-label={t('Impact risk scope', 'Portée du risque')}
            value={risk}
            onChange={(e) => setRisk(e.target.value)}
          >
            <option value="all">{t('All affected risks', 'Tous les risques touchés')}</option>
            <option value="high">{t('High risk', 'Risque élevé')}</option>
            <option value="medium">{t('Medium risk', 'Risque moyen')}</option>
          </Select>
        </div>
        <DataTable
          rows={affected}
          caption={t('Systems affected by policy revision', 'Systèmes touchés par la révision')}
          searchText={(s) => `${text(s.name)} ${s.owner}`}
          columns={[
            {
              id: 'name',
              title: t('System', 'Système'),
              value: (s) => text(s.name),
              render: (s) => (
                <Link className="text-link" href={`/registry?record=${s.id}`}>
                  {text(s.name)}
                </Link>
              ),
            },
            { id: 'risk', title: t('Risk', 'Risque'), render: (s) => <Status value={s.risk} /> },
            {
              id: 'reason',
              title: t('Impact reason', 'Motif de l’impact'),
              render: (s) => (
                <>
                  <p>REQ-02 · REQ-05</p>
                  <p className="table-meta">
                    {s.risk === 'high'
                      ? t(
                          'Decision support requires explanation and monitoring review.',
                          'L’aide à la décision exige un examen de l’explication et de la surveillance.',
                        )
                      : t(
                          'Validate monitoring thresholds against the revised control.',
                          'Valider les seuils de surveillance selon le contrôle révisé.',
                        )}
                  </p>
                </>
              ),
            },
            {
              id: 'state',
              title: t('Reassessment', 'Réévaluation'),
              render: (s) =>
                data.assessments.some((a) => a.systemId === s.id && a.state === 'pending') ? (
                  <Status value="pending" />
                ) : (
                  <Link className="text-link" href={`/assessments?system=${s.id}`}>
                    {t('Start assessment', 'Lancer une évaluation')}
                  </Link>
                ),
            },
          ]}
        />
      </section>
      {queue && (
        <RecordForm
          title={t('Queue reassessments', 'Planifier les réévaluations')}
          description={`${affected.length} ${t(
            'affected systems. Existing pending assessments will be reused.',
            'systèmes touchés. Les évaluations déjà en attente seront réutilisées.',
          )}`}
          fields={[
            {
              key: 'reason',
              label: t('Scheduling reason', 'Motif de la planification'),
              type: 'textarea',
            },
          ]}
          submitLabel={t('Confirm queue', 'Confirmer la file')}
          onClose={() => setQueue(false)}
          onSave={(v) =>
            mutate(
              (d) => {
                for (const s of affected) addAssessment(d, s.id);
              },
              bi(
                `Policy reassessments queued: ${v.reason}`,
                `Réévaluations planifiées : ${v.reason}`,
              ),
              'POL-01',
            )
          }
        />
      )}
    </>
  );
}
