// src/utils/assetLabels.ts
// Shared label/badge helpers for asset type and status — used across AssetListPage,
// AssetDetailPage, ContractDetailPage, etc.

export const getAssetTypeLabel = (type: string): string => {
  const typeMap: Record<string, string> = {
    'PRZEJAZD': '🚦 Przejazd',
    'LCS': '💻 LCS',
    'CUID': '📡 CUID',
    'NASTAWNIA': '🏢 Nastawnia',
    'SKP': '🖥️ SKP'
  };
  return typeMap[type] || type;
};

export const getAssetStatusLabel = (status: string): string => {
  const statusMap: Record<string, string> = {
    'planned': '📅 Planowany',
    'installed': '🔧 Zainstalowany',
    'active': '✅ Aktywny',
    'in_service': '🛠️ W serwisie',
    'faulty': '⚠️ Awaria',
    'inactive': '⚪ Nieaktywny',
    'decommissioned': '🚫 Wycofany'
  };
  return statusMap[status] || status;
};

export const getAssetStatusBadgeClass = (status: string): string => {
  const statusMap: Record<string, string> = {
    'planned': 'status-planned',
    'installed': 'status-installed',
    'active': 'status-active',
    'in_service': 'status-in-service',
    'faulty': 'status-faulty',
    'inactive': 'status-inactive',
    'decommissioned': 'status-decommissioned'
  };
  return statusMap[status] || 'status-default';
};
