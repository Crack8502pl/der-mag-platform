// src/components/contracts/wizard/steps/TaskRelationshipsStep.tsx
// Wizard step: Assign child tasks (Nastawnia, SKP, Przejazd) to parent LCS tasks
// Uses @dnd-kit/core for drag-and-drop interaction.

import React, { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import type { WizardData, WizardLCSRelationship, WizardTaskRelationships } from '../types/wizard.types';
import './TaskRelationshipsStep.css';

// ─── Types ───────────────────────────────────────────────────────────────────

/** A flat task reference across all SMOKIP subsystems */
interface FlatTask {
  key: string; // "{subsystemIndex}-{taskDetailIndex}"
  subsystemIndex: number;
  taskIndex: number;
  taskType: string;
  label: string;
  kilometraz?: string;
  nazwa?: string;
}

/** A flat LCS node */
interface LCSNode {
  key: string; // "{subsystemIndex}-{taskDetailIndex}"
  subsystemIndex: number;
  taskIndex: number;
  lcsWizardId: string;
  label: string;
  nazwa?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CHILD_TASK_TYPES = ['NASTAWNIA', 'SKP', 'PRZEJAZD_KAT_A', 'PRZEJAZD_KAT_B', 'PRZEJAZD_KAT_C', 'PRZEJAZD_KAT_E', 'PRZEJAZD_KAT_F'];

const TASK_TYPE_LABELS: Record<string, string> = {
  NASTAWNIA: 'Nastawnia',
  SKP: 'SKP',
  PRZEJAZD_KAT_A: 'Przejazd KAT A',
  PRZEJAZD_KAT_B: 'Przejazd KAT B',
  PRZEJAZD_KAT_C: 'Przejazd KAT C',
  PRZEJAZD_KAT_E: 'Przejazd KAT E',
  PRZEJAZD_KAT_F: 'Przejazd KAT F',
  LCS: 'LCS',
};

function buildLabel(taskType: string, task: { kilometraz?: string; nazwa?: string; kategoria?: string }): string {
  const base = TASK_TYPE_LABELS[taskType] ?? taskType;
  if (task.nazwa) return `${base}: ${task.nazwa}`;
  if (task.kilometraz) return `${base} km ${task.kilometraz}`;
  return base;
}

// ─── Draggable chip ───────────────────────────────────────────────────────────

interface DraggableChipProps {
  task: FlatTask;
  isAssigned: boolean;
}

const DraggableChip: React.FC<DraggableChipProps> = ({ task, isAssigned }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.key,
    disabled: isAssigned,
  });

  const typeShort = TASK_TYPE_LABELS[task.taskType]?.split(' ').pop() ?? task.taskType;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`task-chip${isDragging ? ' dragging' : ''}${isAssigned ? ' assigned' : ''}`}
      title={isAssigned ? 'Już przypisane do LCS' : 'Przeciągnij do LCS'}
    >
      <span className="task-chip-badge">{typeShort}</span>
      {task.label}
    </div>
  );
};

// ─── Assigned chip (inside drop zone) ────────────────────────────────────────

interface AssignedChipProps {
  task: FlatTask;
  onRemove: () => void;
}

const AssignedChip: React.FC<AssignedChipProps> = ({ task, onRemove }) => {
  const typeShort = TASK_TYPE_LABELS[task.taskType]?.split(' ').pop() ?? task.taskType;
  return (
    <div className="task-chip" style={{ cursor: 'default' }}>
      <span className="task-chip-badge">{typeShort}</span>
      {task.label}
      <button
        className="task-chip-remove"
        onClick={onRemove}
        title="Usuń z LCS"
        aria-label={`Usuń ${task.label} z LCS`}
      >
        ×
      </button>
    </div>
  );
};

// ─── LCS drop zone ────────────────────────────────────────────────────────────

interface LCSDropZoneProps {
  lcs: LCSNode;
  assignedTasks: FlatTask[];
  onRemoveChild: (childKey: string) => void;
  allTasks: FlatTask[];
}

