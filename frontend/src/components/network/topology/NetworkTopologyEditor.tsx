// src/components/network/topology/NetworkTopologyEditor.tsx
// Canvas-based network topology editor — zero external libraries, pure React + HTML/SVG

import React, { useState, useEffect, useCallback, useRef } from 'react';
import networkTopologyService from '../../../services/networkTopology.service';
import type {
  NetworkTopologyData,
  TopologyNode,
  TopologyConnection,
  ConnectionTechnology,
} from '../../../types/network-topology.types';
import { AddNodeModal } from './AddNodeModal';
import { TopologyHistoryModal } from './TopologyHistoryModal';
import { CustomNode } from './CustomNode';
import './NetworkTopologyEditor.css';
import '../../../styles/grover-theme.css';

interface NetworkTopologyEditorProps {
  contractId: number;
  subsystemIndex: number;
  subsystemType: string;
  readOnly?: boolean;
  onSaved?: (topology: NetworkTopologyData) => void;
}

const NODE_WIDTH = 140;
const NODE_HEIGHT = 60;

// Helper: Map backend topology node to frontend format
// Backend returns { nodeType, kilometre, taskId } but frontend expects { type, data: { km, taskId } }
function mapBackendNodeToFrontend(backendNode: any): TopologyNode {
  return {
    id: backendNode.id,
    type: backendNode.nodeType || backendNode.type,
    label: backendNode.label,
    position: backendNode.position,
    data: {
      taskId: backendNode.taskId ?? backendNode.data?.taskId,
      km: backendNode.kilometre ?? backendNode.data?.km,
      icon: backendNode.data?.icon,
    },
  };
}

interface DragState {
  nodeId: string;
  startMouseX: number;
  startMouseY: number;
  nodeStartX: number;
  nodeStartY: number;
}

