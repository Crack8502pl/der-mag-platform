// src/components/admin/SymfoniaIntegrationPage.tsx
// Admin page for Symfonia MSSQL database exploration

import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import symfoniaService, {
  type SymfoniaConnectionStatus,
  type SymfoniaTable,
  type SymfoniaColumn,
  type SymfoniaForeignKey,
  type SymfoniaView,
  type GlobalSearchResult,
  type BatchGlobalSearchResult,
} from '../../services/symfoniaIntegration.service';
import { parseCSVColumn, parseCSVHeaders } from '../../utils/csvParser';
import { ModuleIcon } from '../common/ModuleIcon';

interface TableSearchState {
  column: string;
  value: string;
  results: any[] | null;
  loading: boolean;
  error: string;
}

interface TablePaginationState {
  page: number;
  pageSize: number;
  total: number;
  data: any[];
  loading: boolean;
  error: string;
  active: boolean;
}

export const SymfoniaIntegrationPage: React.FC = () => {
  const navigate = useNavigate();

  const [status, setStatus] = useState<SymfoniaConnectionStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState('');

  const [tables, setTables] = useState<SymfoniaTable[]>([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [tablesError, setTablesError] = useState('');

  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [tableStructures, setTableStructures] = useState<Record<string, SymfoniaColumn[]>>({});
  const [tableData, setTableData] = useState<Record<string, any[]>>({});
  const [tableLoading, setTableLoading] = useState<Record<string, boolean>>({});

  // Per-table search state
  const [tableSearch, setTableSearch] = useState<Record<string, TableSearchState>>({});

  // Per-table pagination state
  const [tablePagination, setTablePagination] = useState<Record<string, TablePaginationState>>({});

  const [foreignKeys, setForeignKeys] = useState<SymfoniaForeignKey[]>([]);
  const [fkLoading, setFkLoading] = useState(false);
  const [fkError, setFkError] = useState('');

  const [views, setViews] = useState<SymfoniaView[]>([]);
  const [viewsLoading, setViewsLoading] = useState(false);
  const [viewsError, setViewsError] = useState('');

  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState('');

  // Global search state
  const [globalSearchValue, setGlobalSearchValue] = useState('');
  const [globalSearchExact, setGlobalSearchExact] = useState(false);
  const [globalSearchResults, setGlobalSearchResults] = useState<GlobalSearchResult[] | null>(null);
  const [globalSearchLoading, setGlobalSearchLoading] = useState(false);
  const [globalSearchError, setGlobalSearchError] = useState('');

  // Batch global search state
  const [batchGlobalResults, setBatchGlobalResults] = useState<BatchGlobalSearchResult | null>(null);
  const [batchGlobalLoading, setBatchGlobalLoading] = useState(false);
  const [batchGlobalError, setBatchGlobalError] = useState('');
  const [batchGlobalFoundExpanded, setBatchGlobalFoundExpanded] = useState(true);
  const [batchGlobalNotFoundExpanded, setBatchGlobalNotFoundExpanded] = useState(false);

  // CSV file handling for batch global search
  const [csvSeparator, setCsvSeparator] = useState(';');
  const [csvColumnIndex, setCsvColumnIndex] = useState(0);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvContent, setCsvContent] = useState('');
  const globalCsvInputRef = useRef<HTMLInputElement>(null);

  // Batch search state
  const [batchTable, setBatchTable] = useState('');
  const [batchSchema, setBatchSchema] = useState('dbo');
  const [batchColumn, setBatchColumn] = useState('');
  const [batchValues, setBatchValues] = useState('');
  const [batchResults, setBatchResults] = useState<{ found: any[]; notFound: string[] } | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchError, setBatchError] = useState('');
  const csvInputRef = useRef<HTMLInputElement>(null);

  const handleTestConnection = async () => {
    setStatusLoading(true);
    setStatusError('');
    try {
      const result = await symfoniaService.testConnection();
      setStatus(result);
    } catch (err) {
      setStatusError('Błąd podczas testowania połączenia');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleLoadTables = async () => {
    setTablesLoading(true);
    setTablesError('');
    try {
      const data = await symfoniaService.getTables();
      setTables(data);
    } catch (err) {
      setTablesError('Błąd podczas pobierania tabel');
    } finally {
      setTablesLoading(false);
    }
  };

  const handleLoadForeignKeys = async () => {
    setFkLoading(true);
    setFkError('');
    try {
      const data = await symfoniaService.getForeignKeys();
      setForeignKeys(data);
    } catch (err) {
      setFkError('Błąd podczas pobierania relacji');
    } finally {
      setFkLoading(false);
    }
  };

  const handleLoadViews = async () => {
    setViewsLoading(true);
    setViewsError('');
    try {
      const data = await symfoniaService.getViews();
      setViews(data);
    } catch (err) {
      setViewsError('Błąd podczas pobierania widoków');
    } finally {
      setViewsLoading(false);
    }
  };

  const handleToggleTable = async (table: SymfoniaTable) => {
    const key = `${table.schema}.${table.name}`;
    if (expandedTable === key) {
      setExpandedTable(null);
      return;
    }
    setExpandedTable(key);
    if (!tableStructures[key]) {
      setTableLoading((prev) => ({ ...prev, [key]: true }));
      try {
        const [structure, data] = await Promise.all([
          symfoniaService.getTableStructure(table.schema, table.name),
          symfoniaService.getTableData(table.schema, table.name, 10),
        ]);
        setTableStructures((prev) => ({ ...prev, [key]: structure }));
        setTableData((prev) => ({ ...prev, [key]: data }));
      } catch {
        // ignore – structure will be empty
      } finally {
        setTableLoading((prev) => ({ ...prev, [key]: false }));
      }
    }
  };

  const handleExport = async () => {
    setExportLoading(true);
    setExportError('');
    try {
      await symfoniaService.exportSchema();
    } catch (err) {
      setExportError('Błąd podczas eksportu');
    } finally {
      setExportLoading(false);
    }
  };

  // Global search handlers
  const handleGlobalSearch = async () => {
    if (!globalSearchValue.trim()) {
      setGlobalSearchError('Podaj wartość do wyszukania');
      return;
    }
    setGlobalSearchLoading(true);
    setGlobalSearchError('');
    setGlobalSearchResults(null);
    try {
      const results = await symfoniaService.globalSearch(globalSearchValue.trim(), globalSearchExact);
      setGlobalSearchResults(results);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Błąd podczas wyszukiwania globalnego';
      setGlobalSearchError(msg);
    } finally {
      setGlobalSearchLoading(false);
    }
  };

  const handleGlobalCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvContent(text);
      const headers = parseCSVHeaders(text, csvSeparator);
      setCsvHeaders(headers);
      setCsvColumnIndex(0);
    };
    reader.readAsText(file);
  };

  const handleBatchGlobalSearch = async () => {
    if (!csvContent) {
      setBatchGlobalError('Wgraj plik CSV');
      return;
    }
    const values = parseCSVColumn(csvContent, csvColumnIndex, csvSeparator, true);
    if (values.length === 0) {
      setBatchGlobalError('Brak wartości w wybranej kolumnie');
      return;
    }
    if (values.length > 500) {
      setBatchGlobalError('Maksymalnie 500 wartości naraz');
      return;
    }
    setBatchGlobalLoading(true);
    setBatchGlobalError('');
    setBatchGlobalResults(null);
    try {
      const result = await symfoniaService.batchGlobalSearch(values, globalSearchExact);
      setBatchGlobalResults(result);
      setBatchGlobalFoundExpanded(true);
      setBatchGlobalNotFoundExpanded(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Błąd podczas wyszukiwania zbiorczego';
      setBatchGlobalError(msg);
    } finally {
      setBatchGlobalLoading(false);
    }
  };

  const exportBatchResultsToCsv = () => {
    if (!batchGlobalResults) return;
    const escapeCsv = (v: string) => {
      const s = String(v);
      return s.includes(';') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines: string[] = ['Status;Szukana wartość;Tabela;Schemat;Kolumna;Wartość'];
    for (const item of batchGlobalResults.found) {
      for (const r of item.results) {
        lines.push(
          [
            'Znaleziono',
            escapeCsv(item.searchedValue),
            escapeCsv(r.tableName),
            escapeCsv(r.schemaName),
            escapeCsv(r.columnName),
            escapeCsv(r.matchedValue),
          ].join(';'),
        );
      }
    }
    for (const v of batchGlobalResults.notFound) {
      lines.push(['Nie znaleziono', escapeCsv(v), '', '', '', ''].join(';'));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'symfonia-global-search-results.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  // Search handlers
  const getSearchState = (key: string): TableSearchState =>
    tableSearch[key] || { column: '', value: '', results: null, loading: false, error: '' };

  const updateSearchState = (key: string, patch: Partial<TableSearchState>) => {
    setTableSearch((prev) => {
      const current = prev[key] || { column: '', value: '', results: null, loading: false, error: '' };
      return { ...prev, [key]: { ...current, ...patch } };
    });
  };

  const handleSearch = async (table: SymfoniaTable) => {
    const key = `${table.schema}.${table.name}`;
    const s = getSearchState(key);
    if (!s.column || !s.value) {
      updateSearchState(key, { error: 'Podaj kolumnę i wartość do wyszukania' });
      return;
    }
    updateSearchState(key, { loading: true, error: '', results: null });
    try {
      const results = await symfoniaService.searchInTable(table.schema, table.name, s.column, s.value, 100);
      updateSearchState(key, { results, loading: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Błąd podczas wyszukiwania';
      updateSearchState(key, { loading: false, error: msg });
    }
  };

  // Pagination handlers
  const getPaginationState = (key: string): TablePaginationState =>
    tablePagination[key] || { page: 1, pageSize: 50, total: 0, data: [], loading: false, error: '', active: false };

  const updatePaginationState = (key: string, patch: Partial<TablePaginationState>) => {
    setTablePagination((prev) => {
      const current = prev[key] || { page: 1, pageSize: 50, total: 0, data: [], loading: false, error: '', active: false };
      return { ...prev, [key]: { ...current, ...patch } };
    });
  };

  const handleLoadPaginatedData = async (table: SymfoniaTable, page: number, pageSize: number) => {
    const key = `${table.schema}.${table.name}`;
    updatePaginationState(key, { loading: true, error: '', active: true, page, pageSize });
    try {
      const result = await symfoniaService.getTableDataPaginated(table.schema, table.name, page, pageSize);
      updatePaginationState(key, { loading: false, data: result.data, total: result.total, page: result.page, pageSize: result.pageSize });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Błąd podczas pobierania danych';
      updatePaginationState(key, { loading: false, error: msg });
    }
  };

  // Parse CSV text into a list of values (removes quotes, splits by newlines/commas/semicolons)
  const parseCsvValues = (text: string): string[] =>
    text
      .split(/[\r\n,;]+/)
      .map((v) => v.trim().replace(/^["']|["']$/g, ''))
      .filter((v) => v.length > 0);

  // Batch search CSV handler
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const values = parseCsvValues(text);
      setBatchValues(values.join('\n'));
    };
    reader.readAsText(file);
  };

  const handleBatchSearch = async () => {
    if (!batchTable || !batchColumn) {
      setBatchError('Wybierz tabelę i kolumnę');
      return;
    }
    const values = parseCsvValues(batchValues);
    if (values.length === 0) {
      setBatchError('Brak wartości do wyszukania');
      return;
    }
    if (values.length > 1000) {
      setBatchError('Maksymalnie 1000 wartości naraz');
      return;
    }
    setBatchLoading(true);
    setBatchError('');
    setBatchResults(null);
    try {
      const result = await symfoniaService.batchSearch(batchSchema, batchTable, batchColumn, values);
      setBatchResults(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Błąd podczas wyszukiwania zbiorczego';
      setBatchError(msg);
    } finally {
      setBatchLoading(false);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <button onClick={() => navigate('/admin')} className="btn btn-secondary btn-sm" style={{ marginBottom: '1rem' }}>
          ← Powrót
        </button>
        <h1 className="page-title">
          <ModuleIcon name="symfonia" emoji="🔗" size={28} />
          Integracja Symfonia MSSQL
        </h1>
      </div>

      {/* Connection Status */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <h2 className="card-title">Status połączenia</h2>
        </div>
        <div className="card-body">
          {status && (
            <div style={{ marginBottom: '1rem' }}>
              <span style={{ marginRight: '0.5rem' }}>
                {status.connected ? '✅' : '❌'}
              </span>
              <strong>{status.message}</strong>
              {status.connected && (
                <span style={{ marginLeft: '1rem', color: 'var(--text-muted)' }}>
                  Baza: <strong>{status.database}</strong>
                </span>
              )}
            </div>
          )}
          {statusError && <p className="alert alert-error">{statusError}</p>}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              onClick={handleTestConnection}
              disabled={statusLoading}
            >
              {statusLoading ? 'Testowanie...' : 'Testuj połączenie'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleLoadTables}
              disabled={tablesLoading}
            >
              {tablesLoading ? 'Pobieranie...' : '📋 Załaduj tabele'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleLoadForeignKeys}
              disabled={fkLoading}
            >
              {fkLoading ? 'Pobieranie...' : '🔗 Załaduj relacje'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleLoadViews}
              disabled={viewsLoading}
            >
              {viewsLoading ? 'Pobieranie...' : '👁️ Załaduj widoki'}
            </button>
            <button
              className="btn btn-success"
              onClick={handleExport}
              disabled={exportLoading}
            >
              {exportLoading ? 'Eksportowanie...' : '📥 Eksportuj do JSON'}
            </button>
          </div>
          {exportError && <p className="alert alert-error" style={{ marginTop: '0.5rem' }}>{exportError}</p>}
        </div>
      </div>

      {/* Global Search */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <h2 className="card-title">🔍 Globalne wyszukiwanie</h2>
        </div>
        <div className="card-body">
          <p style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Automatyczne przeszukiwanie wszystkich tabel i kolumn tekstowych bazy Symfonia. Nie musisz wybierać tabeli ani kolumny.
          </p>

          {/* Single value search */}
          <div style={{ marginBottom: '1.25rem' }}>
            <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>Wyszukaj pojedynczą wartość:</p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text"
                className="form-input"
                placeholder="np. R0010125_A"
                value={globalSearchValue}
                onChange={(e) => setGlobalSearchValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleGlobalSearch(); }}
                style={{ minWidth: '240px', fontSize: '0.9rem' }}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={globalSearchExact}
                  onChange={(e) => setGlobalSearchExact(e.target.checked)}
                />
                Dokładne dopasowanie
              </label>
              <button
                className="btn btn-primary"
                onClick={handleGlobalSearch}
                disabled={globalSearchLoading}
              >
                {globalSearchLoading ? 'Przeszukiwanie bazy...' : '🔍 Szukaj'}
              </button>
              {globalSearchResults !== null && (
                <button
                  className="btn btn-secondary"
                  onClick={() => { setGlobalSearchResults(null); setGlobalSearchError(''); }}
                >
                  Wyczyść
                </button>
              )}
            </div>
          </div>

          {globalSearchError && (
            <p className="alert alert-error" style={{ marginBottom: '0.75rem' }}>{globalSearchError}</p>
          )}

          {globalSearchResults !== null && (
            <div style={{ marginTop: '0.5rem' }}>
              {globalSearchResults.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  ❌ Nie znaleziono wartości <strong>„{globalSearchValue}"</strong> w żadnej tabeli.
                </p>
              ) : (
                <>
                  <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                    ✅ Znaleziono <strong style={{ color: 'var(--color-success, green)' }}>{globalSearchResults.length}</strong> trafień dla wartości „{globalSearchValue}":
                  </p>
                  <div style={{ maxHeight: '300px', overflowY: 'auto', background: 'var(--bg-secondary, #f9f9f9)', borderRadius: '6px', padding: '0.75rem' }}>
                    {globalSearchResults.map((r, idx) => (
                      <div key={idx} style={{ marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: 600 }}>[{r.schemaName}].[{r.tableName}]</span>
                        {', kolumna: '}
                        <code style={{ background: 'var(--bg-tertiary, #eee)', padding: '0 0.25rem', borderRadius: '3px' }}>{r.columnName}</code>
                        {' = '}
                        <em>„{r.matchedValue}"</em>
                        <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          {JSON.stringify(r.fullRecord)}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', margin: '1.25rem 0', gap: '1rem', color: 'var(--text-muted)' }}>
            <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border-color)' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>LUB</span>
            <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border-color)' }} />
          </div>

          {/* Batch from CSV */}
          <div>
            <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>Wyszukaj wiele wartości z pliku CSV:</p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>📁 Plik CSV</label>
                <input
                  ref={globalCsvInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleGlobalCsvUpload}
                  className="form-input"
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Separator</label>
                <select
                  className="form-select"
                  value={csvSeparator}
                  style={{ width: '80px' }}
                  onChange={(e) => {
                    setCsvSeparator(e.target.value);
                    if (csvContent) {
                      const headers = parseCSVHeaders(csvContent, e.target.value);
                      setCsvHeaders(headers);
                      setCsvColumnIndex(0);
                    }
                  }}
                >
                  {[';', ',', '\t', '|'].map((sep) => (
                    <option key={sep} value={sep}>{sep === '\t' ? 'TAB' : sep}</option>
                  ))}
                </select>
              </div>
              {csvHeaders.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Kolumna z wartościami</label>
                  <select
                    className="form-select"
                    value={csvColumnIndex}
                    style={{ minWidth: '160px' }}
                    onChange={(e) => setCsvColumnIndex(Number(e.target.value))}
                  >
                    {csvHeaders.map((header, idx) => (
                      <option key={idx} value={idx}>{idx + 1} - {header}</option>
                    ))}
                  </select>
                </div>
              )}
              {csvContent && (
                <button
                  className="btn btn-primary"
                  onClick={handleBatchGlobalSearch}
                  disabled={batchGlobalLoading}
                  style={{ alignSelf: 'flex-end' }}
                >
                  {batchGlobalLoading ? 'Przeszukiwanie bazy...' : '📤 Wczytaj i szukaj'}
                </button>
              )}
            </div>

            {batchGlobalError && (
              <p className="alert alert-error" style={{ marginBottom: '0.75rem' }}>{batchGlobalError}</p>
            )}

            {/* Batch results */}
            {batchGlobalResults && (
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <p style={{ fontWeight: 600, fontSize: '0.95rem', margin: 0 }}>
                    📊 Wyniki: znaleziono{' '}
                    <strong style={{ color: 'var(--color-success, green)' }}>{batchGlobalResults.stats.totalFound}</strong>
                    {' z '}
                    <strong>{batchGlobalResults.stats.totalSearched}</strong>
                    {' szukanych wartości'}
                  </p>
                  <button className="btn btn-secondary btn-sm" onClick={exportBatchResultsToCsv}>
                    💾 Eksportuj wyniki do CSV
                  </button>
                </div>

                {/* Found */}
                {batchGlobalResults.found.length > 0 && (
                  <div style={{ marginBottom: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
                    <div
                      style={{ padding: '0.6rem 1rem', background: 'var(--bg-secondary, #f0faf0)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      onClick={() => setBatchGlobalFoundExpanded((v) => !v)}
                    >
                      <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                        ✅ ZNALEZIONE ({batchGlobalResults.stats.totalFound})
                      </span>
                      <span>{batchGlobalFoundExpanded ? '▲ Zwiń' : '▼ Rozwiń'}</span>
                    </div>
                    {batchGlobalFoundExpanded && (
                      <div style={{ padding: '0.75rem', maxHeight: '350px', overflowY: 'auto' }}>
                        {batchGlobalResults.found.map((item, idx) => (
                          <div key={idx} style={{ marginBottom: '0.75rem' }}>
                            <p style={{ fontWeight: 600, fontSize: '0.875rem', margin: '0 0 0.25rem' }}>
                              🔹 {item.searchedValue}
                            </p>
                            {item.results.map((r, rIdx) => (
                              <div key={rIdx} style={{ paddingLeft: '1rem', fontSize: '0.8rem', marginBottom: '0.2rem' }}>
                                └─ Tabela: <strong>[{r.schemaName}].[{r.tableName}]</strong>, Kolumna:{' '}
                                <code style={{ background: 'var(--bg-tertiary, #eee)', padding: '0 0.2rem', borderRadius: '3px' }}>{r.columnName}</code>
                                <div style={{ fontFamily: 'monospace', fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                                  {JSON.stringify(r.fullRecord)}
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Not found */}
                {batchGlobalResults.notFound.length > 0 && (
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
                    <div
                      style={{ padding: '0.6rem 1rem', background: 'var(--bg-secondary, #fff5f5)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      onClick={() => setBatchGlobalNotFoundExpanded((v) => !v)}
                    >
                      <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-danger, #c00)' }}>
                        ❌ NIEZNALEZIONE ({batchGlobalResults.stats.totalNotFound})
                      </span>
                      <span>{batchGlobalNotFoundExpanded ? '▲ Zwiń' : '▼ Rozwiń'}</span>
                    </div>
                    {batchGlobalNotFoundExpanded && (
                      <div style={{ padding: '0.75rem', maxHeight: '250px', overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                        {batchGlobalResults.notFound.map((v, idx) => (
                          <span key={idx} style={{ display: 'inline-block', padding: '0.15rem 0.5rem', background: 'var(--color-danger-light, #fdd)', borderRadius: '3px', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                            {v}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Batch Search CSV */}
      {tables.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h2 className="card-title">🔍 Batch Search z CSV</h2>
          </div>
          <div className="card-body">
            <p style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Wgraj plik CSV z wartościami lub wpisz je ręcznie (po jednej w wierszu), aby sprawdzić ich obecność w wybranej tabeli bazy Symfonia.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Tabela</label>
                <select
                  className="form-select"
                  value={batchTable}
                  onChange={async (e) => {
                    const selected = tables.find((t) => `${t.schema}.${t.name}` === e.target.value);
                    const name = selected?.name || '';
                    const schema = selected?.schema || 'dbo';
                    setBatchTable(name);
                    setBatchSchema(schema);
                    setBatchColumn('');
                    if (name && !tableStructures[`${schema}.${name}`]) {
                      try {
                        const structure = await symfoniaService.getTableStructure(schema, name);
                        setTableStructures((prev) => ({ ...prev, [`${schema}.${name}`]: structure }));
                      } catch {
                        // ignore – column list will stay empty
                      }
                    }
                  }}
                  style={{ minWidth: '180px' }}
                >
                  <option value="">-- wybierz tabelę --</option>
                  {tables.map((t) => (
                    <option key={`${t.schema}.${t.name}`} value={`${t.schema}.${t.name}`}>
                      [{t.schema}].[{t.name}]
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Kolumna</label>
                <select
                  className="form-select"
                  value={batchColumn}
                  onChange={(e) => setBatchColumn(e.target.value)}
                  style={{ minWidth: '160px' }}
                  disabled={!batchTable}
                >
                  <option value="">-- wybierz kolumnę --</option>
                  {batchTable &&
                    (tableStructures[`${batchSchema}.${batchTable}`] || []).map((col) => (
                      <option key={col.columnName} value={col.columnName}>
                        {col.columnName}
                      </option>
                    ))}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Wgraj CSV</label>
                <input
                  ref={csvInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleCsvUpload}
                  className="form-input"
                />
              </div>
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Wartości do wyszukania (po jednej w wierszu, max 1000):</label>
              <textarea
                className="form-input"
                rows={5}
                value={batchValues}
                onChange={(e) => setBatchValues(e.target.value)}
                placeholder={"R0010125_A\nR0050126_A\nR0060125_A"}
                style={{ width: '100%', marginTop: '0.25rem', fontFamily: 'monospace', fontSize: '0.8rem' }}
              />
            </div>
            {batchError && <p className="alert alert-error" style={{ marginBottom: '0.5rem' }}>{batchError}</p>}
            <button
              className="btn btn-primary"
              onClick={handleBatchSearch}
              disabled={batchLoading}
            >
              {batchLoading ? 'Wyszukiwanie...' : '🔎 Porównaj z bazą'}
            </button>
            {batchResults && (
              <div style={{ marginTop: '1rem' }}>
                <p style={{ fontWeight: 600 }}>
                  Wyniki: znaleziono <strong style={{ color: 'var(--color-success, green)' }}>{batchResults.found.length}</strong>{' '}
                  z <strong>{batchResults.found.length + batchResults.notFound.length}</strong> wartości
                </p>
                {batchResults.found.length > 0 && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                      ✅ Znalezione rekordy ({batchResults.found.length}):
                    </p>
                    <div style={{ maxHeight: '200px', overflowY: 'auto', background: 'var(--bg-secondary, #f5f5f5)', borderRadius: '4px', padding: '0.5rem' }}>
                      {batchResults.found.map((row, idx) => (
                        <div key={idx} style={{ fontSize: '0.78rem', fontFamily: 'monospace', marginBottom: '0.2rem' }}>
                          {JSON.stringify(row)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {batchResults.notFound.length > 0 && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.25rem', color: 'var(--color-danger, #c00)' }}>
                      ❌ Nieznalezione wartości ({batchResults.notFound.length}):
                    </p>
                    <div style={{ maxHeight: '150px', overflowY: 'auto', background: 'var(--bg-secondary, #f5f5f5)', borderRadius: '4px', padding: '0.5rem' }}>
                      {batchResults.notFound.map((v, idx) => (
                        <span key={idx} style={{ display: 'inline-block', margin: '0.15rem', padding: '0.1rem 0.4rem', background: 'var(--color-danger-light, #fdd)', borderRadius: '3px', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tables */}
      {tables.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h2 className="card-title">📋 Tabele ({tables.length})</h2>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {tablesError && <p className="alert alert-error" style={{ margin: '1rem' }}>{tablesError}</p>}
            {tables.map((table) => {
              const key = `${table.schema}.${table.name}`;
              const isExpanded = expandedTable === key;
              const isLoading = tableLoading[key];
              const structure = tableStructures[key] || [];
              const data = tableData[key] || [];
              const search = getSearchState(key);
              const pagination = getPaginationState(key);
              return (
                <div key={key} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.75rem 1rem',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                    onClick={() => handleToggleTable(table)}
                  >
                    <span style={{ marginRight: '0.5rem' }}>{isExpanded ? '▼' : '▶'}</span>
                    <span style={{ fontWeight: 600 }}>[{table.schema}].[{table.name}]</span>
                    <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      {table.rowCount.toLocaleString()} rekordów
                    </span>
                  </div>
                  {isExpanded && (
                    <div style={{ padding: '0 1rem 1rem 2rem' }}>
                      {isLoading ? (
                        <p style={{ color: 'var(--text-muted)' }}>Ładowanie...</p>
                      ) : (
                        <>
                          {structure.length > 0 && (
                            <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
                              <table className="data-table" style={{ width: '100%', fontSize: '0.875rem' }}>
                                <thead>
                                  <tr>
                                    <th>Kolumna</th>
                                    <th>Typ</th>
                                    <th>Nullable</th>
                                    <th>PK</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {structure.map((col) => (
                                    <tr key={col.columnName}>
                                      <td>{col.columnName}</td>
                                      <td>
                                        {col.dataType}
                                        {col.maxLength !== null && col.maxLength > 0 ? `(${col.maxLength})` : ''}
                                      </td>
                                      <td>{col.isNullable ? 'NULL' : 'NOT NULL'}</td>
                                      <td>{col.isPrimaryKey ? '🔑' : ''}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* Search section */}
                          {structure.length > 0 && (
                            <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--bg-secondary, #f9f9f9)', borderRadius: '6px' }}>
                              <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}>🔍 Wyszukiwanie</p>
                              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                                <select
                                  className="form-select"
                                  value={search.column}
                                  onChange={(e) => updateSearchState(key, { column: e.target.value, results: null })}
                                  style={{ minWidth: '150px', fontSize: '0.85rem' }}
                                >
                                  <option value="">-- kolumna --</option>
                                  {structure.map((col) => (
                                    <option key={col.columnName} value={col.columnName}>
                                      {col.columnName}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="text"
                                  className="form-input"
                                  placeholder="Wartość..."
                                  value={search.value}
                                  onChange={(e) => updateSearchState(key, { value: e.target.value, results: null })}
                                  style={{ minWidth: '180px', fontSize: '0.85rem' }}
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(table); }}
                                />
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => handleSearch(table)}
                                  disabled={search.loading}
                                >
                                  {search.loading ? 'Szukanie...' : 'Szukaj'}
                                </button>
                                {search.results !== null && (
                                  <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => updateSearchState(key, { results: null, error: '' })}
                                  >
                                    Wyczyść
                                  </button>
                                )}
                              </div>
                              {search.error && <p className="alert alert-error" style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>{search.error}</p>}
                              {search.results !== null && (
                                <div style={{ marginTop: '0.5rem' }}>
                                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                    Znaleziono: <strong>{search.results.length}</strong> rekordów
                                  </p>
                                  {search.results.length > 0 && (
                                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                      {search.results.map((row, idx) => (
                                        <div key={idx} style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                                          [{idx + 1}] {JSON.stringify(row)}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Paginated data section */}
                          <div style={{ marginBottom: '0.5rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                              <p style={{ fontWeight: 600, fontSize: '0.875rem', margin: 0 }}>📄 Paginacja danych</p>
                              <select
                                className="form-select"
                                value={pagination.pageSize}
                                onChange={(e) => {
                                  const ps = parseInt(e.target.value, 10);
                                  if (pagination.active) {
                                    handleLoadPaginatedData(table, 1, ps);
                                  } else {
                                    updatePaginationState(key, { pageSize: ps });
                                  }
                                }}
                                style={{ fontSize: '0.8rem', width: 'auto' }}
                              >
                                {[10, 25, 50, 100].map((ps) => (
                                  <option key={ps} value={ps}>{ps} na stronę</option>
                                ))}
                              </select>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleLoadPaginatedData(table, 1, pagination.pageSize)}
                                disabled={pagination.loading}
                              >
                                {pagination.active ? 'Odśwież' : 'Załaduj z paginacją'}
                              </button>
                            </div>
                            {pagination.error && <p className="alert alert-error" style={{ fontSize: '0.8rem' }}>{pagination.error}</p>}
                            {pagination.loading && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Ładowanie danych...</p>}
                            {pagination.active && !pagination.loading && pagination.data.length > 0 && (
                              <>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                  Strona <strong>{pagination.page}</strong> z <strong>{Math.ceil(pagination.total / Math.max(1, pagination.pageSize))}</strong>{' '}
                                  (łącznie {pagination.total.toLocaleString()} rekordów)
                                </p>
                                <div style={{ maxHeight: '250px', overflowY: 'auto', marginBottom: '0.5rem' }}>
                                  {pagination.data.map((row, idx) => (
                                    <div key={idx} style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                                      [{(pagination.page - 1) * pagination.pageSize + idx + 1}] {JSON.stringify(row)}
                                    </div>
                                  ))}
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                  <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => handleLoadPaginatedData(table, pagination.page - 1, pagination.pageSize)}
                                    disabled={pagination.page <= 1 || pagination.loading}
                                  >
                                    ← Poprzednia
                                  </button>
                                  <span style={{ fontSize: '0.8rem' }}>
                                    {pagination.page} / {Math.ceil(pagination.total / Math.max(1, pagination.pageSize))}
                                  </span>
                                  <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => handleLoadPaginatedData(table, pagination.page + 1, pagination.pageSize)}
                                    disabled={pagination.page >= Math.ceil(pagination.total / Math.max(1, pagination.pageSize)) || pagination.loading}
                                  >
                                    Następna →
                                  </button>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Sample data (default TOP 10) */}
                          {!pagination.active && data.length > 0 && (
                            <div>
                              <p style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                                Przykładowe dane (TOP 10):
                              </p>
                              {data.map((row, idx) => (
                                <div key={idx} style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                  [{idx + 1}] {JSON.stringify(row)}
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {tablesError && tables.length === 0 && (
        <p className="alert alert-error">{tablesError}</p>
      )}

      {/* Foreign Keys */}
      {foreignKeys.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h2 className="card-title">🔗 Relacje ({foreignKeys.length})</h2>
          </div>
          <div className="card-body">
            {fkError && <p className="alert alert-error">{fkError}</p>}
            <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
              {foreignKeys.map((fk) => (
                <li key={fk.fkName} style={{ marginBottom: '0.25rem', fontSize: '0.875rem' }}>
                  <strong>{fk.fromTable}.{fk.fromColumn}</strong>
                  {' → '}
                  <strong>{fk.toTable}.{fk.toColumn}</strong>
                  <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>({fk.fkName})</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {fkError && foreignKeys.length === 0 && (
        <p className="alert alert-error">{fkError}</p>
      )}

      {/* Views */}
      {views.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h2 className="card-title">👁️ Widoki ({views.length})</h2>
          </div>
          <div className="card-body">
            {viewsError && <p className="alert alert-error">{viewsError}</p>}
            <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
              {views.map((view) => (
                <li key={`${view.schema}.${view.name}`} style={{ marginBottom: '0.25rem', fontSize: '0.875rem' }}>
                  [{view.schema}].[{view.name}]
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {viewsError && views.length === 0 && (
        <p className="alert alert-error">{viewsError}</p>
      )}
    </div>
  );
};
