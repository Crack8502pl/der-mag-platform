import { api } from '../../../services/api';
import type { TopologyConnection, TopologyNode } from '../../../types/network-topology.types';
import { getConnectionEndpoints } from './edgeRouting';

const NODE_WIDTH = 140;
const NODE_HEIGHT = 60;
const EXPORT_PADDING = 40;
const DEFAULT_CANVAS_WIDTH = 900;
const DEFAULT_CANVAS_HEIGHT = 600;

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const wrapLabel = (label: string, maxLineLength = 22): string[] => {
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];

  const lines: string[] = [];
  let currentLine = '';

  words.forEach(word => {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (candidate.length <= maxLineLength || !currentLine) {
      currentLine = candidate;
      return;
    }

    lines.push(currentLine);
    currentLine = word;
  });

  if (currentLine) lines.push(currentLine);
  return lines.slice(0, 3);
};

const getNodePalette = (type: TopologyNode['type']) => {
  switch (type) {
    case 'task':
      return { fill: '#dbeafe', stroke: '#3b82f6' };
    case 'auxiliary':
      return { fill: '#e2e8f0', stroke: '#64748b' };
    case 'external':
      return { fill: '#dcfce7', stroke: '#16a34a' };
    default:
      return { fill: '#f8fafc', stroke: '#94a3b8' };
  }
};

const calculateExportLayout = (nodes: TopologyNode[], canvasElement?: HTMLDivElement | null) => {
  const minX = Math.min(...nodes.map(node => node.position.x), 0);
  const minY = Math.min(...nodes.map(node => node.position.y), 0);
  const maxX = Math.max(...nodes.map(node => node.position.x + NODE_WIDTH), 0);
  const maxY = Math.max(...nodes.map(node => node.position.y + NODE_HEIGHT), 0);

  const width = Math.max(
    Math.ceil(maxX - minX + EXPORT_PADDING * 2),
    canvasElement?.scrollWidth ?? canvasElement?.clientWidth ?? DEFAULT_CANVAS_WIDTH
  );
  const height = Math.max(
    Math.ceil(maxY - minY + EXPORT_PADDING * 2),
    canvasElement?.scrollHeight ?? canvasElement?.clientHeight ?? DEFAULT_CANVAS_HEIGHT
  );

  return {
    width,
    height,
    nodes: nodes.map(node => ({
      ...node,
      position: {
        x: node.position.x - minX + EXPORT_PADDING,
        y: node.position.y - minY + EXPORT_PADDING,
      },
    })),
  };
};

const buildTopologySvg = (nodes: TopologyNode[], connections: TopologyConnection[], width: number, height: number) => {
  const connectionMarkup = connections
    .map(connection => {
      const sourceNode = nodes.find(node => node.id === connection.source);
      const targetNode = nodes.find(node => node.id === connection.target);
      if (!sourceNode || !targetNode) return '';

      const { sourcePoint, targetPoint } = getConnectionEndpoints(sourceNode, targetNode);
      const connectionColor = (connection.technology ?? 'fiber') === 'lan' ? '#3b82f6' : '#f97316';
      const midpointX = (sourcePoint.x + targetPoint.x) / 2;
      const midpointY = (sourcePoint.y + targetPoint.y) / 2;

      return `
        <g>
          <line
            x1="${sourcePoint.x}"
            y1="${sourcePoint.y}"
            x2="${targetPoint.x}"
            y2="${targetPoint.y}"
            stroke="${connectionColor}"
            stroke-width="2.5"
            marker-end="url(#arrow-${connection.technology ?? 'fiber'})"
          />
          ${
            connection.label
              ? `<text
                  x="${midpointX}"
                  y="${midpointY - 6}"
                  text-anchor="middle"
                  font-family="Arial, sans-serif"
                  font-size="11"
                  fill="#334155"
                >${escapeXml(connection.label)}</text>`
              : ''
          }
        </g>
      `;
    })
    .join('');

  const nodeMarkup = nodes
    .map(node => {
      const palette = getNodePalette(node.type);
      const labelLines = wrapLabel(node.label);
      const labelStartY =
        node.position.y + 29 - (labelLines.length - 1) * 7;

      return `
        <g>
          <rect
            x="${node.position.x}"
            y="${node.position.y}"
            width="${NODE_WIDTH}"
            height="${NODE_HEIGHT}"
            rx="10"
            ry="10"
            fill="${palette.fill}"
            stroke="${palette.stroke}"
            stroke-width="1.5"
          />
          <text
            x="${node.position.x + NODE_WIDTH / 2}"
            y="${node.position.y + 16}"
            text-anchor="middle"
            font-family="Arial, sans-serif"
            font-size="10"
            font-weight="700"
            fill="#475569"
          >${escapeXml(node.type.toUpperCase())}</text>
          ${labelLines
            .map(
              (line, index) => `
                <text
                  x="${node.position.x + NODE_WIDTH / 2}"
                  y="${labelStartY + index * 14}"
                  text-anchor="middle"
                  font-family="Arial, sans-serif"
                  font-size="12"
                  font-weight="600"
                  fill="#0f172a"
                >${escapeXml(line)}</text>
              `
            )
            .join('')}
          ${
            node.data.km !== undefined
              ? `<text
                  x="${node.position.x + NODE_WIDTH / 2}"
                  y="${node.position.y + 54}"
                  text-anchor="middle"
                  font-family="Arial, sans-serif"
                  font-size="10"
                  fill="#64748b"
                >km ${escapeXml(String(node.data.km))}</text>`
              : ''
          }
        </g>
      `;
    })
    .join('');

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <marker id="arrow-fiber" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#f97316" />
        </marker>
        <marker id="arrow-lan" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#3b82f6" />
        </marker>
      </defs>
      <rect width="${width}" height="${height}" fill="#ffffff" />
      ${connectionMarkup}
      ${nodeMarkup}
    </svg>
  `;
};

const svgToPngDataUrl = (svgMarkup: string, width: number, height: number): Promise<string> =>
  new Promise((resolve, reject) => {
    const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width * 2;
      canvas.height = height * 2;

      const context = canvas.getContext('2d');
      if (!context) {
        URL.revokeObjectURL(url);
        reject(new Error('Nie udało się utworzyć kontekstu canvas'));
        return;
      }

      context.scale(2, 2);
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Nie udało się wyrenderować SVG do obrazu'));
    };

    image.src = url;
  });

const downloadBlob = (blob: Blob, fileName: string) => {
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(blobUrl);
};

interface ExportTopologyPdfOptions {
  nodes: TopologyNode[];
  connections: TopologyConnection[];
  endpoint: string;
  fileName: string;
  title: string;
  canvasElement?: HTMLDivElement | null;
}

export const exportTopologyPdf = async ({
  nodes,
  connections,
  endpoint,
  fileName,
  title,
  canvasElement,
}: ExportTopologyPdfOptions): Promise<void> => {
  if (nodes.length === 0) {
    throw new Error('Brak węzłów do eksportu PDF');
  }

  const exportLayout = calculateExportLayout(nodes, canvasElement);
  const svgMarkup = buildTopologySvg(exportLayout.nodes, connections, exportLayout.width, exportLayout.height);
  const imageDataUrl = await svgToPngDataUrl(svgMarkup, exportLayout.width, exportLayout.height);

  const response = await api.post(
    endpoint,
    {
      title,
      fileName,
      imageDataUrl,
    },
    { responseType: 'blob' }
  );

  downloadBlob(new Blob([response.data], { type: 'application/pdf' }), fileName);
};
