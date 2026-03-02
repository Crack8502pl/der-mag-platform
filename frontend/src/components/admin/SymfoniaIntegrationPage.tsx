// src/components/admin/SymfoniaIntegrationPage.tsx
// Admin page for Symfonia MSSQL database exploration

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import symfoniaService, {
  SymfoniaConnectionStatus,
  SymfoniaTable,
  SymfoniaColumn,
  SymfoniaForeignKey,
  SymfoniaView,
} from '../../services/symfoniaIntegration.service';
import { ModuleIcon } from '../common/ModuleIcon';

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

  const [foreignKeys, setForeignKeys] = useState<SymfoniaForeignKey[]>([]);
  const [fkLoading, setFkLoading] = useState(false);
  const [fkError, setFkError] = useState('');

  const [views, setViews] = useState<SymfoniaView[]>([]);
  const [viewsLoading, setViewsLoading] = useState(false);
  const [viewsError, setViewsError] = useState('');

  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState('');

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

  const handleToggleTable = async (tableName: string) => {
    if (expandedTable === tableName) {
      setExpandedTable(null);
      return;
    }
    setExpandedTable(tableName);
    if (!tableStructures[tableName]) {
      setTableLoading((prev) => ({ ...prev, [tableName]: true }));
      try {
        const [structure, data] = await Promise.all([
          symfoniaService.getTableStructure(tableName),
          symfoniaService.getTableData(tableName, 10),
        ]);
        setTableStructures((prev) => ({ ...prev, [tableName]: structure }));
        setTableData((prev) => ({ ...prev, [tableName]: data }));
      } catch {
        // ignore – structure will be empty
      } finally {
        setTableLoading((prev) => ({ ...prev, [tableName]: false }));
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

      {/* Tables */}
      {tables.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <h2 className="card-title">📋 Tabele ({tables.length})</h2>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {tablesError && <p className="alert alert-error" style={{ margin: '1rem' }}>{tablesError}</p>}
            {tables.map((table) => {
              const key = table.name;
              const isExpanded = expandedTable === key;
              const isLoading = tableLoading[key];
              const structure = tableStructures[key] || [];
              const data = tableData[key] || [];
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
                    onClick={() => handleToggleTable(key)}
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
                          {data.length > 0 && (
                            <div>
                              <p style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                                Przykładowe dane:
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
