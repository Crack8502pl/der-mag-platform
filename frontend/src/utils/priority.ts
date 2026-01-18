// src/utils/priority.ts
// Utility functions for task priority display

/**
 * Get display string for task priority with appropriate icons
 * @param priority Priority level (0-5)
 * @returns Formatted priority display string
 */
export const getPriorityDisplay = (priority: number | undefined): string => {
  if (priority === undefined || priority === null) {
    return 'Normalny';
  }

  switch (priority) {
    case 0:
      return '🔶🔶 Bardzo niski';
    case 1:
      return '🔶 Niski';
    case 2:
      return 'Normalny';
    case 3:
      return '⭐️ Wysoki';
    case 4:
      return '⭐️⭐️ Bardzo Wysoki';
    case 5:
      return '🌟🌟🌟 Krytyczny';
    default:
      return `⭐ ${priority}`;
  }
};
