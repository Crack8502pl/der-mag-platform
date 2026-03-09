// src/utils/csvParser.ts
// Utility for parsing CSV files and extracting values from specific columns

/**
 * Parse a single column from CSV content and return an array of unique, non-empty values.
 *
 * @param csvContent - Raw text content of the CSV file
 * @param columnIndex - Zero-based index of the column to extract
 * @param separator - Column separator character (default: ';')
 * @param skipHeader - Whether to skip the first row (default: true)
 * @returns Array of unique, trimmed, non-empty values from the specified column
 */
export function parseCSVColumn(
  csvContent: string,
  columnIndex: number,
  separator: string = ';',
  skipHeader: boolean = true,
): string[] {
  const lines = csvContent.split(/\r?\n/);
  const startIndex = skipHeader ? 1 : 0;
  const values: string[] = [];

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const columns = splitCSVLine(line, separator);
    const raw = columns[columnIndex];
    if (raw === undefined) continue;

    const value = raw.trim().replace(/^"|"$/g, '');
    if (value.length > 0) {
      values.push(value);
    }
  }

  return [...new Set(values)]; // remove duplicates
}

/**
 * Split a single CSV line respecting quoted fields.
 */
function splitCSVLine(line: string, separator: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === separator && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * Parse the header row of a CSV file to get column names.
 *
 * @param csvContent - Raw text content of the CSV file
 * @param separator - Column separator character (default: ';')
 * @returns Array of column names (or "Kolumna N" if empty)
 */
export function parseCSVHeaders(csvContent: string, separator: string = ';'): string[] {
  const firstLine = csvContent.split(/\r?\n/)[0] ?? '';
  return splitCSVLine(firstLine, separator).map((h, i) => {
    const trimmed = h.trim().replace(/^"|"$/g, '');
    return trimmed.length > 0 ? trimmed : `Kolumna ${i + 1}`;
  });
}
