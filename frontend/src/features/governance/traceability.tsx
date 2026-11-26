'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { DecisionContext } from '../monitoring/components/decision-context';
import { Minus, Plus, Maximize2 } from 'lucide-react';
import { useGovernance } from './store';
import { bi, assessmentOutcome, outcomeLabels } from './model';
import { requirements } from './fixtures';
import { PageHeader, Notice } from './shared';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
export function Traceability() {
  const { data, t, text } = useGovernance();
  const [systemId, setSystemId] = useState('SYS-001');
  const routeSystem = useSearchParams().get('system');
  useEffect(() => {
    if (routeSystem) setSystemId(routeSystem);
  }, [routeSystem]);
  const [selected, setSelected] = useState('requirement');
  const [zoom, setZoom] = useState(1);
  const [list, setList] = useState(false);
  const system = data.systems.find((s) => s.id === systemId) || data.systems[0];
  const assessment = data.assessments.find((a) => a.systemId === system?.id);
  const policy = data.policies[0];
  const requirement = requirements[1];
  const evidence = data.evidence.filter(
    (e) => e.systemId === system?.id && e.requirementId === requirement.id,
  );
  const finding = assessment?.findings.find((f) => f.requirementId === requirement.id);
  if (!system)
    return (
      <>
        <PageHeader
          title={t('Decision traceability', 'Traçabilité des décisions')}
          description={t(
            'Follow the relationship between policy, controls, evidence, and human decisions.',
            'Suivez les liens entre politiques, contrôles, preuves et décisions humaines.',
          )}
        />
        <Notice>
          {t(
            'Register a system to begin tracing its records.',
            'Enregistrez un système pour suivre ses dossiers.',
          )}
        </Notice>
        <Link href="/registry" className="button button-primary">
          {t('Open registry', 'Ouvrir le registre')}
        </Link>
      </>
    );
  const nodes = [
    {
      id: 'policy',
      kind: 'policy',
      label: bi('Policy', 'Politique'),
      name: policy.name,
      ref: policy.id,
      description: bi(
        `Current revision v${policy.version}.`,
        `Révision actuelle v${policy.version}.`,
      ),
      href: '/policies',
    },
    {
      id: 'requirement',
      kind: 'requirement',
      label: bi('Control requirement', 'Exigence de contrôle'),
      name: requirement.title,
      ref: requirement.id,
      description: requirement.description,
      href: '/policies',
    },
    {
      id: 'system',
      kind: 'system',
      label: bi('AI system', 'Système IA'),
      name: system.name,
      ref: system.id,
      description: bi(`Accountable owner: ${system.owner}`, `Responsable : ${system.owner}`),
      href: `/registry?record=${system.id}`,
    },
    {
      id: 'assessment',
      kind: 'decision',
      label: bi('Assessment finding', 'Constat d’évaluation'),
      name: finding ? outcomeLabels[finding.outcome] : bi('No assessment yet', 'Aucune évaluation'),
      ref: assessment?.id || '—',
      description:
        finding?.reason ||
        bi(
          'Create an assessment to record a finding.',
          'Créez une évaluation pour consigner un constat.',
        ),
      href: assessment
        ? `/assessments?record=${assessment.id}`
        : `/assessments?system=${system.id}`,
    },
    {
      id: 'evidence',
      kind: 'evidence',
      label: bi('Supporting evidence', 'Preuves justificatives'),
      name: bi(
        evidence.length ? `${evidence.length} linked reference(s)` : 'No evidence linked',
        evidence.length ? `${evidence.length} référence(s) liée(s)` : 'Aucune preuve liée',
      ),
      ref: evidence.map((e) => e.id).join(', ') || '—',
      description: bi(
        evidence.map((e) => e.name).join(', ') ||
          'No reference is linked to this system and control. Add one in Evidence.',
        evidence.map((e) => e.name).join(', ') ||
          'Aucune référence pour ce système et ce contrôle. Ajoutez-en dans Preuves.',
      ),
      href: '/evidence',
    },
    {
      id: 'review',
      kind: 'decision',
      label: bi('Human review', 'Examen humain'),
      name: bi(
        assessment?.state === 'approved'
          ? 'Decision approved'
          : assessment?.state === 'rejected'
          ? 'Changes requested'
          : 'Awaiting review',
        assessment?.state === 'approved'
          ? 'Décision approuvée'
          : assessment?.state === 'rejected'
          ? 'Modifications demandées'
          : 'En attente d’examen',
      ),
      ref: assessment?.reviewer || '—',
      description: bi(
        assessment?.rationale || 'No human rationale has been recorded.',
        assessment?.rationale || 'Aucun motif humain n’a été consigné.',
      ),
      href: assessment ? `/assessments?record=${assessment.id}` : '/reviews',
    },
  ];
  const node = nodes.find((n) => n.id === selected) || nodes[0];
  return (
    <>
      <PageHeader
        title={t('Decision traceability', 'Traçabilité des décisions')}
        description={t(
          'Follow the relationship between policy, controls, evidence, and human decisions.',
          'Suivez les liens entre politiques, contrôles, preuves et décisions humaines.',
        )}
        action={
          <Select
            aria-label={t('Select AI system', 'Choisir un système IA')}
            value={system.id}
            onChange={(e) => setSystemId(e.target.value)}
          >
            {data.systems.map((s) => (
              <option value={s.id} key={s.id}>
                {text(s.name)}
              </option>
            ))}
          </Select>
        }
      />
      <Notice>
        {t(
          'This view traces REQ-02 using the current demo records. Missing evidence is shown explicitly.',
          'Cette vue suit REQ-02 dans les dossiers actuels de démonstration. Les preuves manquantes sont indiquées explicitement.',
        )}
      </Notice>
      <DecisionContext />
      <div className="trace-layout">
        <section className="panel">
          <div className="panel-heading">
            <h2>{t('Decision lineage', 'Filiation de la décision')}</h2>
            <Button variant="ghost" onClick={() => setList((v) => !v)}>
              {list ? t('Graph view', 'Vue graphique') : t('Text alternative', 'Version textuelle')}
            </Button>
          </div>
          {list ? (
            <div className="trace-list">
              <ol className="section-gap">
                {nodes.map((n) => (
                  <li key={n.id}>
                    <button className="text-link" onClick={() => setSelected(n.id)}>
                      {text(n.label)}: {text(n.name)}
                    </button>
                    <p className="small muted">{text(n.description)}</p>
                  </li>
                ))}
              </ol>
              <p className="small muted">
                {t(
                  'Policy defines requirement. System and evidence inform assessment. Assessment informs human review.',
                  'La politique définit l’exigence. Le système et les preuves éclairent l’évaluation. L’évaluation éclaire l’examen humain.',
                )}
              </p>
            </div>
          ) : (
            <div className="graph">
              <div
                className="graph-viewport"
                tabIndex={0}
                role="region"
                aria-label={t('Interactive lineage graph', 'Graphe de filiation interactif')}
              >
                <div style={{ width: `${zoom * 100}%`, minWidth: '100%', padding: 4 }}>
                  <div className="graph-columns">
                    <svg
                      className="graph-edges"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M 47 12 H 53 M 76 25 V 37 M 47 50 H 53 M 24 75 V 69 H 63 V 62 M 76 62 V 75"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1"
                        vectorEffect="non-scaling-stroke"
                      />
                    </svg>
                    {nodes.map((n) => (
                      <button
                        key={n.id}
                        className="graph-node"
                        data-kind={n.kind}
                        aria-pressed={selected === n.id}
                        onClick={() => setSelected(n.id)}
                      >
                        <span className="small muted">
                          {text(n.label)} · {n.ref}
                        </span>
                        <strong style={{ fontWeight: 500 }}>{text(n.name)}</strong>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="graph-controls">
                <div className="page-actions">
                  <Button
                    className="icon-button"
                    aria-label={t('Zoom out', 'Réduire')}
                    disabled={zoom <= 1}
                    onClick={() => setZoom((z) => Math.max(1, z - 0.25))}
                  >
                    <Minus size={16} />
                  </Button>
                  <span className="small nums">{Math.round(zoom * 100)}%</span>
                  <Button
                    className="icon-button"
                    aria-label={t('Zoom in', 'Agrandir')}
                    disabled={zoom >= 2}
                    onClick={() => setZoom((z) => Math.min(2, z + 0.25))}
                  >
                    <Plus size={16} />
                  </Button>
                  <Button
                    className="icon-button"
                    aria-label={t('Fit graph', 'Ajuster le graphe')}
                    onClick={() => setZoom(1)}
                  >
                    <Maximize2 size={16} />
                  </Button>
                </div>
                <span className="small muted">
                  {t('Select a node for details', 'Sélectionnez un nœud')}
                </span>
              </div>
            </div>
          )}
        </section>
        <aside className="panel panel-content" aria-live="polite">
          <p className="eyebrow">{text(node.label)}</p>
          <h2>{text(node.name)}</h2>
          <dl className="metadata-grid">
            <div>
              <dt>{t('Reference', 'Référence')}</dt>
              <dd>{node.ref}</dd>
            </div>
          </dl>
          <p className="muted">{text(node.description)}</p>
          <Link href={node.href} className="button button-outline section-gap">
            {t('Open record', 'Ouvrir la fiche')}
          </Link>
        </aside>
      </div>
    </>
  );
}
