// src/utils/priority.ts
// Utility functions for task priority display

/**
 * Get display string for task priority with appropriate icons
 * @param priority Priority level (0-10)
 * @returns Formatted priority display string
 */
export const getPriorityDisplay = (priority: number | undefined): string => {
  switch (priority) {
    case 0:  return '⚪ Brak znaczenia';
    case 1:  return '💤 Znikomy';
    case 2:  return '⬇️ Bardzo niski';
    case 3:  return '🕓 Niski';
    case 4:  return '📎 Lekki';
    case 5:  return '⚖️ Normalny';
    case 6:  return '📌 Podwyższony';
    case 7:  return '⚠️ Wysoki';
    case 8:  return '🔥 Bardzo wysoki';
    case 9:  return '🚨 Krytyczny';
    case 10: return '💣 Natychmiastowy';
    default: return priority !== undefined ? `⚖️ ${priority}` : '⚖️ Normalny';
  }
};
