// src/components/network/topology/CustomNode.tsx
// Reusable standalone topology node component for the Network Topology Builder

import React from 'react';
import type { TopologyNode } from '../../../types/network-topology.types';
import { NODE_ICONS, NODE_TYPE_LABELS } from '../../../types/network-topology.types';
import './CustomNode.css';

function formatKmDisplay(km: number): string {
  const thousandths = Math.round(km * 1000);
  const intPart = Math.floor(thousandths / 1000);
  const dec = Math.abs(thousandths % 1000);
  return `${intPart},${String(dec).padStart(3, '0')}`;
}

export interface CustomNodeProps {
  node: TopologyNode;
  isSelected?: boolean;
  isConnectingSource?: boolean;
  isConnectingTargetHint?: boolean;
  style?: React.CSSProperties;
  onMouseDown?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export const CustomNode: React.FC<CustomNodeProps> = ({
  node,
  isSelected = false,
  isConnectingSource = false,
  isConnectingTargetHint = false,
  style,
  onMouseDown,
  onClick,
}) => {
  const classNames = [
    'topology-node',
    `topology-node--${node.type.toLowerCase()}`,
    isSelected ? 'topology-node--selected' : '',
    isConnectingSource ? 'topology-node--source' : '',
    isConnectingTargetHint ? 'topology-node--target-hint' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classNames}
      style={style}
      onMouseDown={onMouseDown}
      onClick={onClick}
    >
      <div className="topology-node-icon" aria-hidden="true">
        {NODE_ICONS[node.type]}
      </div>
      <div className="topology-node-type">
        {node.data.nodeTypeLabel != null ? String(node.data.nodeTypeLabel) : NODE_TYPE_LABELS[node.type]}
      </div>
      <div className="topology-node-label">{node.label}</div>
      {node.data.km !== undefined && (
        <div className="topology-node-km">km {formatKmDisplay(Number(node.data.km))}</div>
      )}
    </div>
  );
};
