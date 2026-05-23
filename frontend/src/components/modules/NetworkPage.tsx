import React, { useState, useEffect, useCallback } from 'react';
import { BackButton } from '../common/BackButton';
import { ModuleIcon } from '../common/ModuleIcon';
import { MODULE_ICONS } from '../../config/moduleIcons';
import { usePermissions } from '../../hooks/usePermissions';
import networkService from '../../services/network.service';
import type { NetworkPool, NetworkAllocation, DeviceIPAssignment, CreatePoolDto, UpdatePoolDto, AssignIPDto } from '../../services/network.service';
import { NetworkPoolList } from '../network/NetworkPoolList';
import { NetworkPoolForm } from '../network/NetworkPoolForm';
import { NetworkAllocationList } from '../network/NetworkAllocationList';
import { NetworkIPMatrix } from '../network/NetworkIPMatrix';
import { NetworkAssignIPForm } from '../network/NetworkAssignIPForm';
import { NetworkUtilizationChart } from '../network/NetworkUtilizationChart';
import { NetworkTopologyEditor } from '../network/topology';
import networkTopologyService from '../../services/networkTopology.service';
import type { NetworkTopologyData } from '../../types/network-topology.types';
import contractService from '../../services/contract.service';
import type { Contract } from '../../services/contract.service';
import '../network/NetworkPage.css';
import '../../styles/grover-theme.css';

type Tab = 'pools' | 'allocations' | 'matrix' | 'monitoring' | 'topology';

const SUBSYSTEM_TYPES = [
  'SMOKIP_A', 'SMOKIP_B', 'LCS', 'SKD', 'SSWIN', 'CCTV',
  'SMW', 'SDIP', 'SUG', 'SSP', 'LAN', 'OTK', 'ZASILANIE',
] as const;