const LCSDropZone: React.FC<LCSDropZoneProps> = ({ lcs, assignedTasks, onRemoveChild, allTasks: _allTasks }) => {
  const { setNodeRef, isOver } = useDroppable({ id: `lcs-${lcs.key}` });

  const stats = [
    assignedTasks.filter((t) => t.taskType === 'NASTAWNIA').length,
    assignedTasks.filter((t) => t.taskType === 'SKP').length,
    assignedTasks.filter((t) => CHILD_TASK_TYPES.includes(t.taskType) && t.taskType.startsWith('PRZEJAZD')).length,
  ];

  return (
    <div className={`lcs-card${isOver ? ' drop-over' : ''}`}>
      <div className="lcs-card-header">
        <div>
          <div className="lcs-card-title">🏭 {lcs.label}</div>
          {lcs.nazwa && <div className="lcs-card-subtitle">{lcs.nazwa}</div>}
        </div>
        <div className="lcs-card-stats">
          Nastawnie: {stats[0]} | SKP: {stats[1]} | Przejazdy: {stats[2]}
        </div>
      </div>
      <div ref={setNodeRef} className={`lcs-drop-zone${isOver ? ' drop-over' : ''}`}>
        {assignedTasks.length === 0 ? (
          <span className="lcs-drop-zone-empty">↓ Upuść tutaj zadania podrzędne</span>
        ) : (
          assignedTasks.map((task) => (
            <AssignedChip key={task.key} task={task} onRemove={() => onRemoveChild(task.key)} />
          ))
        )}
      </div>
    </div>
  );
};

// ─── Main step component ──────────────────────────────────────────────────────

interface Props {
  wizardData: WizardData;
  onUpdate: (data: Partial<WizardData>) => void;
}

