// src/components/contracts/wizard/steps/TaskRelationshipsStep.tsx
// Wizard step: Assign child tasks (Nastawnia, SKP, Przejazd) to parent tasks
// (LCS or standalone Nastawnia). Supports 2-level hierarchy.
// Uses @dnd-kit/core for drag-and-drop interaction.

import React, { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import type { WizardData, WizardTaskRelationship, WizardTaskRelationships } from '../types/wizard.types';
import { HierarchyTreeView } from './HierarchyTreeView';
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
  taskWizardId?: string;
}

/** A flat parent node (LCS or NASTAWNIA) */
interface ParentNode {
  key: string; // "{subsystemIndex}-{taskDetailIndex}"
  subsystemIndex: number;
  taskIndex: number;
  taskType: string; // 'LCS' | 'NASTAWNIA'
  taskWizardId: string;
  label: string;
  nazwa?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Task types that can act as parents in the hierarchy */
const PARENT_TASK_TYPES = ['LCS', 'NASTAWNIA'];

/** Task types that can be assigned as children */
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
      title={isAssigned ? 'Już przypisane do węzła nadrzędnego' : 'Przeciągnij do węzła nadrzędnego'}
    >
      <span className="task-chip-badge">{typeShort}</span>
      {task.label}
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

  // ── Build flat lists of parent nodes and eligible child tasks ───────────────

  const { parentNodes, childTasks } = useMemo(() => {
    const parents: ParentNode[] = [];
    const children: FlatTask[] = [];

    wizardData.subsystems.forEach((sub, sIdx) => {
      if (sub.type !== 'SMOKIP_A' && sub.type !== 'SMOKIP_B') return;
      const details = sub.taskDetails ?? [];
      details.forEach((detail, dIdx) => {
        const key = `${sIdx}-${dIdx}`;

        if (PARENT_TASK_TYPES.includes(detail.taskType)) {
          parents.push({
            key,
            subsystemIndex: sIdx,
            taskIndex: dIdx,
            taskType: detail.taskType,
            taskWizardId: detail.taskWizardId ?? key,
            label: buildLabel(detail.taskType, detail),
            nazwa: detail.nazwa,
          });
        }

        // NASTAWNIA can be both parent AND child
        if (CHILD_TASK_TYPES.includes(detail.taskType)) {
          children.push({
            key,
            subsystemIndex: sIdx,
            taskIndex: dIdx,
            taskType: detail.taskType,
            label: buildLabel(detail.taskType, detail),
            kilometraz: detail.kilometraz,
            nazwa: detail.nazwa,
            taskWizardId: detail.taskWizardId ?? key,
          });
        }
      });
    });

    return { parentNodes: parents, childTasks: children };
  }, [wizardData.subsystems]);

  // ── Derive current relationship state ──────────────────────────────────────

  const relationships: WizardTaskRelationships = wizardData.taskRelationships ?? {};

  // Set of all assigned child keys
  const assignedKeys = useMemo(() => {
    const set = new Set<string>();
    Object.values(relationships).forEach((rel) => rel.childTaskKeys.forEach((k) => set.add(k)));
    return set;
  }, [relationships]);

  // ── Update helpers ─────────────────────────────────────────────────────────

  const updateRelationships = (updated: WizardTaskRelationships) => {
    const beforeKeys = Object.keys(wizardData.taskRelationships || {});
    const afterKeys = Object.keys(updated);
    const beforeSet = new Set(beforeKeys);
    const afterSet = new Set(afterKeys);

    console.log('[TaskRelationshipsStep] Updating relationships:', {
      before: { keys: beforeKeys, count: beforeKeys.length },
      after: { keys: afterKeys, count: afterKeys.length },
      changes: updated,
      diff: {
        added: afterKeys.filter((k) => !beforeSet.has(k)),
        removed: beforeKeys.filter((k) => !afterSet.has(k)),
      },
    });

    onUpdate({ taskRelationships: updated });
  };

  const removeChildFromAllParents = (childKey: string, current: WizardTaskRelationships): WizardTaskRelationships => {
    const updated = { ...current };
    let changed = false;
    Object.keys(updated).forEach((parentId) => {
      const rel = updated[parentId];
      if (rel.childTaskKeys.includes(childKey)) {
        updated[parentId] = { ...rel, childTaskKeys: rel.childTaskKeys.filter((k) => k !== childKey) };
        changed = true;
      }
    });
    return changed ? updated : current;
  };

