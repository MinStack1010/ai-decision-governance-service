'use client';
import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { z } from 'zod';
import { workspaceSchema, type Workspace, type Text, bi } from './model';
import { seedWorkspace } from './fixtures';
const storageSchema = z.object({
  version: z.literal(1),
  workspaces: z.record(z.string(), workspaceSchema),
});
const KEY = 'governance-hub-demo-v1';
export type Lang = 'en' | 'fr';
type Store = {
  data: Workspace;
  lang: Lang;
  org: string;
  ready: boolean;
  toast: string;
  warning: string;
  text: (text: Text | string) => string;
  t: (en: string, fr: string) => string;
  setLang: (lang: Lang) => void;
  setOrg: (org: string) => void;
  notify: (en: string, fr: string) => void;
  dismiss: () => void;
  mutate: (
    fn: (draft: Workspace) => void,
    action: Text,
    resource: string,
    options?: { silent?: boolean },
  ) => void;
  reset: () => void;
};

/** Keep persisted browser data resilient to duplicate system records created by
 * an earlier prototype build. System IDs are the identity used by every table,
 * connection and monitoring record, so only the first record is retained. */
function normalizeWorkspace(workspace: Workspace): Workspace {
  const seen = new Set<string>();
  return {
    ...workspace,
    systems: workspace.systems.filter((system) => {
      if (seen.has(system.id)) return false;
      seen.add(system.id);
      return true;
    }),
  };
}
const Context = createContext<Store | null>(null);
export function GovernanceProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Record<string, Workspace>>({
    services: seedWorkspace(),
    research: seedWorkspace(true),
  });
  const [lang, setLang] = useState<Lang>('en');
  const [org, setOrg] = useState('services');
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState('');
  const [warning, setWarning] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const result = storageSchema.safeParse(JSON.parse(raw));
        if (result.success) {
          setWorkspaces(
            Object.fromEntries(
              Object.entries(result.data.workspaces).map(([workspaceId, workspace]) => [
                workspaceId,
                normalizeWorkspace(workspace),
              ]),
            ),
          );
        }
        else
          setWarning('Saved demo data could not be read. / Données de démonstration illisibles.');
      }
      const saved = localStorage.getItem('governance-preferences');
      if (saved) {
        const p = JSON.parse(saved);
        if (p.lang === 'fr') setLang('fr');
        if (p.org === 'research') setOrg('research');
      }
    } catch {
      setWarning('Browser storage is unavailable. / Stockage du navigateur indisponible.');
    }
    setReady(true);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ version: 1, workspaces }));
    } catch {
      setWarning(
        'Changes are kept in memory only. / Modifications conservées en mémoire uniquement.',
      );
    }
  }, [workspaces, ready]);
  useEffect(() => {
    document.documentElement.lang = lang;
    if (ready)
      try {
        localStorage.setItem('governance-preferences', JSON.stringify({ lang, org }));
      } catch {}
  }, [lang, org, ready]);
  const t = (en: string, fr: string) => (lang === 'fr' ? fr : en);
  const text = (v: Text | string) => (typeof v === 'string' ? v : v[lang]);
  function notify(en: string, fr: string) {
    setToast(t(en, fr));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(''), 7000);
  }
  function mutate(
    fn: (draft: Workspace) => void,
    action: Text,
    resource: string,
    options?: { silent?: boolean },
  ) {
    if (!ready) return;
    setWorkspaces((current) => {
      const draft = structuredClone(current[org] || seedWorkspace(true));
      fn(draft);
      const normalized = normalizeWorkspace(draft);
      normalized.audit.unshift({
        id: `EVT-${crypto.randomUUID().slice(0, 8)}`,
        date: new Date().toISOString(),
        actor: 'Alex Morgan',
        action,
        resource,
        result: 'Success',
        correlationId: crypto.randomUUID(),
      });
      return { ...current, [org]: normalized };
    });
    if (!options?.silent)
      notify('Changes saved in this browser.', 'Modifications enregistrées dans ce navigateur.');
  }
  return (
    <Context.Provider
      value={{
        data: workspaces[org] || seedWorkspace(true),
        lang,
        org,
        ready,
        toast,
        warning,
        text,
        t,
        setLang,
        setOrg,
        notify,
        dismiss: () => setToast(''),
        mutate,
        reset: () => {
          setWorkspaces((c) => ({ ...c, [org]: seedWorkspace(org === 'research') }));
          notify('Demo workspace reset.', 'Espace de démonstration réinitialisé.');
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useGovernance() {
  const context = useContext(Context);
  if (!context) throw new Error('Missing GovernanceProvider');
  return context;
}
export const logAction = (en: string, fr: string) => bi(en, fr);