export const TaskRelationshipsStep: React.FC<Props> = ({ wizardData, onUpdate }) => {
  const [activeTask, setActiveTask] = useState<FlatTask | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // ── Build flat lists of LCS nodes and eligible child tasks ──────────────────

  const { lcsNodes, childTasks } = useMemo(() => {
    const lcsList: LCSNode[] = [];
    const children: FlatTask[] = [];

    wizardData.subsystems.forEach((sub, sIdx) => {
      if (sub.type !== 'SMOKIP_A' && sub.type !== 'SMOKIP_B') return;
      const details = sub.taskDetails ?? [];
      details.forEach((detail, dIdx) => {
        const key = `${sIdx}-${dIdx}`;
        if (detail.taskType === 'LCS') {
          lcsList.push({
            key,
            subsystemIndex: sIdx,
            taskIndex: dIdx,
            lcsWizardId: detail.taskWizardId ?? key,
            label: buildLabel('LCS', detail),
            nazwa: detail.nazwa,
          });
        } else if (CHILD_TASK_TYPES.includes(detail.taskType)) {
          children.push({
            key,
            subsystemIndex: sIdx,
            taskIndex: dIdx,
            taskType: detail.taskType,
            label: buildLabel(detail.taskType, detail),
            kilometraz: detail.kilometraz,
            nazwa: detail.nazwa,
          });
        }
      });
    });

    return { lcsNodes: lcsList, childTasks: children };
  }, [wizardData.subsystems]);

  // ── Derive current relationship state ──────────────────────────────────────

  const relationships: WizardTaskRelationships = wizardData.taskRelationships ?? {};

  // Set of all assigned child keys
  const assignedKeys = useMemo(() => {
    const set = new Set<string>();
    Object.values(relationships).forEach((rel) => rel.childTaskKeys.forEach((k) => set.add(k)));
    return set;
  }, [relationships]);

  // Get assigned tasks for a specific LCS
  const getAssignedTasks = (lcsWizardId: string): FlatTask[] => {
    const keys = relationships[lcsWizardId]?.childTaskKeys ?? [];
    return keys
      .map((k) => childTasks.find((t) => t.key === k))
      .filter((t): t is FlatTask => t !== undefined);
  };

  // ── Update helper ──────────────────────────────────────────────────────────

  const updateRelationships = (updated: WizardTaskRelationships) => {
    onUpdate({ taskRelationships: updated });
  };

  const assignChildToLCS = (lcsWizardId: string, childKey: string) => {
    // Guard: don't allow double-assignment
    if (assignedKeys.has(childKey)) return;

    const prev: WizardLCSRelationship = relationships[lcsWizardId] ?? {
      lcsWizardId,
      childTaskKeys: [],
    };
    updateRelationships({
      ...relationships,
      [lcsWizardId]: { ...prev, childTaskKeys: [...prev.childTaskKeys, childKey] },
    });
  };

  const removeChildFromLCS = (lcsWizardId: string, childKey: string) => {
    const prev = relationships[lcsWizardId];
    if (!prev) return;
    updateRelationships({
      ...relationships,
      [lcsWizardId]: {
        ...prev,
        childTaskKeys: prev.childTaskKeys.filter((k) => k !== childKey),
      },
    });
  };

  // ── DnD handlers ──────────────────────────────────────────────────────────

  const handleDragStart = (event: DragStartEvent) => {
    const task = childTasks.find((t) => t.key === event.active.id);
    setActiveTask(task ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const childKey = active.id as string;
    const dropId = over.id as string;

    if (!dropId.startsWith('lcs-')) return;
    const lcs = lcsNodes.find((l) => `lcs-${l.key}` === dropId);
    if (!lcs) return;

    assignChildToLCS(lcs.lcsWizardId, childKey);
  };

  // ── Summary stats ──────────────────────────────────────────────────────────

  const totalAssigned = assignedKeys.size;
  const totalChildren = childTasks.length;

  // ── Render ─────────────────────────────────────────────────────────────────

  if (lcsNodes.length === 0) {
    return (
      <div className="wizard-step-content relationships-step">
        <h3>🔗 Powiązania zadań</h3>
        <div className="rel-empty">
          Brak zadań LCS w wybranych podsystemach. Ten krok nie jest wymagany.
        </div>
      </div>
    );
  }

  return (
    <div className="wizard-step-content relationships-step">
      <h3>🔗 Powiązania zadań (LCS → Dzieci)</h3>
      <p className="info-text">
        Przeciągnij zadania podrzędne (Nastawnia, SKP, Przejazdy) do odpowiednich LCS-ów, aby określić, które zadania podlegają danemu centrum zarządzania.
        Krok opcjonalny – możesz go pominąć.
      </p>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="relationships-layout">
          {/* Left: available child tasks */}
          <div className="rel-panel">
            <h4>📋 Dostępne zadania ({totalChildren - totalAssigned} / {totalChildren})</h4>
            <div className="available-tasks">
              {childTasks.length === 0 ? (
                <div className="rel-empty">Brak zadań podrzędnych</div>
              ) : (
                childTasks.map((task) => (
                  <DraggableChip
                    key={task.key}
                    task={task}
                    isAssigned={assignedKeys.has(task.key)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Right: LCS drop zones */}
          <div className="rel-panel">
            <h4>🏭 Centra zarządzania LCS ({lcsNodes.length})</h4>
            <div className="lcs-cards">
              {lcsNodes.map((lcs) => (
                <LCSDropZone
                  key={lcs.key}
                  lcs={lcs}
                  assignedTasks={getAssignedTasks(lcs.lcsWizardId)}
                  onRemoveChild={(childKey) => removeChildFromLCS(lcs.lcsWizardId, childKey)}
                  allTasks={childTasks}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Drag overlay – shows the chip being dragged */}
        <DragOverlay>
          {activeTask && (
            <div className="task-chip" style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.4)', opacity: 0.9 }}>
              <span className="task-chip-badge">
                {TASK_TYPE_LABELS[activeTask.taskType]?.split(' ').pop() ?? activeTask.taskType}
              </span>
              {activeTask.label}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <div className="relationships-summary">
        Przypisano <strong>{totalAssigned}</strong> z {totalChildren} zadań podrzędnych do{' '}
        <strong>{lcsNodes.length}</strong> LCS-ów.
      </div>
    </div>
  );
};
