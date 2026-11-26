'use client';
import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  LayoutDashboard,
  Database,
  FileText,
  ClipboardCheck,
  GitCompareArrows,
  FolderOpen,
  GitBranch,
  ShieldAlert,
  Users,
  ListTodo,
  ChartNoAxesCombined,
  History,
  Plug,
  Settings,
  ShieldCheck,
  Search,
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  ChevronRight,
  X,
  LockKeyhole,
  Globe,
} from 'lucide-react';
import { routes } from '@/features/governance/model';
import { useGovernance } from '@/features/governance/store';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
const icons: Record<string, typeof Activity> = {
  dashboard: LayoutDashboard,
  registry: Database,
  monitoring: Activity,
  policies: FileText,
  assessments: ClipboardCheck,
  impact: GitCompareArrows,
  evidence: FolderOpen,
  traceability: GitBranch,
  risks: ShieldAlert,
  reviews: Users,
  remediation: ListTodo,
  reports: ChartNoAxesCombined,
  audit: History,
  integrations: Plug,
  settings: Settings,
};
export function AppShell({ children }: { children: ReactNode }) {
  const { data, lang, setLang, org, setOrg, t, text, toast, dismiss, warning, ready } =
    useGovernance();
  const pathname = usePathname();
  const current =
    routes.find((r) => pathname === `/${r.path}` || pathname.startsWith(`/${r.path}/`)) ||
    routes[0];
  const [mobile, setMobile] = useState(false);
  const [desktop, setDesktop] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState('');
  const [notifications, setNotifications] = useState(false);
  const [profile, setProfile] = useState(false);
  useEffect(() => {
    const media = matchMedia('(min-width:1025px)');
    const update = () => {
      setDesktop(media.matches);
      if (media.matches) setMobile(false);
    };
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setSearch((s) => !s);
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, []);
  useEffect(() => {
    document.title = `${text(current.name)} · AI Governance Hub`;
  }, [current, lang, text]);
  function navigation(isMobile = false) {
    return (
      <aside
        className={`sidebar ${isMobile ? 'mobile-sidebar' : ''}`}
        aria-label={t('Primary navigation', 'Navigation principale')}
        inert={!isMobile && !desktop}
      >
        <Link href="/dashboard" className="wordmark" onClick={() => setMobile(false)}>
          <ShieldCheck size={24} aria-hidden="true" />
          <span className="wordmark-label">Governance Hub</span>
          <i className="brand-mark" aria-hidden="true" />
        </Link>
        <div className="org-switch">
          <label htmlFor={isMobile ? 'org-mobile' : 'org'}>
            {t('Workspace', 'Espace de travail')}
          </label>
          <select
            id={isMobile ? 'org-mobile' : 'org'}
            value={org}
            onChange={(e) => setOrg(e.target.value)}
          >
            <option value="services">
              {t('Public Services', 'Services publics')}
            </option>
            <option value="research">{t('Research Lab', 'Laboratoire de recherche')}</option>
          </select>
        </div>
        <nav
          className="nav-scroll"
          tabIndex={0}
          aria-label={t('Scrollable navigation', 'Navigation défilante')}
        >
          <div className="nav-content">
            {routes.map((route, i) => {
              const Icon = icons[route.path];
              const groups = [
                t('Workspace', 'Espace de travail'),
                t('Governance', 'Gouvernance'),
                t('Oversight', 'Supervision'),
                t('Administration', 'Administration'),
              ];
              return (
                <div key={route.path}>
                  {(i === 0 || route.group !== routes[i - 1].group) && (
                    <div className="nav-group">{groups[route.group]}</div>
                  )}
                  <Link
                    href={`/${route.path}`}
                    className="nav-link"
                    aria-current={current.path === route.path ? 'page' : undefined}
                    aria-label={text(route.name)}
                    title={text(route.name)}
                    onClick={() => setMobile(false)}
                  >
                    <Icon size={17} aria-hidden="true" />
                    <span className="nav-label">{text(route.name)}</span>
                  </Link>
                </div>
              );
            })}
          </div>
        </nav>
        <div className="sidebar-footer">
          <LockKeyhole size={14} aria-hidden="true" />
              <span>{t('Local workspace', 'Espace local')}</span>
        </div>
      </aside>
    );
  }
  const matches = routes.filter((r) =>
    text(r.name).toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  );
  const systemMatches =
    query.length > 1
      ? data.systems.filter((s) => text(s.name).toLowerCase().includes(query.toLowerCase()))
      : [];
  const pending = data.assessments.filter((a) => a.state === 'pending');
  return (
    <div className={collapsed ? 'app-collapsed' : ''}>
      <a href="#main" className="skip-link">
        {t('Skip to content', 'Aller au contenu')}
      </a>
      {navigation()}
      <div className="app-body">
        <header className="header">
          <div className="breadcrumb">
            <Button
              variant="ghost"
              className="icon-button mobile-toggle"
              aria-label={t('Open navigation', 'Ouvrir la navigation')}
              onClick={() => setMobile(true)}
            >
              <Menu size={18} />
            </Button>
            <Button
              variant="ghost"
              className="icon-button desktop-collapse"
              aria-label={
                collapsed
                  ? t('Expand sidebar', 'Développer le menu')
                  : t('Collapse sidebar', 'Réduire le menu')
              }
              onClick={() => setCollapsed((c) => !c)}
            >
              {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            </Button>
            <Link className="breadcrumb-root muted" href="/dashboard">
              {t('Workspace', 'Espace de travail')}
            </Link>
            <ChevronRight className="breadcrumb-separator muted" size={13} aria-hidden="true" />
            <span>{text(current.name)}</span>
          </div>
          <div className="header-tools">
            <Button
              variant="ghost"
              className="search-trigger"
              aria-label={t('Search workspace', 'Rechercher dans l’espace')}
              onClick={() => setSearch(true)}
            >
              <Search size={17} />
              <span>{t('Search', 'Rechercher')}</span>
              <kbd>⌘ K</kbd>
            </Button>
            <Button
              variant="ghost"
              className="icon-button notification"
              aria-label={t('Notifications', 'Notifications')}
              onClick={() => setNotifications(true)}
            >
              <Bell size={17} />
              {pending.length > 0 && <span className="notification-mark" />}
            </Button>
            <Button
              variant="ghost"
              aria-label={t('Switch to French', 'Passer à l’anglais')}
              onClick={() => setLang(lang === 'en' ? 'fr' : 'en')}
            >
              <Globe size={15} aria-hidden="true" />
              {lang === 'en' ? 'EN' : 'FR'}
            </Button>
            <Button
              variant="ghost"
              aria-label={t('User menu', 'Menu utilisateur')}
              onClick={() => setProfile(true)}
            >
              <span className="avatar">AM</span>
              <span className="user-label">Alex M.</span>
            </Button>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          {warning && (
            <p className="notice" role="alert">
              {warning}
            </p>
          )}
          {!ready ? (
            <p role="status" className="notice">
              {t('Loading saved workspace…', 'Chargement de l’espace enregistré…')}
            </p>
          ) : (
            children
          )}
        </main>
      </div>
      <Dialog
        open={mobile}
        onClose={() => setMobile(false)}
        title={t('Navigation', 'Navigation')}
        drawer
      >
        <div className="mobile-nav-container">{navigation(true)}</div>
      </Dialog>
      <Dialog
        open={search}
        onClose={() => setSearch(false)}
        title={t('Search workspace', 'Rechercher dans l’espace')}
        description={t(
          'Find a page or a registered AI system.',
          'Trouvez une page ou un système IA enregistré.',
        )}
      >
        <Input
          autoFocus
          placeholder={t('Search…', 'Rechercher…')}
          aria-label={t('Global search', 'Recherche globale')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="search-results">
          {matches.map((r) => (
            <Link
              key={r.path}
              className="search-result"
              href={`/${r.path}`}
              onClick={() => setSearch(false)}
            >
              {text(r.name)}
              <span className="small muted">{t('Page', 'Page')}</span>
            </Link>
          ))}
          {systemMatches.map((s) => (
            <Link
              key={s.id}
              className="search-result"
              href={`/registry?record=${s.id}`}
              onClick={() => setSearch(false)}
            >
              {text(s.name)}
              <span className="small muted">{s.id}</span>
            </Link>
          ))}
          {!matches.length && !systemMatches.length && (
            <p className="empty">{t('No results.', 'Aucun résultat.')}</p>
          )}
        </div>
      </Dialog>
      <Dialog
        open={notifications}
        onClose={() => setNotifications(false)}
        title={t('Notifications', 'Notifications')}
      >
        <p>
          {pending.length}{' '}
          {t(
            'assessments are waiting for human review.',
            'évaluations attendent un examen humain.',
          )}
        </p>
        <Link
          className="button button-primary section-gap"
          href="/reviews"
          onClick={() => setNotifications(false)}
        >
          {t('Open review queue', 'Ouvrir la file d’examen')}
        </Link>
      </Dialog>
      <Dialog
        open={profile}
        onClose={() => setProfile(false)}
        title="Alex Morgan"
        description={t('Reviewer · Public Services', 'Responsable de l’examen · Services publics')}
      >
        <p className="muted">
          {t(
            'This local workspace does not use authentication.',
            'Cet espace local n’utilise pas d’authentification.',
          )}
        </p>
        <Link
          href="/settings"
          className="button button-outline section-gap"
          onClick={() => setProfile(false)}
        >
          {t('Workspace settings', 'Paramètres de l’espace')}
        </Link>
      </Dialog>
      {toast && (
        <div className="toast" role="status">
          <span>{toast}</span>
          <Button
            variant="ghost"
            className="icon-button"
            aria-label={t('Dismiss message', 'Fermer le message')}
            onClick={dismiss}
          >
            <X size={15} />
          </Button>
        </div>
      )}
    </div>
  );
}
