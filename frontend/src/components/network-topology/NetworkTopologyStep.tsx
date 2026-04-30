// src/components/network-topology/NetworkTopologyStep.tsx
// Wizard step for network topology — stores data locally in wizardData (no API calls)

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type {
  TopologyNode,
  TopologyConnection,
  ConnectionTechnology,
} from '../../types/network-topology.types';
import type { WizardData } from '../contracts/wizard/types/wizard.types';
import { TopologyToolbar } from './TopologyToolbar';
import { TopologySidebar } from './TopologySidebar';
import { ConnectionModal } from './ConnectionModal';
import { AuxiliaryNodeModal } from './AuxiliaryNodeModal';
import { autoLayoutNodes } from './utils/autoLayout';
import { CustomNode } from '../network/topology/CustomNode';
import '../../components/network/topology/NetworkTopologyEditor.css';
import './NetworkTopologyStep.css';

interface NetworkTopologyStepProps {
  wizardData: WizardData;
  onUpdate: (data: Partial<WizardData>) => void;
  subsystemIndex: number;
}

interface DragState {
  nodeId: string;
  startMouseX: number;
  startMouseY: number;
  nodeStartX: number;
  nodeStartY: number;
}

const NODE_WIDTH = 140;
const NODE_HEIGHT = 60;