  const wouldCreateCircularDependency = (childKey: string, targetParentWizardId: string): boolean => {
    const childTask = childTasks.find((t) => t.key === childKey);
    if (!childTask?.taskWizardId) return false;

    // DFS: check if targetParentWizardId is reachable from childTask as a descendant
    const visited = new Set<string>();
    const checkDescendants = (ancestorWizardId: string): boolean => {
      if (visited.has(ancestorWizardId)) return false;
      visited.add(ancestorWizardId);
      const rel = relationships[ancestorWizardId];
      if (!rel) return false;
      for (const descKey of rel.childTaskKeys) {
        const desc = childTasks.find((t) => t.key === descKey);
        if (!desc) continue;
        if (desc.taskWizardId === targetParentWizardId) return true;
        if (desc.taskWizardId && checkDescendants(desc.taskWizardId)) return true;
      }
      return false;
    };

    return checkDescendants(childTask.taskWizardId);
  };

  const assignChildToParent = (parentWizardId: string, parentType: string, childKey: string) => {
    // Check circular dependency
    if (wouldCreateCircularDependency(childKey, parentWizardId)) {
      alert('⚠️ Nie można utworzyć cyklicznej zależności!');
      return;
    }

    // Depth limit: NASTAWNIA can only be child of LCS (level 0 parent), not of another ND
    const childTask = childTasks.find((t) => t.key === childKey);
    if (childTask?.taskType === 'NASTAWNIA') {
      const parentNode = parentNodes.find((p) => p.taskWizardId === parentWizardId);
      if (parentNode && parentNode.taskType === 'NASTAWNIA') {
        alert('⚠️ Nastawnia może być podrzędna tylko bezpośrednio pod LCS (maks. 2 poziomy głębokości).');
        return;
      }
    }

    // Remove child from any existing parent first (no double-assignment)
    const withRemoved = removeChildFromAllParents(childKey, relationships);

    const prev: WizardTaskRelationship = withRemoved[parentWizardId] ?? {
      parentWizardId,
      parentType,
      childTaskKeys: [],
    };

    updateRelationships({
      ...withRemoved,
      [parentWizardId]: { ...prev, childTaskKeys: [...prev.childTaskKeys, childKey] },
    });
  };

  const removeChildFromParent = (parentWizardId: string, childKey: string) => {
    const prev = relationships[parentWizardId];
    if (!prev) return;
    updateRelationships({
      ...relationships,
      [parentWizardId]: {
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

    if (!dropId.startsWith('parent-')) return;
    const parentWizardId = dropId.replace('parent-', '');

    const parentNode = parentNodes.find((p) => p.taskWizardId === parentWizardId);
    if (!parentNode) return;

    assignChildToParent(parentWizardId, parentNode.taskType, childKey);
  };

  // ── Summary stats ──────────────────────────────────────────────────────────

  const totalAssigned = assignedKeys.size;
  const totalChildren = childTasks.length;

  // ── Render ─────────────────────────────────────────────────────────────────

  if (parentNodes.length === 0) {
    return (
      <div className="wizard-step-content relationships-step">
        <h3>🔗 Powiązania zadań</h3>
        <div className="rel-empty">
          Brak zadań LCS ani Nastawnia w wybranych podsystemach. Ten krok nie jest wymagany.
        </div>
      </div>
    );
  }

  return (
    <div className="wizard-step-content relationships-step">
      <h3>🌳 Hierarchia zadań</h3>
      <p className="info-text">
        Przeciągnij zadania podrzędne (Nastawnia, SKP, Przejazdy) do węzłów nadrzędnych (LCS lub Nastawnia),
        aby określić hierarchię. Nastawnia może być zarówno węzłem nadrzędnym jak i podrzędnym LCS.
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

          {/* Right: hierarchy tree */}
          <div className="rel-panel">
            <h4>🌳 Hierarchia zadań ({parentNodes.length} węzły nadrzędne)</h4>
            <div className="hierarchy-panel">
              <HierarchyTreeView
                parentNodes={parentNodes}
                allTasks={childTasks}
                relationships={relationships}
                onRemoveChild={removeChildFromParent}
              />
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
        <strong>{parentNodes.length}</strong> węzłów nadrzędnych.
      </div>
    </div>
  );
};
