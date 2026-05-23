// src/components/network-topology/NetworkTopologyStep.tsx
// Wizard step for network topology — stores data locally in wizardData (no API calls)

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type {
  TopologyNode,
  TopologyConnection,
  ConnectionTechnology,
} from '../../types/network-topology.types';
import type { WizardData } from '../contracts/wizard/types/wizard.types';
import { normalizeTaskData } from '../contracts/wizard/utils/taskDataNormalizer';
import { TopologyToolbar } from './TopologyToolbar';
import { TopologySidebar } from './TopologySidebar';
import { ConnectionModal } from './ConnectionModal';
import { AuxiliaryNodeModal } from './AuxiliaryNodeModal';
import { autoLayoutNodes } from './utils/autoLayout';
import { optimizeLayout } from './utils/forceDirectedLayout';
import { findCrossingConnections } from './utils/lineIntersection';
import { getConnectionEndpoints } from './utils/edgeRouting';
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [crossingConnections, setCrossingConnections] = useState<Set<string>>(new Set());
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const isExportingRef = useRef(false);
  const dragRef = useRef<DragState | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  /** Returns the topology storage key for the current subsystem.
   * Existing subsystems in ExtendWizard carry a subsystemId – use a stable string key
   * to avoid index conflicts when new subsystems are prepended to the list.
   * New subsystems and CreateWizard use the numeric subsystemIndex. */
  const getTopologyKey = useCallback((): number | string => {
    const subsystem = wizardData.subsystems[subsystemIndex];
    return subsystem?.subsystemId !== undefined
      ? `subsystem-${subsystem.subsystemId}`
      : subsystemIndex;
  }, [subsystemIndex, wizardData.subsystems]);

  // Initialize nodes from wizardData on mount
  useEffect(() => {
    const topologyKey = getTopologyKey();

    // Load existing topology data if available
    const existing = wizardData.networkTopologies?.[topologyKey];
    if (existing && existing.nodes.length > 0) {
      setNodes(existing.nodes);
      setConnections(existing.connections);
      return;
    }

    // Initialize nodes from subsystem taskDetails
    const subsystem = wizardData.subsystems[subsystemIndex];
    const taskDetails = subsystem?.taskDetails ?? [];
    const liniaKolejowa = wizardData.liniaKolejowa;
    const initialNodes: TopologyNode[] = taskDetails.map((task, idx) => {
      const normalized = normalizeTaskData(task, idx, liniaKolejowa);
      return {
        id: normalized.id,
        type: 'task' as const,
        label: normalized.label,
        position: {
          x: 50 + (idx % 4) * 170,
          y: 50 + Math.floor(idx / 4) * 110,
        },
        data: {
          taskId: task.id,
          km: normalized.kilometrazNumeric,
        },
      };
    });
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
        [getTopologyKey()]: { nodes, connections },
      },
    });
    setIsDirty(false);
    setSuccessMsg('Topologia zapisana w kreatorze');
    setTimeout(() => setSuccessMsg(null), 3000);
  }, [nodes, connections, getTopologyKey, wizardData.networkTopologies, onUpdate]);

  // Auto-layout nodes in a grid
  const handleAutoLayout = useCallback(() => {
    const laid = autoLayoutNodes(nodes);
    setNodes(laid);
    setIsDirty(true);
  }, [nodes]);

  // Force-directed layout: reduces crossings and spreads nodes evenly
  const handleOptimizeLayout = useCallback(() => {
    const optimized = optimizeLayout(nodes, connections);
    setNodes(optimized);
    setIsDirty(true);
  }, [nodes, connections]);

  // Detect crossing connections whenever nodes or connections change
  useEffect(() => {
    const connectionLines = connections
      .map(conn => {
        const src = nodes.find(n => n.id === conn.source);
        const tgt = nodes.find(n => n.id === conn.target);
        if (!src || !tgt) return null;
        const { sourcePoint, targetPoint } = getConnectionEndpoints(src, tgt);
        return {
          id: conn.id,
          sourceId: conn.source,
          targetId: conn.target,
          start: sourcePoint,
          end: targetPoint,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);

    const crossings = findCrossingConnections(connectionLines);
    const crossingIds = new Set<string>();
    crossings.forEach(([id1, id2]) => {
      crossingIds.add(id1);
      crossingIds.add(id2);
    });
    setCrossingConnections(crossingIds);
  }, [nodes, connections]);

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

  // Canvas drag-over: allow drop
  const handleCanvasDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  // Canvas drop: create a node from the dragged sidebar task
  const handleCanvasDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      try {
        const dataStr = e.dataTransfer.getData('application/json');
        if (!dataStr) return;

        const data = JSON.parse(dataStr) as { type: string; taskId: number; label: string; km?: number };
        if (data.type !== 'task') return;

        const canvasRect = canvasRef.current?.getBoundingClientRect();
        if (!canvasRect) return;

        const dropX = e.clientX - canvasRect.left;
        const dropY = e.clientY - canvasRect.top;

        const taskDetail = wizardData.subsystems[subsystemIndex]?.taskDetails?.[data.taskId];
        if (!taskDetail) return;

        const normalized = normalizeTaskData(taskDetail, data.taskId, wizardData.liniaKolejowa);

        // Prevent duplicates using the stable normalized ID (covers taskWizardId and DB id)
        if (nodes.some(n => n.id === normalized.id)) {
          console.warn('Task already exists on canvas:', normalized.label);
          return;
        }

        const newNode: TopologyNode = {
          id: normalized.id,
          type: 'task' as const,
          label: normalized.label,
          position: {
            x: Math.max(0, dropX - NODE_WIDTH / 2),
            y: Math.max(0, dropY - 30),
          },
          data: {
            taskId: taskDetail.id,
            km: normalized.kilometrazNumeric,
          },
        };

        setNodes(prev => [...prev, newNode]);
        setIsDirty(true);
      } catch (error) {
        console.error('Drop error:', error);
      }
    },
    [nodes, wizardData, subsystemIndex]
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
    (t, i) => {
      const normalized = normalizeTaskData(t, i, wizardData.liniaKolejowa);
      return {
        id: i,
        name: normalized.label,
        km: normalized.kilometrazNumeric,
      };
    }
  );

  // Stats
  const totalDistance = connections.reduce((sum, c) => {
    const dist = parseFloat(c.label ?? '0') || 0;
    return sum + dist;
  }, 0);

  // Export topology canvas to PDF (A3 horizontal) and save via backend.
  // Scale is device-pixel-ratio-based (2× devicePixelRatio) for high quality output.
  const handleExportPdf = useCallback(async () => {
    if (!canvasRef.current || isExportingRef.current) return;
    isExportingRef.current = true;
    setIsExportingPdf(true);
    // Włącz tryb dokumentacyjny (białe tło, konturowy styl)
    canvasRef.current.classList.add('topology-canvas--print');
    // Poczekaj na zastosowanie CSS
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    try {
      const [html2canvasModule, jsPDFModule] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      const html2canvas = html2canvasModule.default;
      const { jsPDF } = jsPDFModule;

      // A3 horizontal: 420 × 297 mm
      const A3_W_MM = 420;
      const A3_H_MM = 297;

      const canvas = await html2canvas(canvasRef.current, {
        scale: window.devicePixelRatio * 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: canvasRef.current.scrollWidth,
        height: canvasRef.current.scrollHeight,
      });

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a3',
      });

      const MARGIN_MM = 10;
      const availW = A3_W_MM - 2 * MARGIN_MM;
      const availH = A3_H_MM - 2 * MARGIN_MM;

      const canvasAspect = canvas.width / canvas.height;
      const pageAspect = availW / availH;

      let imgW: number, imgH: number;
      if (canvasAspect > pageAspect) {
        imgW = availW;
        imgH = availW / canvasAspect;
      } else {
        imgH = availH;
        imgW = availH * canvasAspect;
      }

      const offsetX = MARGIN_MM + (availW - imgW) / 2;
      const offsetY = MARGIN_MM + (availH - imgH) / 2;

      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', offsetX, offsetY, imgW, imgH, undefined, 'FAST');

      const contractId = wizardData.contractId;
      const defaultFilename = `topology_${subsystemIndex}_${Date.now()}.pdf`;

      if (contractId) {
        // Save via backend (streams the file back as an attachment)
        const pdfBase64 = pdf.output('datauristring').split(',')[1];
        const response = await fetch(`/api/contracts/${contractId}/topology/export-pdf`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ pdfBase64, subsystemIndex }),
        });
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = defaultFilename;
          a.click();
          URL.revokeObjectURL(url);
        } else {
          // Fallback: download directly
          pdf.save(defaultFilename);
        }
      } else {
        // No contractId yet (new wizard not yet submitted): download directly
        pdf.save(defaultFilename);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      const isModuleLoadError = err instanceof TypeError && (
        msg.includes('dynamically imported module') ||
        msg.includes('Failed to fetch') ||
        msg.includes('Importing a module')
      );
      const userMsg = isModuleLoadError
        ? 'Nie można załadować modułu PDF. Odśwież stronę i spróbuj ponownie.'
        : 'Błąd eksportu PDF. Spróbuj ponownie.';
      setErrorMsg(userMsg);
      setTimeout(() => setErrorMsg(null), 6000);
      console.error('PDF export error:', err);
    } finally {
      canvasRef.current?.classList.remove('topology-canvas--print');
      isExportingRef.current = false;
      setIsExportingPdf(false);
    }
  }, [wizardData.contractId, subsystemIndex]);

  return (
    <div className="topology-step">
      {successMsg && <div className="alert alert-success">{successMsg}</div>}
      {errorMsg && <div className="alert alert-error">{errorMsg}</div>}

      <TopologyToolbar
        onAutoLayout={handleAutoLayout}
        onOptimizeLayout={handleOptimizeLayout}
        onSave={handleSave}
        onExportPDF={handleExportPdf}
        isExportingPdf={isExportingPdf}
        isDirty={isDirty}
        crossingCount={Math.floor(crossingConnections.size / 2)}
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
            ref={canvasRef}
            className={`topology-canvas${connectingMode ? ' topology-canvas--connecting' : ''}`}
            onClick={() => {
              setSelectedId(null);
              if (connectingMode) setConnectingSource(null);
            }}
            onDragOver={handleCanvasDragOver}
            onDrop={handleCanvasDrop}
          >
            {nodes.length === 0 && (
              <div className="topology-empty-state">
                <div className="topology-empty-icon">🌐</div>
                <p>Brak węzłów. Przeciągnij zadania z panelu bocznego lub dodaj nowe.</p>
              </div>
            )}

            {/* SVG overlay for connection lines */}
            <svg className="topology-connections-svg">
              {connections.map(conn => {
                const src = nodes.find(n => n.id === conn.source);
                const tgt = nodes.find(n => n.id === conn.target);
                if (!src || !tgt) return null;
                const { sourcePoint, targetPoint } = getConnectionEndpoints(src, tgt);
                const x1 = sourcePoint.x;
                const y1 = sourcePoint.y;
                const x2 = targetPoint.x;
                const y2 = targetPoint.y;
                const isSelected = conn.id === selectedId;
                const isCrossing = crossingConnections.has(conn.id);
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
                      className={`topology-conn topology-conn--${tech}${isSelected ? ' topology-conn--selected' : ''}${isCrossing ? ' topology-conn--crossing' : ''}`}
                      style={{ pointerEvents: 'none' }}
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
