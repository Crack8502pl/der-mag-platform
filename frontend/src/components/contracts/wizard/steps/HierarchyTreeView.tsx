// src/components/contracts/wizard/steps/HierarchyTreeView.tsx
// Multi-level hierarchy tree component for task relationships.
// Supports LCS → ND → (SKP | PRZEJAZD) and standalone ND → (SKP | PRZEJAZD).

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { WizardTaskRelationships } from '../types/wizard.types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TreeNode {
  key: string;
  taskWizardId: string;
  taskType: string;
  label: string;
  level: number; // 0 = root (LCS/standalone ND), 1 = child, 2 = grandchild
  children: TreeNode[];
  isDroppable: boolean;
  parentWizardId?: string; // for removal tracking
}

export interface HierarchyParentNode {
  key: string;
  taskType: string;
  taskWizardId: string;
  label: string;
  nazwa?: string;
}

export interface HierarchyTask {
  key: string;
  taskType: string;
  taskWizardId?: string;
  label: string;
}

interface HierarchyTreeViewProps {
  parentNodes: HierarchyParentNode[];
  allTasks: HierarchyTask[];
  relationships: WizardTaskRelationships;
  onRemoveChild: (parentWizardId: string, childKey: string) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TASK_ICONS: Record<string, string> = {
  LCS: '📍',
  NASTAWNIA: '🏢',
  SKP: '📦',
};

function getTaskIcon(taskType: string): string {
  if (taskType in TASK_ICONS) return TASK_ICONS[taskType];
  if (taskType.startsWith('PRZEJAZD')) return '🚂';
  return '📌';
}

// ─── Tree node component ──────────────────────────────────────────────────────

interface TreeNodeComponentProps {
  node: TreeNode;
  onRemoveChild: (parentWizardId: string, childKey: string) => void;
}

const TreeNodeComponent: React.FC<TreeNodeComponentProps> = ({ node, onRemoveChild }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `parent-${node.taskWizardId}`,
    disabled: !node.isDroppable,
  });

  return (
    <div className={`tree-node level-${node.level}`}>
      <div
        ref={node.isDroppable ? setNodeRef : undefined}
        className={`tree-node-content${isOver ? ' drop-over' : ''}`}
      >
        <div className="tree-node-header">
          <span className="tree-node-icon">{getTaskIcon(node.taskType)}</span>
          <span className="tree-node-label">{node.label}</span>
          {node.level > 0 && node.parentWizardId && (
            <button
              className="tree-node-remove"
              onClick={() => onRemoveChild(node.parentWizardId!, node.key)}
              title="Usuń powiązanie"
              aria-label={`Usuń powiązanie ${node.label}`}
            >
              ×
            </button>
          )}
        </div>

        {node.isDroppable && node.children.length === 0 && (
          <div className="tree-node-drop-zone">
            ↓ Upuść tutaj zadania podrzędne
          </div>
        )}
      </div>

      {node.children.length > 0 && (
        <div className="tree-node-children">
          {node.children.map((child) => (
            <TreeNodeComponent
              key={child.key}
              node={child}
              onRemoveChild={onRemoveChild}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Main HierarchyTreeView component ────────────────────────────────────────

export const HierarchyTreeView: React.FC<HierarchyTreeViewProps> = ({
  parentNodes,
  allTasks,
  relationships,
  onRemoveChild,
}) => {
  const buildTree = (): TreeNode[] => {
    const roots: TreeNode[] = [];
    const processedKeys = new Set<string>();

    // Build children for a given parent recursively
    const buildChildren = (parentWizardId: string, level: number): TreeNode[] => {
      const rel = relationships[parentWizardId];
      if (!rel || !rel.childTaskKeys) return [];

      return rel.childTaskKeys
        .map((childKey): TreeNode | null => {
          const childTask = allTasks.find((t) => t.key === childKey);
          if (!childTask) return null;

          processedKeys.add(childKey);

          const childWizardId = childTask.taskWizardId ?? childKey;
          // NASTAWNIA tasks can themselves be parents at level 1
          const isParent = childTask.taskType === 'NASTAWNIA' && level < 2;

          return {
            key: childTask.key,
            taskWizardId: childWizardId,
            taskType: childTask.taskType,
            label: childTask.label,
            level,
            children: isParent ? buildChildren(childWizardId, level + 1) : [],
            isDroppable: isParent,
            parentWizardId,
          };
        })
        .filter((node): node is TreeNode => node !== null);
    };

    // 1. LCS roots (level 0)
    parentNodes
      .filter((p) => p.taskType === 'LCS')
      .forEach((lcs) => {
        roots.push({
          key: lcs.key,
          taskWizardId: lcs.taskWizardId,
          taskType: lcs.taskType,
          label: lcs.label,
          level: 0,
          children: buildChildren(lcs.taskWizardId, 1),
          isDroppable: true,
        });
      });

    // 2. Standalone ND roots (ND not already placed as child of an LCS)
    parentNodes
      .filter((p) => p.taskType === 'NASTAWNIA')
      .forEach((nd) => {
        if (processedKeys.has(nd.key)) return; // already child of an LCS

        roots.push({
          key: nd.key,
          taskWizardId: nd.taskWizardId,
          taskType: nd.taskType,
          label: `${nd.label} (samodzielna)`,
          level: 0,
          children: buildChildren(nd.taskWizardId, 1),
          isDroppable: true,
        });
      });

    return roots;
  };

  const tree = buildTree();

  if (tree.length === 0) {
    return (
      <div className="hierarchy-empty">
        Brak węzłów nadrzędnych (LCS / Nastawnia). Dodaj zadania LCS lub Nastawnia, aby tu budować hierarchię.
      </div>
    );
  }

  return (
    <div className="hierarchy-tree">
      {tree.map((node) => (
        <TreeNodeComponent
          key={node.key}
          node={node}
          onRemoveChild={onRemoveChild}
        />
      ))}
    </div>
  );
};
