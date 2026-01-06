// src/constants/roles.ts
// Fallback roles used when API endpoint is unavailable

export const FALLBACK_ROLES = [
  { id: 1, name: 'admin', description: 'Administrator Systemu' },
  { id: 2, name: 'management_board', description: 'Zarząd' },
  { id: 3, name: 'manager', description: 'Menedżer' },
  { id: 4, name: 'coordinator', description: 'Koordynator' },
  { id: 5, name: 'bom_editor', description: 'Edytor BOM' },
  { id: 6, name: 'prefabricator', description: 'Prefabrykant' },
  { id: 7, name: 'worker', description: 'Pracownik' },
  { id: 8, name: 'order_picking', description: 'Pracownik przygotowania' },
  { id: 9, name: 'integrator', description: 'Integrator' },
  { id: 10, name: 'viewer', description: 'Podgląd' }
];