export const NetworkTopologyStep: React.FC<NetworkTopologyStepProps> = ({
  wizardData,
  onUpdate,
  subsystemIndex,
}) => {
  const [nodes, setNodes] = useState<TopologyNode[]>([]);
  const [connections, setConnections] = useState<TopologyConnection[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [connectingMode, setConnectingMode] = useState(false);
  const [connectingSource, setConnectingSource] = useState<string | null>(null);
  const [connectionTech, setConnectionTech] = useState<ConnectionTechnology>('fiber');
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [showAuxiliaryModal, setShowAuxiliaryModal] = useState(false);
  const [pendingConnection, setPendingConnection] = useState<{
    source: TopologyNode;
    target: TopologyNode;
  } | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const dragRef = useRef<DragState | null>(null);

  // Initialize nodes from wizardData on mount
  useEffect(() => {
    // Load existing topology data if available
    const existing = wizardData.networkTopologies?.[subsystemIndex];
    if (existing && existing.nodes.length > 0) {
      setNodes(existing.nodes);
      setConnections(existing.connections);
      return;
    }

    // Initialize nodes from subsystem taskDetails
    const subsystem = wizardData.subsystems[subsystemIndex];
    const taskDetails = subsystem?.taskDetails ?? [];
    const initialNodes: TopologyNode[] = taskDetails.map((task, idx) => ({
      id: task.taskWizardId ?? crypto.randomUUID(),
      type: 'task' as const,
      label: task.nazwa || task.taskType || `Zadanie ${idx + 1}`,
      position: {
        x: 50 + (idx % 4) * 170,
        y: 50 + Math.floor(idx / 4) * 110,
      },
      data: {
        taskId: undefined,
        km: task.kilometraz ? parseFloat(task.kilometraz) : undefined,
      },
    }));
    setNodes(initialNodes);
    // Intentionally runs only on mount: we read initial wizard state once and let
    // the component own its local state from that point on. Re-running on every
    // wizardData change would reset in-progress edits the user hasn't saved yet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save topology to wizardData (no API calls)
  const handleSave = useCallback(() => {
    onUpdate({
      networkTopologies: {
        ...(wizardData.networkTopologies ?? {}),
        [subsystemIndex]: { nodes, connections },
      },
    });
    setIsDirty(false);
    setSuccessMsg('Topologia zapisana w kreatorze');
    setTimeout(() => setSuccessMsg(null), 3000);
  }, [nodes, connections, subsystemIndex, wizardData.networkTopologies, onUpdate]);

  // Auto-layout nodes in a grid
  const handleAutoLayout = useCallback(() => {
    const laid = autoLayoutNodes(nodes);
    setNodes(laid);
    setIsDirty(true);
  }, [nodes]);

  // Delete selected node or connection
  const handleDeleteSelected = useCallback(() => {
    if (!selectedId) return;
    const isNode = nodes.some(n => n.id === selectedId);
    if (isNode) {
      setNodes(prev => prev.filter(n => n.id !== selectedId));
      setConnections(prev =>
        prev.filter(c => c.source !== selectedId && c.target !== selectedId)
      );
    } else {
      setConnections(prev => prev.filter(c => c.id !== selectedId));
    }
    setSelectedId(null);
    setIsDirty(true);
  }, [selectedId, nodes]);

  // Node drag (mouse down → register document mouse move/up)
  const handleNodeMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, nodeId: string) => {
      if (connectingMode) return;
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
    [connectingMode, nodes]
  );

  // Node click: select or initiate connection
  const handleNodeClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, nodeId: string) => {
      e.stopPropagation();
      if (!connectingMode) {
        setSelectedId(prev => (prev === nodeId ? null : nodeId));
        return;
      }
      if (!connectingSource) {
        setConnectingSource(nodeId);
        return;
      }
      if (connectingSource === nodeId) {
        setConnectingSource(null);
        return;
      }
      // Open ConnectionModal with source and target
      const sourceNode = nodes.find(n => n.id === connectingSource);
      const targetNode = nodes.find(n => n.id === nodeId);
      if (!sourceNode || !targetNode) {
        setConnectingSource(null);
        return;
      }
      setPendingConnection({ source: sourceNode, target: targetNode });
      setShowConnectionModal(true);
      setConnectingSource(null);
      setConnectingMode(false);
    },
    [connectingMode, connectingSource, nodes]
  );

  // Confirm connection from ConnectionModal
  const handleConnectionConfirm = useCallback(
    (params: { technology: ConnectionTechnology; distance?: number; notes?: string }) => {
      if (!pendingConnection) return;
      const newConn: TopologyConnection = {
        id: crypto.randomUUID(),
        source: pendingConnection.source.id,
        target: pendingConnection.target.id,
        technology: params.technology,
        label: params.distance ? `${params.distance} km` : undefined,
      };
      setConnections(prev => [...prev, newConn]);
      setIsDirty(true);
      setPendingConnection(null);
      setShowConnectionModal(false);
    },
    [pendingConnection]
  );

  // Confirm auxiliary node from AuxiliaryNodeModal
  const handleAuxiliaryConfirm = useCallback(
    (result: { label: string; km: number; isActive: boolean }) => {
      const newNode: TopologyNode = {
        id: crypto.randomUUID(),
        type: 'auxiliary',
        label: result.label,
        position: {
          x: 50 + (nodes.length % 4) * 170,
          y: 50 + Math.floor(nodes.length / 4) * 110,
        },
        data: { km: result.km, isActive: result.isActive },
      };
      setNodes(prev => [...prev, newNode]);
      setIsDirty(true);
      setShowAuxiliaryModal(false);
    },
    [nodes.length]
  );

  // Add an external node directly
  const handleAddExternal = useCallback(() => {
    const externalCount = nodes.filter(n => n.type === 'external').length;
    const newNode: TopologyNode = {
      id: crypto.randomUUID(),
      type: 'external',
      label: `Zewnętrzny ${externalCount + 1}`,
      position: {
        x: 50 + (nodes.length % 4) * 170,
        y: 50 + Math.floor(nodes.length / 4) * 110,
      },
      data: {},
    };
    setNodes(prev => [...prev, newNode]);
    setIsDirty(true);
  }, [nodes]);

  // Sidebar tasks derived from subsystem taskDetails
  const sidebarTasks = (wizardData.subsystems[subsystemIndex]?.taskDetails ?? []).map(
    (t, i) => ({
      id: i,
      name: t.nazwa || t.taskType || `Zadanie ${i + 1}`,
      km: t.kilometraz ? parseFloat(t.kilometraz) : undefined,
    })
  );

  // Stats
  const totalDistance = connections.reduce((sum, c) => {
    const dist = parseFloat(c.label ?? '0') || 0;
    return sum + dist;
  }, 0);

  // Center point of a node for SVG line endpoints
  const nodeCenter = (node: TopologyNode) => ({
    x: node.position.x + NODE_WIDTH / 2,
    y: node.position.y + NODE_HEIGHT / 2,
  });

  return (
    <div className="topology-step">
      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      <TopologyToolbar
        onAutoLayout={handleAutoLayout}
        onSave={handleSave}
        isDirty={isDirty}
      />

      <div className="topology-step-body">
        <TopologySidebar
          tasks={sidebarTasks}
          onAddAuxiliary={() => setShowAuxiliaryModal(true)}
          onAddExternal={handleAddExternal}
        />

        <div className="topology-step-canvas-area">
          {/* Stats bar */}
          <div className="topology-step-stats">
            <span>Węzły: {nodes.length}</span>
            <span>Połączenia: {connections.length}</span>
            {totalDistance > 0 && <span>Dystans: {totalDistance.toFixed(2)} km</span>}
            {isDirty && <span className="topology-dirty-badge">● niezapisane</span>}
          </div>

          {/* Connecting mode controls */}
          <div className="topology-step-controls">
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
                : 'Połącz węzły'}
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
              className="btn btn-sm btn-secondary"
              disabled={!selectedId}
              onClick={handleDeleteSelected}
            >
              🗑️ Usuń
            </button>
          </div>

          {/* Canvas */}
          <div
            className={`topology-canvas${connectingMode ? ' topology-canvas--connecting' : ''}`}
            onClick={() => {
              setSelectedId(null);
              if (connectingMode) setConnectingSource(null);
            }}
          >
            {nodes.length === 0 && (
              <div className="topology-empty-state">
                <div className="topology-empty-icon">🌐</div>
                <p>Brak węzłów. Przeciągnij zadania z panelu bocznego lub dodaj nowe.</p>
              </div>
            )}

            {/* SVG overlay for connection lines */}
            <svg className="topology-connections-svg">
              <defs>
                <marker
                  id="step-arrow-fiber"
                  markerWidth="8"
                  markerHeight="6"
                  refX="7"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 8 3, 0 6" fill="#FF8C00" />
                </marker>
                <marker
                  id="step-arrow-lan"
                  markerWidth="8"
                  markerHeight="6"
                  refX="7"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 8 3, 0 6" fill="#1E90FF" />
                </marker>
              </defs>
              {connections.map(conn => {
                const src = nodes.find(n => n.id === conn.source);
                const tgt = nodes.find(n => n.id === conn.target);
                if (!src || !tgt) return null;
                const { x: x1, y: y1 } = nodeCenter(src);
                const { x: x2, y: y2 } = nodeCenter(tgt);
                const isSelected = conn.id === selectedId;
                const tech = (conn.technology ?? 'fiber').toLowerCase();
                return (
                  <g key={conn.id}>
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
                        setSelectedId(p => (p === conn.id ? null : conn.id));
                      }}
                    />
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      className={`topology-conn topology-conn--${tech}${isSelected ? ' topology-conn--selected' : ''}`}
                      style={{ pointerEvents: 'none' }}
                      markerEnd={`url(#step-arrow-${tech})`}
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
        </div>
      </div>

      {/* Modals */}
      {showConnectionModal && pendingConnection && (
        <ConnectionModal
          sourceNode={pendingConnection.source}
          targetNode={pendingConnection.target}
          onClose={() => {
            setShowConnectionModal(false);
            setPendingConnection(null);
          }}
          onConfirm={handleConnectionConfirm}
        />
      )}
      {showAuxiliaryModal && (
        <AuxiliaryNodeModal
          onClose={() => setShowAuxiliaryModal(false)}
          onConfirm={handleAuxiliaryConfirm}
        />
      )}
    </div>
  );
};
