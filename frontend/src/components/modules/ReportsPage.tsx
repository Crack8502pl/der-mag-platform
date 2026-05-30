import React, { useEffect, useState } from 'react';
import { BackButton } from '../common/BackButton';
import { ModuleIcon } from '../common/ModuleIcon';
import { MODULE_ICONS } from '../../config/moduleIcons';
import { reportService, type ContractStats, type KpiRow, type ResourceStats, type TaskStats } from '../../services/reportService';
import './ModulePage.css';

type ReportTab = 'contracts' | 'tasks' | 'resources' | 'kpi';

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReportTab>('contracts');
  const [contractStats, setContractStats] = useState<ContractStats | null>(null);
  const [taskStats, setTaskStats] = useState<TaskStats | null>(null);
  const [resourceStats, setResourceStats] = useState<ResourceStats | null>(null);
  const [kpiData, setKpiData] = useState<KpiRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadTabData = async (tab: ReportTab) => {
    setLoading(true);
    setError('');
    try {
      if (tab === 'contracts') {
        setContractStats(await reportService.getContractStats());
      } else if (tab === 'tasks') {
        setTaskStats(await reportService.getTaskStats());
      } else if (tab === 'resources') {
        setResourceStats(await reportService.getResourceStats());
      } else {
        setKpiData(await reportService.getKpiData());
      }
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Nie udało się pobrać raportu';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTabData(activeTab);
  }, [activeTab]);

  const handleExport = async (kind: 'excel' | 'pdf') => {
    const type = activeTab;
    const blob = kind === 'excel' ? await reportService.exportExcel(type) : await reportService.exportPdf(type);
    const ext = kind === 'excel' ? 'xlsx' : 'pdf';
    downloadBlob(blob, `raport-${type}.${ext}`);
  };

  return (
    <div className="module-page">
      <BackButton to="/dashboard" />
      <div className="page-header">
        <div className="module-icon">
          <ModuleIcon name="reports" emoji={MODULE_ICONS.reports} size={36} />
        </div>
        <div>
          <h1>Raporty</h1>
          <p className="page-subtitle">Analiza danych i eksport raportów</p>
        </div>
      </div>

      <div className="card module-content">
        <div className="module-tabs">
          <button className={`tab-btn ${activeTab === 'contracts' ? 'active' : ''}`} onClick={() => setActiveTab('contracts')}>Kontrakty</button>
          <button className={`tab-btn ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => setActiveTab('tasks')}>Zadania</button>
          <button className={`tab-btn ${activeTab === 'resources' ? 'active' : ''}`} onClick={() => setActiveTab('resources')}>Zasoby</button>
          <button className={`tab-btn ${activeTab === 'kpi' ? 'active' : ''}`} onClick={() => setActiveTab('kpi')}>KPI</button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <button className="btn btn-ghost" onClick={() => handleExport('excel')}>Export Excel</button>
          <button className="btn btn-ghost" onClick={() => handleExport('pdf')}>Export PDF</button>
        </div>

        {loading && <p>Ładowanie danych...</p>}
        {error && <p className="status-text" style={{ color: 'var(--danger)' }}>❌ {error}</p>}

        {!loading && activeTab === 'contracts' && contractStats && (
          <>
            <div className="stats-cards">
              <div className="stat-card"><strong>Łącznie</strong><span>{contractStats.total}</span></div>
              <div className="stat-card"><strong>Aktywne</strong><span>{contractStats.active}</span></div>
              <div className="stat-card"><strong>Zakończone</strong><span>{contractStats.completed}</span></div>
              <div className="stat-card"><strong>% realizacji</strong><span>{contractStats.progressPercent}%</span></div>
            </div>
            <table className="module-table">
              <thead><tr><th>Numer</th><th>Nazwa</th><th>Status</th><th>Data</th></tr></thead>
              <tbody>
                {contractStats.recentContracts.map(contract => (
                  <tr key={contract.id}>
                    <td>{contract.contractNumber}</td>
                    <td>{contract.customName}</td>
                    <td>{contract.status}</td>
                    <td>{new Date(contract.createdAt).toLocaleDateString('pl-PL')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {!loading && activeTab === 'tasks' && taskStats && (
          <>
            <div className="stats-cards">
              {Object.entries(taskStats.byStatus).map(([status, value]) => (
                <div key={status} className="stat-card"><strong>{status}</strong><span>{value}</span></div>
              ))}
            </div>
            <table className="module-table">
              <thead><tr><th>Numer</th><th>Tytuł</th><th>Planowany koniec</th><th>Status</th></tr></thead>
              <tbody>
                {taskStats.overdueTasks.map(task => (
                  <tr key={task.id}>
                    <td>{task.taskNumber}</td>
                    <td>{task.title}</td>
                    <td>{task.plannedEndDate ? new Date(task.plannedEndDate).toLocaleDateString('pl-PL') : '-'}</td>
                    <td>{task.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {!loading && activeTab === 'resources' && resourceStats && (
          <table className="module-table">
            <thead><tr><th>Katalog</th><th>Materiał</th><th>Dostępne</th><th>Minimum</th></tr></thead>
            <tbody>
              {resourceStats.lowStock.map(stock => (
                <tr key={stock.id}>
                  <td>{stock.catalogNumber}</td>
                  <td>{stock.materialName}</td>
                  <td>{stock.quantityAvailable}</td>
                  <td>{stock.minStockLevel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && activeTab === 'kpi' && (
          <table className="module-table">
            <thead><tr><th>Miesiąc</th><th>Kontrakty</th><th>Zadania</th><th>Nowe urządzenia</th></tr></thead>
            <tbody>
              {kpiData.map(row => (
                <tr key={row.month}><td>{row.month}</td><td>{row.contracts}</td><td>{row.tasks}</td><td>{row.newDevices}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
