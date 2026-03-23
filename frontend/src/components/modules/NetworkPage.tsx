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
import '../network/NetworkPage.css';
import '../../styles/grover-theme.css';

type Tab = 'pools' | 'allocations' | 'matrix' | 'monitoring';

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
    setLoading(true);
    Promise.all([loadPools(), loadAllocations()]).finally(() => setLoading(false));
  }, [canRead, loadPools, loadAllocations]);

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

  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: 'pools', label: '🌐 Pule IP', show: true },
    { id: 'allocations', label: '📋 Alokacje', show: true },
    { id: 'matrix', label: '🗂️ Macierz IP', show: canViewMatrix },
    { id: 'monitoring', label: '📊 Monitoring', show: true },
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