export const NetworkTopologyEditor: React.FC<NetworkTopologyEditorProps> = ({
  contractId,
  subsystemIndex,
  subsystemType,
  readOnly = false,
  onSaved,
}) => {
  const [nodes, setNodes] = useState<TopologyNode[]>([]);
  const [connections, setConnections] = useState<TopologyConnection[]>([]);
  const [topologyMeta, setTopologyMeta] = useState<NetworkTopologyData | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [connectingMode, setConnectingMode] = useState(false);
  const [connectingSource, setConnectingSource] = useState<string | null>(null);
  const [connectionTech, setConnectionTech] = useState<ConnectionTechnology>('fiber');
  const [showAddNodeModal, setShowAddNodeModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const dragRef = useRef<DragState | null>(null);

  // Unique ID prefix for SVG markers to avoid collisions across multiple instances
  const svgPrefix = `topo-${contractId}-${subsystemIndex}`;

  // Load topology on mount
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    networkTopologyService
      .getByContractAndSubsystem(contractId, subsystemIndex)
      .then((topology: NetworkTopologyData | null) => {
        if (!mounted) return;
        if (topology) {
          setTopologyMeta(topology);
          setNodes(topology.nodes.map(mapBackendNodeToFrontend));
          setConnections(topology.connections);
        }
      })
      .catch(() => {
        if (!mounted) return;
        setError('Błąd ładowania topologii');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [contractId, subsystemIndex]);

  // Delete selected node or connection
  const handleDeleteSelected = useCallback(() => {
    if (!selectedId || readOnly) return;
    setNodes(prev => {
      const isNode = prev.some(n => n.id === selectedId);
      if (!isNode) return prev;
      return prev.filter(n => n.id !== selectedId);
    });
    setConnections(prev => {
      // Remove connections attached to the deleted node, or the connection itself
      return prev.filter(
        c => c.id !== selectedId && c.source !== selectedId && c.target !== selectedId
      );
    });
    setSelectedId(null);
    setIsDirty(true);
  }, [selectedId, readOnly]);

  // Keyboard Delete key listener
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete') handleDeleteSelected();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [handleDeleteSelected]);

  // Node drag (mouse down → register document mouse move/up)
  const handleNodeMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, nodeId: string) => {
      if (readOnly || connectingMode) return;
      e.stopPropagation();
      e.preventDefault();
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;

      dragRef.current = {
        nodeId,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        nodeStartX: node.position.x,
        nodeStartY: node.position.y,
      };

      const onMouseMove = (me: MouseEvent) => {
        const drag = dragRef.current;
        if (!drag) return;
        const dx = me.clientX - drag.startMouseX;
        const dy = me.clientY - drag.startMouseY;
        setNodes(prev =>
          prev.map(n =>
            n.id === drag.nodeId
              ? {
                  ...n,
                  position: {
                    x: Math.max(0, drag.nodeStartX + dx),
                    y: Math.max(0, drag.nodeStartY + dy),
                  },
                }
              : n
          )
        );
      };

      const onMouseUp = () => {
        if (dragRef.current) {
          setIsDirty(true);
          dragRef.current = null;
        }
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [readOnly, connectingMode, nodes]
  );

  // Node click: select or set connection source/target
  const handleNodeClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, nodeId: string) => {
      e.stopPropagation();
      if (readOnly) return;

      if (connectingMode) {
        if (!connectingSource) {
          setConnectingSource(nodeId);
          return;
        }
        if (connectingSource === nodeId) {
          // Clicking source again cancels
          setConnectingSource(null);
          return;
        }
        // Create the connection
        const newConn: TopologyConnection = {
          id: crypto.randomUUID(),
          source: connectingSource,
          target: nodeId,
          technology: connectionTech,
        };
        setConnections(prev => [...prev, newConn]);
        setConnectingSource(null);
        setConnectingMode(false);
        setIsDirty(true);
        return;
      }

      setSelectedId(prev => (prev === nodeId ? null : nodeId));
    },
    [readOnly, connectingMode, connectingSource, connectionTech]
  );

  // Connection line click: select the connection
  const handleConnectionClick = useCallback((connId: string) => {
    setSelectedId(prev => (prev === connId ? null : connId));
  }, []);

  // Canvas background click: deselect
  const handleCanvasClick = useCallback(() => {
    setSelectedId(null);
    if (connectingMode) setConnectingSource(null);
  }, [connectingMode]);

  // Add a new node (from modal)
  const handleAddNode = useCallback(
    (nodeData: Omit<TopologyNode, 'id' | 'position'>) => {
      const newNode: TopologyNode = {
        ...nodeData,
        id: crypto.randomUUID(),
        position: {
          x: 50 + Math.floor(nodes.length / 3) * 170,
          y: 50 + (nodes.length % 3) * 90,
        },
      };
      setNodes(prev => [...prev, newNode]);
      setIsDirty(true);
      setShowAddNodeModal(false);
    },
    [nodes.length]
  );

  // Save topology (immutable: creates new version or first record)
  const handleSave = useCallback(async () => {
    if (saving) return;

    // Frontend validation before sending
    const validationErrors: string[] = [];

    if (!contractId || contractId < 1) {
      validationErrors.push('Nieprawidłowe ID kontraktu');
    }

    if (!subsystemType) {
      validationErrors.push('Brak typu podsystemu');
    }

    nodes.forEach((n, idx) => {
      if (!n.label) validationErrors.push(`Node ${idx}: brak etykiety`);
      if (!n.type) validationErrors.push(`Node ${idx}: brak nodeType`);
      if (typeof n.position?.x !== 'number') validationErrors.push(`Node ${idx}: brak position.x`);
      if (typeof n.position?.y !== 'number') validationErrors.push(`Node ${idx}: brak position.y`);
    });

    connections.forEach((c, idx) => {
      if (!c.source) validationErrors.push(`Connection ${idx}: brak source`);
      if (!c.target) validationErrors.push(`Connection ${idx}: brak target`);
      if (!c.technology) validationErrors.push(`Connection ${idx}: brak technology`);
      const techUpper = c.technology?.toUpperCase();
      if (c.technology && !['FIBER', 'LAN'].includes(techUpper!)) {
        validationErrors.push(`Connection ${idx}: nieprawidłowa technologia "${c.technology}"`);
      }
    });

    if (validationErrors.length > 0) {
      console.error('❌ Frontend validation failed:', validationErrors);
      setError(`Błędy walidacji:\n${validationErrors.join('\n')}`);
      return;
    }

    console.log('✅ Frontend validation passed');

    try {
      setSaving(true);
      setError(null);

      console.log('📤 Saving topology...');
      console.log('📊 Current state:', {
        contractId,
        subsystemIndex,
        subsystemType,
        nodesCount: nodes.length,
        connectionsCount: connections.length,
        topologyMeta,
      });

      const dto: Partial<NetworkTopologyData> = {
        name: topologyMeta?.name ?? `Topologia ${subsystemType}`,
        contractId,
        subsystemIndex,
        subsystemType,
        // Map from network-topology.types (frontend) to backend DTO field names:
        // - type → nodeType, add sourceType fallback, position from position.x/y
        nodes: nodes.map(n => ({
          id: n.id,
          nodeType: n.type,
          sourceType: (n as any).sourceType ?? 'manual',
          label: n.label,
          position: { x: n.position?.x ?? 0, y: n.position?.y ?? 0 },
          kilometre: (n as any).kilometre,
          isActive: (n as any).isActive,
          taskId: n.data?.taskId,
        })) as any,
        // Map from network-topology.types (frontend) to backend DTO field names:
        // - sourceNodeId/targetNodeId → source/target, technology to uppercase
        connections: connections.map(c => ({
          id: c.id,
          source: (c as any).sourceNodeId ?? c.source,
          target: (c as any).targetNodeId ?? c.target,
          technology: (c.technology?.toUpperCase() ?? 'FIBER') as any,
          distance: (c as any).distance,
          notes: (c as any).notes,
        })) as any,
        notes: topologyMeta?.notes ?? undefined,
      };

      if (import.meta.env.DEV) {
        console.log('📦 DTO to send:', JSON.stringify(dto, null, 2));
        console.log('🔍 Mapped connections:', connections.map((c, idx) => ({
          idx,
          original: { source: c.source, target: c.target, technology: c.technology },
          mapped: {
            source: (c as any).sourceNodeId ?? c.source,
            target: (c as any).targetNodeId ?? c.target,
            technology: c.technology?.toUpperCase() ?? 'FIBER',
          },
        })));
      }

      let saved: NetworkTopologyData;
      if (topologyMeta) {
        saved = await networkTopologyService.update(topologyMeta.id, dto);
      } else {
        saved = await networkTopologyService.create(dto);
      }

      setTopologyMeta(saved);
      setIsDirty(false);
      setSuccessMsg('Topologia zapisana pomyślnie');
      setTimeout(() => setSuccessMsg(null), 3000);
      onSaved?.(saved);
    } catch (error: any) {
      console.error('❌ Save failed:', error);
      console.error('❌ Response status:', error.response?.status);
      console.error('❌ Response data:', JSON.stringify(error.response?.data, null, 2));
      console.error('❌ Request config:', {
        url: error.config?.url,
        method: error.config?.method,
        data: error.config?.data,
      });
      setError(`Błąd zapisywania topologii: ${error.response?.data?.message || error.message}`);
    } finally {
      setSaving(false);
    }
  }, [saving, topologyMeta, contractId, subsystemIndex, subsystemType, nodes, connections, onSaved]);

  // Restore a version from history
  const handleRestore = useCallback((topology: NetworkTopologyData) => {
    setTopologyMeta(topology);
    setNodes(topology.nodes.map(mapBackendNodeToFrontend));
    setConnections(topology.connections);
    setIsDirty(false);
    setShowHistoryModal(false);
  }, []);

  // Center point of a node (for SVG line endpoints)
  const nodeCenter = (node: TopologyNode) => ({
    x: node.position.x + NODE_WIDTH / 2,
    y: node.position.y + NODE_HEIGHT / 2,
  });

  if (loading) {
    return (
      <div className="topology-editor-loading">
        <div className="spinner" />
        <span>Ładowanie topologii...</span>
      </div>
    );
  }

  return (
    <div className="topology-editor">
      {error && <div className="alert alert-error">{error}</div>}
      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      {/* Toolbar */}
      {!readOnly && (
        <div className="topology-toolbar">
          <button className="btn btn-secondary btn-sm" onClick={() => setShowAddNodeModal(true)}>
            ➕ Dodaj węzeł
          </button>

          <button
            className={`btn btn-sm ${connectingMode ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              setConnectingMode(m => !m);
              setConnectingSource(null);
            }}
          >
            🔗{' '}
            {connectingMode
              ? connectingSource
                ? 'Wybierz cel...'
                : 'Wybierz źródło...'
              : 'Połącz'}
          </button>

          {connectingMode && (
            <select
              className="topology-tech-select"
              value={connectionTech}
              onChange={e => setConnectionTech(e.target.value as ConnectionTechnology)}
            >
              <option value="fiber">FIBER</option>
              <option value="lan">LAN</option>
            </select>
          )}

          <button
            className="btn btn-secondary btn-sm"
            onClick={handleDeleteSelected}
            disabled={!selectedId}
          >
            🗑️ Usuń zaznaczony
          </button>

          <div className="topology-toolbar-spacer" />

          <button className="btn btn-secondary btn-sm" onClick={() => setShowHistoryModal(true)}>
            📜 Historia
          </button>

          <button
            className={`btn btn-sm ${isDirty ? 'btn-primary' : 'btn-secondary'}`}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Zapisywanie...' : '💾 Zapisz'}
          </button>
        </div>
      )}

      {/* Canvas */}
      <div
        className={`topology-canvas${connectingMode ? ' topology-canvas--connecting' : ''}`}
        onClick={handleCanvasClick}
      >
        {/* Empty state — shown when no nodes exist */}
        {nodes.length === 0 && (
          <div className="topology-empty-state">
            <div className="topology-empty-icon">🌐</div>
            <p>Brak węzłów w topologii</p>
            {!readOnly && (
              <button
                className="btn btn-primary"
                onClick={e => {
                  e.stopPropagation();
                  setShowAddNodeModal(true);
                }}
              >
                ➕ Utwórz topologię
              </button>
            )}
          </div>
        )}

        {/* SVG overlay for connection lines */}
        <svg className="topology-connections-svg">
          <defs>
            <marker
              id={`${svgPrefix}-arrow-fiber`}
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="var(--primary-color)" />
            </marker>
            <marker
              id={`${svgPrefix}-arrow-lan`}
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="#3b82f6" />
            </marker>
          </defs>

          {connections.map(conn => {
            const src = nodes.find(n => n.id === conn.source);
            const tgt = nodes.find(n => n.id === conn.target);
            if (!src || !tgt) return null;
            const { x: x1, y: y1 } = nodeCenter(src);
            const { x: x2, y: y2 } = nodeCenter(tgt);
            const isSelected = conn.id === selectedId;
            const techClass = (conn.technology ?? 'fiber').toLowerCase();

            return (
              <g key={conn.id}>
                {/* Invisible wide stroke for easier click targeting */}
                {!readOnly && (
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="transparent"
                    strokeWidth="16"
                    style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                    onClick={e => {
                      e.stopPropagation();
                      handleConnectionClick(conn.id);
                    }}
                  />
                )}
                {/* Visible line */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  className={`topology-conn topology-conn--${techClass}${isSelected ? ' topology-conn--selected' : ''}`}
                  style={{ pointerEvents: 'none' }}
                  markerEnd={`url(#${svgPrefix}-arrow-${techClass})`}
                />
              </g>
            );
          })}
        </svg>

        {/* Nodes */}
        {nodes.map(node => (
          <CustomNode
            key={node.id}
            node={node}
            isSelected={node.id === selectedId}
            isConnectingSource={connectingSource === node.id}
            isConnectingTargetHint={
              connectingMode && !!connectingSource && connectingSource !== node.id
            }
            style={{ left: node.position.x, top: node.position.y, width: NODE_WIDTH }}
            onMouseDown={e => handleNodeMouseDown(e, node.id)}
            onClick={e => handleNodeClick(e, node.id)}
          />
        ))}
      </div>

      {/* Version info bar */}
      {topologyMeta && (
        <div className="topology-version-info">
          <span>Wersja: {topologyMeta.version}</span>
          <span className="topology-version-sep">·</span>
          <span>{new Date(topologyMeta.createdAt).toLocaleString('pl-PL')}</span>
          {isDirty && <span className="topology-dirty-badge">● niezapisane</span>}
        </div>
      )}

      {/* Modals */}
      {showAddNodeModal && (
        <AddNodeModal onAdd={handleAddNode} onClose={() => setShowAddNodeModal(false)} />
      )}
      {showHistoryModal && (
        <TopologyHistoryModal
          contractId={contractId}
          subsystemIndex={subsystemIndex}
          onRestore={handleRestore}
          onClose={() => setShowHistoryModal(false)}
        />
      )}
    </div>
  );
};