export const NetworkPage: React.FC = () => {
  const { hasPermission } = usePermissions();

  const canRead = hasPermission('network', 'read');
  const canCreatePool = hasPermission('network', 'createPool');
  const canUpdatePool = hasPermission('network', 'updatePool');
  const canDeletePool = hasPermission('network', 'deletePool');
  const canViewMatrix = hasPermission('network', 'viewMatrix');
  const canAllocate = hasPermission('network', 'allocate');

  const [activeTab, setActiveTab] = useState<Tab>('pools');
  const [pools, setPools] = useState<NetworkPool[]>([]);
  const [allocations, setAllocations] = useState<NetworkAllocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Pool form state
  const [showPoolForm, setShowPoolForm] = useState(false);
  const [editPool, setEditPool] = useState<NetworkPool | null>(null);

  // Assign IP form state
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignAllocationId, setAssignAllocationId] = useState<number | undefined>();

  // Topology tab state
  const [topoContractId, setTopoContractId] = useState<number | null>(null);
  const [topoSubsystemIndex, setTopoSubsystemIndex] = useState<number>(0);
  const [topoSubsystemType, setTopoSubsystemType] = useState<string>('');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [topologies, setTopologies] = useState<NetworkTopologyData[]>([]);
  const [loadingTopologies, setLoadingTopologies] = useState(false);

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 4000);
  };

  const loadPools = useCallback(async () => {
    try {
      const data = await networkService.getPools();
      setPools(data);
    } catch {
      setError('Błąd podczas pobierania pul IP');
    }
  }, []);

  const loadAllocations = useCallback(async () => {
    try {
      const data = await networkService.getAllocations();
      setAllocations(data);
    } catch {
      setError('Błąd podczas pobierania alokacji');
    }
  }, []);

  useEffect(() => {
    if (!canRead) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    Promise.all([loadPools(), loadAllocations()]).finally(() => setLoading(false));
  }, [canRead, loadPools, loadAllocations]);

  useEffect(() => {
    if (activeTab !== 'topology') return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingContracts(true);
    setLoadingTopologies(true);
    Promise.all([
      contractService.getContracts({ limit: 500 })
        .then(res => setContracts(res.data))
        .catch(() => setError('Błąd podczas pobierania listy kontraktów')),
      networkTopologyService.getAll()
        .then(data => setTopologies(data))
        .catch(() => setError('Błąd podczas pobierania topologii')),
    ]).finally(() => {
      setLoadingContracts(false);
      setLoadingTopologies(false);
    });
  }, [activeTab]);

  if (!canRead) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <BackButton to="/dashboard" />
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔒</div>
        <h2 style={{ color: 'var(--text-primary)' }}>Brak dostępu</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Nie masz uprawnień do przeglądania modułu Sieć/IP.</p>
      </div>
    );
  }

  const handleSavePool = async (data: CreatePoolDto | UpdatePoolDto) => {
    try {
      if (editPool) {
        await networkService.updatePool(editPool.id, data as UpdatePoolDto);
        showSuccess('Pula IP zaktualizowana pomyślnie');
      } else {
        await networkService.createPool(data as CreatePoolDto);
        showSuccess('Pula IP utworzona pomyślnie');
      }
      setShowPoolForm(false);
      setEditPool(null);
      await loadPools();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Błąd podczas zapisywania puli IP';
      setError(msg);
      throw err;
    }
  };

  const handleDeletePool = async (pool: NetworkPool) => {
    try {
      await networkService.deletePool(pool.id);
      showSuccess(`Pula "${pool.name}" usunięta pomyślnie`);
      await loadPools();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Błąd podczas usuwania puli IP';
      setError(msg);
    }
  };

  const handleAssignIP = async (data: AssignIPDto) => {
    try {
      await networkService.assignIP(data);
      showSuccess('Adres IP przydzielony pomyślnie');
      setShowAssignForm(false);
      await loadAllocations();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Błąd podczas przydzielania IP';
      setError(msg);
      throw err;
    }
  };

  const handleConfigure = async (assignment: DeviceIPAssignment) => {
    try {
      await networkService.configureDevice(assignment.id);
      showSuccess(`Urządzenie ${assignment.hostname} skonfigurowane`);
      await loadAllocations();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Błąd podczas konfiguracji';
      setError(msg);
    }
  };

  const handleVerify = async (assignment: DeviceIPAssignment) => {
    try {
      await networkService.verifyDevice(assignment.id);
      showSuccess(`Urządzenie ${assignment.hostname} zweryfikowane`);
      await loadAllocations();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Błąd podczas weryfikacji';
      setError(msg);
    }
  };

  const getContractLabel = (contractId: number) => {
    const c = contracts.find(c => c.id === contractId);
    return c ? `${c.contractNumber} — ${c.customName}` : `#${contractId}`;
  };

  const handleOpenTopology = (topology: NetworkTopologyData) => {
    setTopoContractId(topology.contractId);
    setTopoSubsystemIndex(topology.subsystemIndex);
    setTopoSubsystemType(topology.subsystemType);
  };

  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: 'pools', label: '🌐 Pule IP', show: true },
    { id: 'allocations', label: '📋 Alokacje', show: true },
    { id: 'matrix', label: '🗂️ Macierz IP', show: canViewMatrix },
    { id: 'monitoring', label: '📊 Monitoring', show: true },
    { id: 'topology', label: '🌐 Topologia', show: true },
  ];

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <BackButton to="/dashboard" />

      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '8px' }}>
          <ModuleIcon name="network" emoji={MODULE_ICONS.network} size={48} />
          <h1 style={{ color: 'var(--text-primary)', margin: 0 }}>Sieć/IP</h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', marginLeft: '63px', marginTop: 0, marginRight: 0, marginBottom: 0 }}>
          Zarządzanie adresacją IP – pule adresów, alokacja i macierze IP dla urządzeń
        </p>
      </div>

      {error && (
        <div className="network-error-banner">
          ❌ {error}
          <button
            onClick={() => setError(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', marginLeft: '8px', float: 'right' }}
          >
            ✕
          </button>
        </div>
      )}

      {success && (
        <div className="network-success-banner">
          ✅ {success}
        </div>
      )}

      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="network-tabs">
          {tabs.filter(t => t.show).map(t => (
            <button
              key={t.id}
              className={`network-tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="network-empty-state">
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
            <p className="network-empty-text">Ładowanie danych...</p>
          </div>
        ) : (
          <div className="network-tab-content">
            {/* POOLS TAB */}
            {activeTab === 'pools' && (
              <div>
                <div className="network-section-header">
                  <h2>Pule adresów IP</h2>
                  {canCreatePool && (
                    <button
                      className="btn btn-primary"
                      onClick={() => { setEditPool(null); setShowPoolForm(true); }}
                    >
                      + Nowa pula
                    </button>
                  )}
                </div>
                <NetworkPoolList
                  pools={pools}
                  canEdit={canUpdatePool}
                  canDelete={canDeletePool}
                  onEdit={pool => { setEditPool(pool); setShowPoolForm(true); }}
                  onDelete={handleDeletePool}
                />
              </div>
            )}

            {/* ALLOCATIONS TAB */}
            {activeTab === 'allocations' && (
              <div>
                <div className="network-section-header">
                  <h2>Alokacje sieciowe</h2>
                </div>
                <NetworkAllocationList allocations={allocations} />
              </div>
            )}

            {/* MATRIX TAB */}
            {activeTab === 'matrix' && canViewMatrix && (
              <div>
                <div className="network-section-header">
                  <h2>Macierz adresacji IP</h2>
                </div>
                <NetworkIPMatrix
                  allocations={allocations}
                  canAssign={canAllocate}
                  onAssignNew={id => { setAssignAllocationId(id); setShowAssignForm(true); }}
                  onConfigure={handleConfigure}
                  onVerify={handleVerify}
                />
              </div>
            )}

            {/* MONITORING TAB */}
            {activeTab === 'monitoring' && (
              <div>
                <div className="network-section-header">
                  <h2>Monitoring wykorzystania puli</h2>
                </div>
                <NetworkUtilizationChart pools={pools} allocations={allocations} />
              </div>
            )}

            {/* TOPOLOGY TAB */}
            {activeTab === 'topology' && (
              <div>
                <div className="network-section-header">
                  <h2>Topologie sieciowe</h2>
                </div>

                {/* List of all existing topologies */}
                {loadingTopologies ? (
                  <div className="network-empty-state">
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
                    <p className="network-empty-text">Ładowanie topologii...</p>
                  </div>
                ) : topologies.length === 0 ? (
                  <div className="network-empty-state">
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌐</div>
                    <p className="network-empty-text">Brak zapisanych topologii. Wybierz kontrakt i typ podsystemu poniżej, aby utworzyć pierwszą topologię.</p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', marginBottom: '28px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                          <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600 }}>Nazwa</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600 }}>Kontrakt</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600 }}>Typ podsystemu</th>
                          <th style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 600 }}>Wersja</th>
                          <th style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 600 }}>Węzły</th>
                          <th style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 600 }}>Połączenia</th>
                          <th style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600 }}>Data utworzenia</th>
                          <th style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 600 }}>Akcje</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topologies.map(t => (
                          <tr
                            key={t.id}
                            style={{
                              borderBottom: '1px solid var(--border-color)',
                              background: (topoContractId === t.contractId && topoSubsystemIndex === t.subsystemIndex && topoSubsystemType === t.subsystemType)
                                ? 'var(--bg-hover, rgba(var(--primary-rgb, 59,130,246),0.07))'
                                : undefined,
                            }}
                          >
                            <td style={{ padding: '10px 12px', color: 'var(--text-primary)', fontWeight: 500 }}>{t.name}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{getContractLabel(t.contractId)}</td>
                            <td style={{ padding: '10px 12px' }}>
                              <span style={{
                                background: 'var(--primary-light, #dbeafe)',
                                color: 'var(--primary-dark, #1d4ed8)',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 600,
                              }}>{t.subsystemType}</span>
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--text-secondary)' }}>v{t.version}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--text-secondary)' }}>{t.nodes.length}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--text-secondary)' }}>{t.connections.length}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                              {new Date(t.createdAt).toLocaleDateString('pl-PL', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '4px 12px', fontSize: '13px' }}
                                onClick={() => handleOpenTopology(t)}
                              >
                                Otwórz
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Divider */}
                <div style={{ borderTop: '1px solid var(--border-color)', marginBottom: '20px', paddingTop: '20px' }}>
                  <h3 style={{ color: 'var(--text-primary)', margin: '0 0 16px 0', fontSize: '16px' }}>
                    {topoContractId && topoSubsystemType ? 'Edytor topologii' : 'Otwórz lub utwórz topologię'}
                  </h3>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginBottom: '20px', flexWrap: 'wrap' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      Kontrakt
                    </label>
                    {loadingContracts ? (
                      <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Ładowanie...</span>
                    ) : (
                      <select
                        value={topoContractId ?? ''}
                        onChange={e => {
                          const id = e.target.value ? Number(e.target.value) : null;
                          setTopoContractId(id);
                          setTopoSubsystemIndex(0);
                          setTopoSubsystemType('');
                        }}
                        style={{
                          padding: '8px 12px',
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          fontSize: '14px',
                          minWidth: '240px',
                        }}
                      >
                        <option value="">-- Wybierz kontrakt --</option>
                        {contracts.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.contractNumber} — {c.customName}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {topoContractId && (
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Podsystem (indeks)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={topoSubsystemIndex}
                        onChange={e => setTopoSubsystemIndex(Number(e.target.value))}
                        style={{
                          width: '80px',
                          padding: '8px 12px',
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          fontSize: '14px',
                        }}
                      />
                    </div>
                  )}

                  {topoContractId && (
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Typ podsystemu
                      </label>
                      <select
                        value={topoSubsystemType}
                        onChange={e => setTopoSubsystemType(e.target.value)}
                        style={{
                          padding: '8px 12px',
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          fontSize: '14px',
                          minWidth: '160px',
                        }}
                      >
                        <option value="">-- Wybierz typ --</option>
                        {SUBSYSTEM_TYPES.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {topoContractId && topoSubsystemType ? (
                  <NetworkTopologyEditor
                    contractId={topoContractId}
                    subsystemIndex={topoSubsystemIndex}
                    subsystemType={topoSubsystemType}
                    readOnly={!canAllocate}
                    onSaved={() => {
                      // Refresh topology list after save
                      networkTopologyService.getAll()
                        .then(data => setTopologies(data))
                        .catch(() => {/* silent */});
                    }}
                  />
                ) : (
                  <div className="network-empty-state">
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌐</div>
                    <p className="network-empty-text">Wybierz kontrakt i typ podsystemu aby edytować topologię</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pool Form Modal */}
      {showPoolForm && (
        <NetworkPoolForm
          pool={editPool}
          onSave={handleSavePool}
          onCancel={() => { setShowPoolForm(false); setEditPool(null); }}
        />
      )}

      {/* Assign IP Form Modal */}
      {showAssignForm && (
        <NetworkAssignIPForm
          allocations={allocations}
          defaultAllocationId={assignAllocationId}
          onSave={handleAssignIP}
          onCancel={() => { setShowAssignForm(false); setAssignAllocationId(undefined); }}
        />
      )}
    </div>
  );
};
