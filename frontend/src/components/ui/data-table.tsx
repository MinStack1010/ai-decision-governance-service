'use client';
import { useState, useMemo, type ReactNode } from 'react';
import { Search, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input, Select } from './input';
import { Button } from './button';
import { useGovernance } from '@/features/governance/store';
export type Column<T> = {
  id: string;
  title: string;
  render: (row: T) => ReactNode;
  value?: (row: T) => string;
};
export function DataTable<T extends { id: string }>({
  rows,
  columns,
  caption,
  searchText,
  filter,
  initialQuery = '',
  pageSize = 6,
}: {
  rows: T[];
  columns: Column<T>[];
  caption: string;
  searchText: (row: T) => string;
  filter?: {
    label: string;
    options: { value: string; label: string }[];
    getValue: (row: T) => string;
  };
  initialQuery?: string;
  pageSize?: number;
}) {
  const { t, lang } = useGovernance();
  const [query, setQuery] = useState(initialQuery);
  const [selected, setSelected] = useState('all');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ id: string; ascending: boolean } | null>(null);
  const result = useMemo(() => {
    const filtered = rows.filter(
      (r) =>
        searchText(r).toLocaleLowerCase(lang).includes(query.toLocaleLowerCase(lang)) &&
        (!filter || selected === 'all' || filter.getValue(r) === selected),
    );
    const col = columns.find((c) => c.id === sort?.id);
    if (col?.value)
      filtered.sort(
        (a, b) =>
          col.value!(a).localeCompare(col.value!(b), lang, { numeric: true }) *
          (sort?.ascending ? 1 : -1),
      );
    return filtered;
  }, [rows, columns, query, selected, filter, searchText, sort, lang]);
  const pages = Math.max(1, Math.ceil(result.length / pageSize));
  const current = Math.min(page, pages);
  const start = (current - 1) * pageSize;
  return (
    <div className="panel">
      <div className="table-toolbar">
        <div className="table-search">
          <Search size={16} aria-hidden="true" />
          <Input
            aria-label={t('Search table', 'Rechercher dans le tableau')}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder={t('Search records…', 'Rechercher des éléments…')}
          />
        </div>
        {filter && (
          <Select
            aria-label={filter.label}
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">{filter.label}</option>
            {filter.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        )}
        {(query || selected !== 'all') && (
          <Button
            variant="ghost"
            onClick={() => {
              setQuery('');
              setSelected('all');
              setPage(1);
            }}
          >
            {t('Clear filters', 'Effacer les filtres')}
          </Button>
        )}
      </div>
      <div className="table-scroll" role="region" aria-label={caption} tabIndex={0}>
        <table>
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  scope="col"
                  key={c.id}
                  aria-sort={
                    sort?.id === c.id ? (sort.ascending ? 'ascending' : 'descending') : undefined
                  }
                >
                  {c.value ? (
                    <button
                      onClick={() =>
                        setSort({ id: c.id, ascending: sort?.id !== c.id || !sort.ascending })
                      }
                    >
                      {c.title}
                      <ArrowUpDown size={12} aria-hidden="true" />
                    </button>
                  ) : (
                    c.title
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.slice(start, start + pageSize).map((r) => (
              <tr key={r.id}>
                {columns.map((c) => (
                  <td key={c.id}>{c.render(r)}</td>
                ))}
              </tr>
            ))}
            {!result.length && (
              <tr>
                <td colSpan={columns.length}>
                  <div className="empty">
                    {t(
                      'No matching records. Adjust your search or add a new record.',
                      'Aucun résultat. Modifiez la recherche ou ajoutez un élément.',
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="table-footer">
        <span className="nums" aria-live="polite">
          {result.length ? `${start + 1}–${Math.min(start + pageSize, result.length)}` : '0'}{' '}
          {t('of', 'sur')} {result.length} {t('records', 'éléments')}
        </span>
        <div className="page-actions">
          <Button
            className="icon-button"
            aria-label={t('Previous page', 'Page précédente')}
            disabled={current === 1}
            onClick={() => setPage(current - 1)}
          >
            <ChevronLeft size={16} />
          </Button>
          <span className="nums">
            {current} / {pages}
          </span>
          <Button
            className="icon-button"
            aria-label={t('Next page', 'Page suivante')}
            disabled={current === pages}
            onClick={() => setPage(current + 1)}
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
